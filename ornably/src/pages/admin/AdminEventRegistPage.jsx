import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ornablyAPI from "../../lib/api";
import { Upload, X, ArrowLeft, Plus } from "lucide-react";

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

const CATEGORY_OPTIONS = ["TREE", "LIGHT", "BALL", "FIGURE", "WREATHS", "ETC"];

const CATEGORY_LABEL = {
  TREE: "트리",
  LIGHT: "전구",
  BALL: "볼",
  FIGURE: "피규어",
  WREATHS: "리스",
  ETC: "기타",
};

const TARGET_TYPES = [
  { value: "AMOUNT", label: "N원 이상 구매 사용자" },
  { value: "JOINED", label: "특정 기간에 회원가입한 사용자" },
  { value: "ALL", label: "모든 사용자" },
  { value: "MEMBER_TYPE", label: "특정 회원 유형 선택" },
];

const MEMBER_TYPE_OPTIONS = ["LOCAL", "GOOGLE", "KAKAO", "NAVER"];

function Field({ label, hint, children }) {
  return (
    <div>
      <div className="text-xs font-bold text-gray-600">{label}</div>
      {hint ? <div className="text-xs text-red-600 mt-1">{hint}</div> : null}
      <div className="mt-2">{children}</div>
    </div>
  );
}

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

function clampInt(n, min, max) {
  const x = Number(n);
  if (Number.isNaN(x)) return min;
  return Math.max(min, Math.min(max, Math.trunc(x)));
}

function sanitizeNonNegInt(value, fallback = 0) {
  const s = String(value ?? "").replace(/[^\d]/g, "");
  if (!s) return fallback;
  const n = Number(s);
  if (Number.isNaN(n)) return fallback;
  return Math.max(0, Math.trunc(n));
}

function buildTargetAccount(type, detail) {
  if (type === "ALL") return { type: "ALL" };

  if (type === "AMOUNT") {
    return { type: "AMOUNT", amount: sanitizeNonNegInt(detail.amount, 0) };
  }

  if (type === "JOINED") {
    return { type: "JOINED", startDate: detail.startDate || "", endDate: detail.endDate || "" };
  }

  if (type === "MEMBER_TYPE") {
    return { type: "MEMBER_TYPE", memberType: detail.memberTypes || [] }; // ✅ 배열로 보냄(요청사항)
  }

  return { type: "ALL" };
}

