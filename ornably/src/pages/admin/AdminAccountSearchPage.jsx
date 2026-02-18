import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ornablyAPI from "../../lib/api";
import { Search, ArrowLeft, RefreshCw, UserRound } from "lucide-react";

function cx(...c) {
  return c.filter(Boolean).join(" ");
}

function getApiErrorMessage(err, fallback = "요청 중 오류가 발생했습니다.") {
  return (
    err?.response?.data?.message ||
    err?.response?.data?.error?.message ||
    err?.message ||
    fallback
  );
}

function sanitizeNonNegInt(value, fallback = 0) {
  const s = String(value ?? "").replace(/[^\d]/g, "");
  if (!s) return fallback;
  const n = Number(s);
  if (Number.isNaN(n)) return fallback;
  return Math.max(0, Math.trunc(n));
}

function clampInt(n, min, max) {
  const x = Number(n);
  if (Number.isNaN(x)) return min;
  return Math.max(min, Math.min(max, Math.trunc(x)));
}

const ROLE_OPTIONS = ["LOCAL", "KAKAO", "GOOGLE", "NAVER"];
const ROLE_LABEL = { LOCAL: "로컬", KAKAO: "카카오", GOOGLE: "구글", NAVER: "네이버" };

function PillCheckbox({ checked, onChange, label }) {
  return (
    <label
      className={cx(
        "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold cursor-pointer select-none",
        checked ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-800 border-gray-200 hover:bg-gray-50"
      )}
    >
      <input type="checkbox" checked={checked} onChange={onChange} className="hidden" />
      {label}
    </label>
  );
}

function FieldRow({ label, children }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-2 sm:gap-4 items-center">
      <div className="text-sm font-extrabold text-gray-700">{label}</div>
      <div>{children}</div>
    </div>
  );
}

function ResultRow({ a, onClick }) {
  const accountId = a?.accountId;
  const isWithdrawn = accountId == null || String(accountId).trim() === "";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "w-full text-left rounded-2xl border px-4 py-3",
        isWithdrawn
          ? "border-gray-200 bg-gray-50/70 hover:bg-gray-100"
          : "border-sky-200 bg-sky-50/70 hover:bg-sky-100"
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-extrabold text-gray-900 truncate">
            회원번호: PK {a.accountPk} · 회원 이름: {a.accountName}
            {isWithdrawn && (
              <span className="ml-2 inline-flex items-center rounded-full bg-gray-900 text-white px-2 py-0.5 text-[11px] font-extrabold">
                탈퇴된 회원
              </span>
            )}
          </div>

          <div className="mt-1 text-xs text-gray-600">
            {isWithdrawn ? (
              <>
                상태: <span className="font-semibold">탈퇴</span> · 회원ID:{" "}
                <span className="font-semibold">—</span>
              </>
            ) : (
              <>
                회원ID: <span className="font-semibold">{accountId}</span>
              </>
            )}
            {" · "}
            가입일: <span className="font-semibold">{a.accountDate ?? "—"}</span> · 회원 유형:{" "}
            <span className="font-semibold">{ROLE_LABEL[a.accountRole] ?? a.accountRole ?? "—"}</span> · 구매금액:{" "}
            <span className="font-semibold">{Number(a.accountTotalAmount ?? 0).toLocaleString("ko-KR")}원</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-gray-600 flex-shrink-0">
          <UserRound className="h-4 w-4" />
          <span className="text-xs font-bold">관리</span>
        </div>
      </div>
    </button>
  );
}

export default function AdminAccountSearchPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    accountPk: "",
    accountName: "",
    accountJoinStartDate: "",
    accountJoinEndDate: "",
    accountTotalAmountMin: "",
    accountTotalAmountMax: "",
  });

  // ✅ 체크박스: 여러 개 선택 가능
  const [roles, setRoles] = useState(() => new Set()); // LOCAL/KAKAO/GOOGLE/NAVER

  const [status, setStatus] = useState("idle"); // idle | loading | success | empty | error
  const [error, setError] = useState("");
  const [items, setItems] = useState([]);

  function toggleRole(r) {
    setRoles((prev) => {
      const next = new Set(prev);
      if (next.has(r)) next.delete(r);
      else next.add(r);
      return next;
    });
  }

  const selectedRoles = useMemo(() => Array.from(roles), [roles]);

  function buildQueryParams(roleSingleOrEmpty) {
    const params = new URLSearchParams();

    const pk = String(form.accountPk || "").trim();
    const name = String(form.accountName || "").trim();
    const s = form.accountJoinStartDate;
    const e = form.accountJoinEndDate;

    const min = form.accountTotalAmountMin;
    const max = form.accountTotalAmountMax;

    if (pk) params.set("accountPk", String(sanitizeNonNegInt(pk, 0)));
    if (name) params.set("accountName", name);
    if (s) params.set("accountJoinStartDate", s);
    if (e) params.set("accountJoinEndDate", e);

    if (min !== "") params.set("accountTotalAmountMin", String(sanitizeNonNegInt(min, 0)));
    if (max !== "") params.set("accountTotalAmountMax", String(sanitizeNonNegInt(max, 0)));

    // API는 accountRole 단일이므로 여기서 하나만 넣음
    if (roleSingleOrEmpty) params.set("accountRole", roleSingleOrEmpty);

    return params;
  }

  // ✅ 여러 role 체크 시: role별로 API 여러 번 호출 후 union
  async function search() {
    setError("");
    setStatus("loading");
    setItems([]);

    try {
      const rolesToQuery = selectedRoles.length ? selectedRoles : [""]; // 선택 없으면 role 조건 미적용

      const results = [];
      const seen = new Set(); // accountPk 기준 중복 제거

      for (const r of rolesToQuery) {
        const qs = buildQueryParams(r);
        const url = `/admin/account/search?${qs.toString()}`;

        const res = await ornablyAPI.get(url);
        const list = res?.data?.accountDatas ?? [];

        if (Array.isArray(list)) {
          for (const a of list) {
            const key = String(a.accountPk);
            if (!seen.has(key)) {
              seen.add(key);
              results.push(a);
            }
          }
        }
      }

      if (!results.length) {
        setStatus("empty");
        return;
      }

      // 정렬: PK 내림차순(최근 등록 느낌)
      results.sort((a, b) => Number(b.accountPk ?? 0) - Number(a.accountPk ?? 0));
      setItems(results);
      setStatus("success");
    } catch (err) {
      const sc = err?.response?.status;
      const code = err?.response?.data?.code;

      if (sc === 400 && code === "INVALID_DATE_RANGE") setError("가입 시작일과 종료일 범위가 올바르지 않습니다.");
      else if (sc === 400 && code === "INVALID_AMOUNT_RANGE") setError("구매 금액 범위가 올바르지 않습니다.");
      else if (sc === 401) setError("로그인이 필요합니다.");
      else if (sc === 403) setError("관리자만 접근할 수 있는 요청입니다.");
      else if (sc === 404) setError("검색 조건에 해당하는 회원 정보가 존재하지 않습니다.");
      else setError(getApiErrorMessage(err, "회원 검색 중 오류가 발생했습니다."));

      setStatus("error");
    }
  }

  function reset() {
    setForm({
      accountPk: "",
      accountName: "",
      accountJoinStartDate: "",
      accountJoinEndDate: "",
      accountTotalAmountMin: "",
      accountTotalAmountMax: "",
    });
    setRoles(new Set());
    setItems([]);
    setError("");
    setStatus("idle");
  }

  useEffect(() => {
    search();
  }, []);

  function goManage(accountPk) {
    // ✅ 프로젝트 라우트에 맞게 수정
    navigate(`/admin/account/${accountPk}`);
  }

  return (
    <div className="min-w-0">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-gray-50"
            >
              <ArrowLeft className="h-4 w-4" />
              뒤로
            </button>
            <h2 className="text-xl font-extrabold tracking-tight text-gray-900">사용자 검색</h2>
          </div>
          <p className="text-sm text-gray-500 mt-2">조건을 입력하고 회원을 검색합니다.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" />
            초기화
          </button>
        </div>
      </div>

      {/* Form Card */}
      <div className="mt-5 rounded-[28px] bg-white/60 border border-white/50 backdrop-blur-md shadow-[0_6px_30px_rgba(17,24,39,0.06)] p-5 sm:p-6">
        <div className="text-sm font-extrabold text-gray-900">회원 검색 폼</div>

        <div className="mt-4 space-y-4">
          <FieldRow label="회원PK">
            <input
              value={form.accountPk}
              onChange={(e) => setForm((p) => ({ ...p, accountPk: e.target.value.replace(/[^\d]/g, "") }))}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring"
              placeholder="회원PK 입력"
              inputMode="numeric"
            />
          </FieldRow>

          <FieldRow label="이름">
            <input
              value={form.accountName}
              onChange={(e) => setForm((p) => ({ ...p, accountName: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring"
              placeholder="이름 입력"
            />
          </FieldRow>

          <FieldRow label="가입일">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="date"
                value={form.accountJoinStartDate}
                onChange={(e) => setForm((p) => ({ ...p, accountJoinStartDate: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring"
                placeholder="언제부터"
              />
              <input
                type="date"
                value={form.accountJoinEndDate}
                onChange={(e) => setForm((p) => ({ ...p, accountJoinEndDate: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring"
                placeholder="언제까지"
              />
            </div>
          </FieldRow>

          <FieldRow label="회원유형">
            <div className="flex flex-wrap gap-2">
              {ROLE_OPTIONS.map((r) => (
                <PillCheckbox
                  key={r}
                  checked={roles.has(r)}
                  onChange={() => toggleRole(r)}
                  label={ROLE_LABEL[r] ?? r}
                />
              ))}
            </div>
          </FieldRow>

          <FieldRow label="구매금액">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="number"
                min={0}
                step={1}
                value={form.accountTotalAmountMin}
                onChange={(e) =>
                  setForm((p) => ({ ...p, accountTotalAmountMin: String(clampInt(sanitizeNonNegInt(e.target.value, 0), 0, 2_000_000_000)) }))
                }
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring"
                placeholder="얼마부터"
                inputMode="numeric"
              />
              <input
                type="number"
                min={0}
                step={1}
                value={form.accountTotalAmountMax}
                onChange={(e) =>
                  setForm((p) => ({ ...p, accountTotalAmountMax: String(clampInt(sanitizeNonNegInt(e.target.value, 0), 0, 2_000_000_000)) }))
                }
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring"
                placeholder="얼마까지"
                inputMode="numeric"
              />
            </div>
          </FieldRow>

          <div className="pt-2 flex items-center justify-end">
            <button
              type="button"
              onClick={search}
              className="rounded-2xl bg-purple-600 text-white px-8 py-4 text-lg font-extrabold hover:bg-purple-700 inline-flex items-center gap-2"
            >
              <Search className="h-5 w-5" />
              검색
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Result */}
      <div className="mt-5 rounded-[28px] bg-white/60 border border-white/50 backdrop-blur-md shadow-[0_6px_30px_rgba(17,24,39,0.06)] p-5 sm:p-6">
        <div className="text-sm font-extrabold text-gray-900">결과</div>

        <div className="mt-4 space-y-3">
          {status === "idle" && (
            <div className="rounded-2xl bg-white border border-gray-200 p-6 text-sm text-gray-600">
              검색 조건을 입력한 뒤 “검색”을 눌러주세요.
            </div>
          )}

          {status === "loading" && (
            <div className="rounded-2xl bg-white border border-gray-200 p-6 text-sm text-gray-600">
              검색 중...
            </div>
          )}

          {status === "empty" && (
            <div className="rounded-2xl bg-white border border-gray-200 p-6 text-sm text-gray-600">
              검색 조건에 해당하는 회원 정보가 없습니다.
            </div>
          )}

          {status === "error" && !items.length && (
            <div className="rounded-2xl bg-white border border-gray-200 p-6 text-sm text-gray-600">
              검색 결과를 불러오지 못했습니다.
            </div>
          )}

          {items.map((a) => (
            <ResultRow key={a.accountPk} a={a} onClick={() => goManage(a.accountPk)} />
          ))}
        </div>
      </div>
    </div>
  );
}