export default function AdminEventCreatePage() {
  const navigate = useNavigate();

  const [successOpen, setSuccessOpen] = useState(false);
  const [createdEventPk, setCreatedEventPk] = useState(null);

  const [form, setForm] = useState({
    eventName: "",
    eventStartDate: "",
    eventEndDate: "",
    eventDiscountRate: "",   // ✅ 입력용 문자열
    eventDescription: "",
  });

  const [bannerFile, setBannerFile] = useState(null);
  const [bannerPreview, setBannerPreview] = useState("");

  const [categories, setCategories] = useState(() => new Set());

  const [targetType, setTargetType] = useState("ALL");
  const [targetDetail, setTargetDetail] = useState({
    amount: 0,
    startDate: "",
    endDate: "",
    memberTypes: ["LOCAL"], // ✅ 기본 1개 선택
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const selectedCategories = useMemo(() => Array.from(categories), [categories]);

  function onPickBanner(e) {
    const file = e.target.files?.[0] || null;
    setBannerFile(file);
    setError("");
    setFieldErrors({});

    if (!file) {
      setBannerPreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setBannerPreview(url);
  }

  function removeBanner() {
    setBannerFile(null);
    setBannerPreview("");
  }

  function toggleCategory(cat) {
    setCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  function toggleMemberType(mt) {
    setTargetDetail((prev) => {
      const set = new Set(prev.memberTypes || []);
      if (set.has(mt)) set.delete(mt);
      else set.add(mt);
      return { ...prev, memberTypes: Array.from(set) };
    });
  }

  function validateClient() {
    const fe = {};

    const name = String(form.eventName || "").trim();
    if (!name) fe.eventName = "이벤트 명을 입력해주세요.";

    if (!form.eventStartDate) fe.eventStartDate = "시작일을 선택해주세요.";
    if (!form.eventEndDate) fe.eventEndDate = "종료일을 선택해주세요.";
    if (form.eventStartDate && form.eventEndDate && form.eventStartDate > form.eventEndDate) {
      fe.eventEndDate = "종료일은 시작일 이후여야 합니다.";
    }

    const sRate = String(form.eventDiscountRate ?? "").trim();
    if (!sRate) {
      fe.eventDiscountRate = "할인율은 0~100 입니다.";
    } else {
      const n = Number(sRate);
      if (Number.isNaN(n) || n < 0 || n > 100) {
        fe.eventDiscountRate = "할인율은 0~100 입니다.";
      }
    }

    if (selectedCategories.length < 1) fe.eventTargetCategory = "카테고리는 최소 1개 이상 선택해야 합니다.";

    if (targetType === "AMOUNT") {
      const amt = sanitizeNonNegInt(targetDetail.amount, 0);
      if (amt <= 0) fe.targetAmount = "N원(구매 기준)을 1 이상으로 입력해주세요.";
    }

    if (targetType === "JOINED") {
      if (!targetDetail.startDate) fe.targetJoinStartDate = "가입 시작일을 선택해주세요.";
      if (!targetDetail.endDate) fe.targetJoinEndDate = "가입 종료일을 선택해주세요.";
      if (targetDetail.startDate && targetDetail.endDate && targetDetail.startDate > targetDetail.endDate) {
        fe.targetJoinEndDate = "가입 종료일은 시작일 이후여야 합니다.";
      }
    }

    if (targetType === "MEMBER_TYPE") {
      const arr = targetDetail.memberTypes || [];
      if (!Array.isArray(arr) || arr.length < 1) fe.targetMemberTypes = "회원 유형은 최소 1개 이상 선택해야 합니다.";
      if (arr.length > 4) fe.targetMemberTypes = "회원 유형은 최대 4개까지 선택 가능합니다.";
    }

    setFieldErrors(fe);
    return Object.keys(fe).length === 0;
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    setFieldErrors({});

    if (!validateClient()) return;

    const eventTargetAccount = buildTargetAccount(targetType, targetDetail);

    try {
      setSubmitting(true);

      const fd = new FormData();
      fd.append("eventName", String(form.eventName).trim());
      fd.append("eventStartDate", form.eventStartDate);
      fd.append("eventEndDate", form.eventEndDate);
      fd.append("eventDiscountRate", String(clampInt(Number(form.eventDiscountRate || 0), 0, 100)));
      fd.append("eventDescription", String(form.eventDescription || "").trim());

      // ✅ JSON은 문자열로
      fd.append("eventTargetAccount", JSON.stringify(eventTargetAccount));

      // ✅ 서버 구현체에 따라 두 방식 중 하나 선택 가능.
      // 현재는 JSON 문자열로 보내는 방식(안전)
      fd.append("eventTargetCategory", JSON.stringify(selectedCategories));

      if (bannerFile) fd.append("eventImage", bannerFile);

      console.log("sadf12");
      const res = await ornablyAPI.post("/admin/event", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      console.log("sadf34");
      const eventPk =
        res?.data?.eventPk ??
        res?.data?.data?.eventPk ??
        res?.data?.event?.eventPk ??
        null;

      setCreatedEventPk(eventPk);
      setSuccessOpen(true);
    } catch (err) {
      const sc = err?.response?.status;
      const data = err?.response?.data;

      if (sc === 400) {
        setError(data?.message || "입력값을 확인해주세요.");
        if (data?.fieldErrors && typeof data.fieldErrors === "object") {
          setFieldErrors(data.fieldErrors);
        }
      } else if (sc === 401) {
        setError("로그인이 필요합니다. (관리자 인증 필요)");
      } else if (sc === 403) {
        setError("권한이 없습니다.");
      } else if (sc === 409) {
        setError(data?.message || "이미 존재하거나 정책에 위배됩니다.");
      } else {
        setError(getApiErrorMessage(err, "잠시 후 다시 시도해주세요."));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-w-0">
      {successOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setSuccessOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
              <div className="text-sm font-extrabold text-gray-900">등록 완료</div>
              <button
                type="button"
                onClick={() => setSuccessOpen(false)}
                className="rounded-lg px-3 py-1 text-sm font-semibold bg-gray-100 hover:bg-gray-200"
              >
                닫기
              </button>
            </div>

            <div className="px-5 py-5">
              <div className="text-sm text-gray-800 font-semibold">
                이벤트가 등록되었습니다.
              </div>

              {createdEventPk && (
                <div className="mt-2 text-xs text-gray-500">
                  eventPk:{" "}
                  <span className="font-semibold text-gray-800">{createdEventPk}</span>
                </div>
              )}

              <div className="mt-5 flex flex-col sm:flex-row gap-2 sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setSuccessOpen(false);
                    navigate("/admin/event");
                  }}
                  className="inline-flex justify-center rounded-xl bg-gray-900 text-white px-4 py-2 text-sm font-extrabold hover:bg-gray-800"
                >
                  목록으로 이동
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* 상단 헤더 */}
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
            <h2 className="text-xl font-extrabold tracking-tight text-gray-900">이벤트 등록</h2>
          </div>
          <p className="text-sm text-gray-500 mt-2">배너를 상단에서 크게 확인하고, 상세 조건을 설정합니다.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate("/admin/event")}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-50"
          >
            이벤트 목록
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ✅ 배너 큰 미리보기 (최상단) */}
      <div className="mt-5 rounded-[28px] bg-white/60 border border-white/50 backdrop-blur-md shadow-[0_6px_30px_rgba(17,24,39,0.06)] overflow-hidden">
        <div className="px-5 sm:px-6 py-4 border-b border-gray-200/60 flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-extrabold text-gray-900">이벤트 배너</div>
            <div className="text-xs text-gray-500 mt-1">배너 이미지는 상단에서 크게 확인됩니다.</div>
          </div>

          <div className="flex items-center gap-2">
            <label className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-50 cursor-pointer">
              <Upload className="h-4 w-4" />
              배너 선택
              <input type="file" accept="image/*" className="hidden" onChange={onPickBanner} />
            </label>

            {bannerFile && (
              <button
                type="button"
                onClick={removeBanner}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-gray-50"
              >
                <X className="h-4 w-4" />
                제거
              </button>
            )}
          </div>
        </div>

        <div className="p-4 sm:p-6">
          <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
            {bannerPreview ? (
              <img src={bannerPreview} alt="banner preview" className="w-full h-[240px] sm:h-[320px] object-cover" />
            ) : (
              <div className="w-full h-[240px] sm:h-[320px] flex items-center justify-center text-gray-400 text-sm">
                배너 이미지 미리보기 영역
              </div>
            )}
          </div>

          {bannerFile ? (
            <div className="mt-3 text-sm text-gray-700 truncate">선택됨: {bannerFile.name}</div>
          ) : (
            <div className="mt-3 text-sm text-gray-500">선택된 파일 없음</div>
          )}
        </div>
      </div>

      <form onSubmit={submit} className="mt-5 space-y-5">
        {/* 기본 정보 */}
        <div className="rounded-[28px] bg-white/60 border border-white/50 backdrop-blur-md shadow-[0_6px_30px_rgba(17,24,39,0.06)] p-5 sm:p-6">
          <div className="text-sm font-extrabold text-gray-900">기본 정보</div>

          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Field label="이벤트 명" hint={fieldErrors.eventName}>
              <input
                name="eventName"
                value={form.eventName}
                onChange={(e) => setForm((p) => ({ ...p, eventName: e.target.value }))}
                className={cx(
                  "w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:ring",
                  fieldErrors.eventName ? "border-red-300" : "border-gray-200"
                )}
                placeholder="예) 봄맞이 할인 이벤트"
              />
            </Field>

            <Field label="할인율 (0~100)" hint={fieldErrors.eventDiscountRate}>
              <input
                type="text"
                name="eventDiscountRate"
                value={form.eventDiscountRate}
                inputMode="numeric"
                placeholder="예) 12"
                onChange={(e) => {
                  // ✅ 입력 중에는 숫자만 남기고(빈칸 허용) 상태 업데이트
                  const onlyDigits = String(e.target.value ?? "").replace(/[^\d]/g, "");
                  setForm((p) => ({ ...p, eventDiscountRate: onlyDigits }));
                  // 입력 중엔 에러 지우는게 UX 좋아서
                  setFieldErrors((fe) => ({ ...fe, eventDiscountRate: undefined }));
                }}
                onBlur={() => {
                  // ✅ blur에서만 최종 검증/보정
                  const s = String(form.eventDiscountRate ?? "").trim();
                  if (s === "") {
                    // 빈칸이면 에러 처리(원하면 빈칸=0으로 자동 처리도 가능)
                    setFieldErrors((fe) => ({ ...fe, eventDiscountRate: "할인율은 0~100 입니다." }));
                    return;
                  }

                  const n = Number(s);
                  if (Number.isNaN(n)) {
                    setFieldErrors((fe) => ({ ...fe, eventDiscountRate: "할인율은 0~100 입니다." }));
                    return;
                  }

                  const fixed = clampInt(n, 0, 100);
                  setForm((p) => ({ ...p, eventDiscountRate: String(fixed) }));
                  setFieldErrors((fe) => ({ ...fe, eventDiscountRate: undefined }));
                }}
                className={cx(
                  "w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:ring",
                  fieldErrors.eventDiscountRate ? "border-red-300" : "border-gray-200"
                )}
              />
            </Field>


            <Field label="이벤트 시작일" hint={fieldErrors.eventStartDate}>
              <input
                type="date"
                name="eventStartDate"
                value={form.eventStartDate}
                onChange={(e) => setForm((p) => ({ ...p, eventStartDate: e.target.value }))}
                className={cx(
                  "w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:ring",
                  fieldErrors.eventStartDate ? "border-red-300" : "border-gray-200"
                )}
              />
            </Field>

            <Field label="이벤트 종료일" hint={fieldErrors.eventEndDate}>
              <input
                type="date"
                name="eventEndDate"
                value={form.eventEndDate}
                onChange={(e) => setForm((p) => ({ ...p, eventEndDate: e.target.value }))}
                className={cx(
                  "w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:ring",
                  fieldErrors.eventEndDate ? "border-red-300" : "border-gray-200"
                )}
              />
            </Field>
          </div>
        </div>

        {/* 대상자 조건 */}
        <div className="rounded-[28px] bg-white/60 border border-white/50 backdrop-blur-md shadow-[0_6px_30px_rgba(17,24,39,0.06)] p-5 sm:p-6">
          <div className="text-sm font-extrabold text-gray-900">이벤트 대상(회원) 설정</div>

          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Field label="대상 유형 선택" hint={fieldErrors.eventTargetAccount}>
              <select
                value={targetType}
                onChange={(e) => setTargetType(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring"
              >
                {TARGET_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </Field>

            <div className="rounded-2xl bg-white/50 border border-white/50 p-4">
              <div className="text-xs font-bold text-gray-600 mb-3">상세 설정</div>

              {targetType === "ALL" && (
                <div className="text-sm text-gray-700">모든 사용자 대상 (추가 입력 없음)</div>
              )}

              {targetType === "AMOUNT" && (
                <div className="space-y-2">
                  <div className="text-sm font-semibold text-gray-800">N원 이상 구매 사용자</div>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={targetDetail.amount}
                    onChange={(e) =>
                      setTargetDetail((p) => ({
                        ...p,
                        amount: sanitizeNonNegInt(e.target.value, 0),
                      }))
                    }
                    className={cx(
                      "w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:ring",
                      fieldErrors.targetAmount ? "border-red-300" : "border-gray-200"
                    )}
                    inputMode="numeric"
                    placeholder="예) 50000"
                  />
                  {fieldErrors.targetAmount && <div className="text-xs text-red-600">{fieldErrors.targetAmount}</div>}
                </div>
              )}

              {targetType === "JOINED" && (
                <div className="space-y-2">
                  <div className="text-sm font-semibold text-gray-800">특정 기간 가입 사용자</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <div className="text-xs font-bold text-gray-600 mb-1">시작</div>
                      <input
                        type="date"
                        value={targetDetail.startDate}
                        onChange={(e) => setTargetDetail((p) => ({ ...p, startDate: e.target.value }))}
                        className={cx(
                          "w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:ring",
                          fieldErrors.targetJoinStartDate ? "border-red-300" : "border-gray-200"
                        )}
                      />
                      {fieldErrors.targetJoinStartDate && (
                        <div className="text-xs text-red-600 mt-1">{fieldErrors.targetJoinStartDate}</div>
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-gray-600 mb-1">종료</div>
                      <input
                        type="date"
                        value={targetDetail.endDate}
                        onChange={(e) => setTargetDetail((p) => ({ ...p, endDate: e.target.value }))}
                        className={cx(
                          "w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:ring",
                          fieldErrors.targetJoinEndDate ? "border-red-300" : "border-gray-200"
                        )}
                      />
                      {fieldErrors.targetJoinEndDate && (
                        <div className="text-xs text-red-600 mt-1">{fieldErrors.targetJoinEndDate}</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {targetType === "MEMBER_TYPE" && (
                <div className="space-y-3">
                  <div className="text-sm font-semibold text-gray-800">특정 회원 유형 선택</div>

                  {fieldErrors.targetMemberTypes && (
                    <div className="text-xs text-red-600">{fieldErrors.targetMemberTypes}</div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {MEMBER_TYPE_OPTIONS.map((m) => (
                      <PillCheckbox
                        key={m}
                        label={m}
                        checked={(targetDetail.memberTypes || []).includes(m)}
                        onChange={() => toggleMemberType(m)}
                      />
                    ))}
                  </div>

                  <div className="text-xs text-gray-500">
                    선택됨:{" "}
                    <span className="font-semibold text-gray-700">
                      {(targetDetail.memberTypes || []).length ? (targetDetail.memberTypes || []).join(", ") : "없음"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 카테고리 */}
        <div className="rounded-[28px] bg-white/60 border border-white/50 backdrop-blur-md shadow-[0_6px_30px_rgba(17,24,39,0.06)] p-5 sm:p-6">
          <div className="text-sm font-extrabold text-gray-900">적용 상품 카테고리</div>
          <div className="text-xs text-gray-500 mt-1">최소 1개 이상 선택해야 합니다.</div>

          {fieldErrors.eventTargetCategory && (
            <div className="mt-3 text-sm text-red-700 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              {fieldErrors.eventTargetCategory}
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            {CATEGORY_OPTIONS.map((c) => (
              <PillCheckbox key={c} label={CATEGORY_LABEL[c] ?? c} checked={categories.has(c)} onChange={() => toggleCategory(c)} />
            ))}
          </div>

          <div className="mt-4 text-sm text-gray-700">
            선택됨:{" "}
            <span className="font-semibold">
              {selectedCategories.length
                ? selectedCategories.map((c) => CATEGORY_LABEL[c] ?? c).join(", ")
                : "없음"}
            </span>
          </div>
        </div>

        {/* ✅ 이벤트 설명 + (원래 이미지 영역 병합 완료: 이미지 섹션은 위로 올라감, 여기에는 설명만 “큰 영역”으로) */}
        <div className="rounded-[28px] bg-white/60 border border-white/50 backdrop-blur-md shadow-[0_6px_30px_rgba(17,24,39,0.06)] p-5 sm:p-6">
          <div className="text-sm font-extrabold text-gray-900">이벤트 설명</div>
          <div className="text-xs text-gray-500 mt-1">배너 아래에 노출될 설명 텍스트</div>

          <div className="mt-4">
            <textarea
              name="eventDescription"
              value={form.eventDescription}
              onChange={(e) => setForm((p) => ({ ...p, eventDescription: e.target.value }))}
              className={cx(
                "w-full rounded-2xl border bg-white px-4 py-3 text-sm outline-none focus:ring min-h-[220px]",
                fieldErrors.eventDescription ? "border-red-300" : "border-gray-200"
              )}
              placeholder="이벤트 상세 설명을 입력해주세요."
            />
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => navigate("/admin/event")}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-50"
          >
            취소
          </button>

          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-gray-900 text-white px-5 py-2 text-sm font-semibold hover:bg-gray-800 disabled:opacity-50 inline-flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            {submitting ? "등록 중..." : "이벤트 등록"}
          </button>
        </div>
      </form>
    </div>
  );
}
