import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ornablyAPI from "../../lib/api";
import { Calendar, Ban, Info, RefreshCw, Plus } from "lucide-react";

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

function todayYYYYMMDD() {
  const t = new Date();
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, "0");
  const d = String(t.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function classifyEvent(e) {
  const t = todayYYYYMMDD();
  const s = String(e?.eventStartDate ?? "");
  const end = String(e?.eventEndDate ?? "");

  // 방어: 날짜가 없으면 "시작 전"으로 넣어둠
  if (!s || !end) return "UPCOMING";

  if (end < t) return "ENDED";
  if (s > t) return "UPCOMING";
  return "ONGOING";
}

function formatTargetAccount(target) {
  if (!target) return "—";
  target = JSON.parse(target);
  const type = target.type;

  if (type === "ALL") return "전체 회원";
  if (type === "AMOUNT") return `누적금액 ≥ ${Number(target.amount ?? 0).toLocaleString("ko-KR")}원`;
  if (type === "JOINED") return `가입기간: ${target.startDate ?? "?"} ~ ${target.endDate ?? "?"}`;
  if (type === "MEMBER_TYPE") return `회원유형: ${target.memberType ?? "?"}`;

  return `알 수 없는 조건 (${String(type)})`;
}

function formatTargetCategory(arr) {
  arr = JSON.parse(arr);
  if (!arr || arr.length === 0) return "—";
  return arr.join(", ");
}

function Badge({ children, tone = "gray" }) {
  const toneClass =
    tone === "green"
      ? "bg-green-50 text-green-700 border-green-200"
      : tone === "red"
      ? "bg-red-50 text-red-700 border-red-200"
      : tone === "amber"
      ? "bg-amber-50 text-amber-800 border-amber-200"
      : "bg-gray-50 text-gray-700 border-gray-200";

  return (
    <span className={cx("inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border", toneClass)}>
      {children}
    </span>
  );
}

function Modal({ open, title, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-2xl rounded-[24px] bg-white shadow-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="font-extrabold text-gray-900">{title}</div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold hover:bg-gray-50"
          >
            닫기
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function Section({ title, subtitle, children, right }) {
  return (
    <div className="rounded-[24px] bg-white/60 border border-white/50 backdrop-blur-md shadow-[0_6px_30px_rgba(17,24,39,0.06)] overflow-hidden">
      <div className="px-5 sm:px-6 py-4 border-b border-gray-200/60 flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-extrabold text-gray-900">{title}</div>
          {subtitle && <div className="mt-1 text-xs text-gray-500">{subtitle}</div>}
        </div>
        {right}
      </div>
      <div>{children}</div>
    </div>
  );
}

function EventRow({ e, status, onDetail, onEndNow, endingPk }) {
  const ended = status === "ENDED";
  const ongoing = status === "ONGOING";

  return (
    <div className="p-4 sm:p-5 flex items-start gap-4">
      <div className="h-12 w-12 rounded-2xl bg-white border border-gray-200 shadow-sm flex items-center justify-center flex-shrink-0">
        <Calendar className="h-5 w-5 text-gray-800" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-gray-500">#{e.eventPk}</span>
          <div className="font-extrabold text-gray-900 truncate">{e.eventName}</div>
          {ongoing && <Badge tone="green">진행중</Badge>}
          {status === "UPCOMING" && <Badge tone="amber">시작 전</Badge>}
          {ended && <Badge tone="gray">종료</Badge>}
          {Number(e.eventDiscountRate ?? 0) > 0 && <Badge tone="amber">할인 {e.eventDiscountRate}%</Badge>}
        </div>

        <div className="mt-1 text-sm text-gray-600 flex flex-wrap gap-x-4 gap-y-1">
          <span>
            기간: <span className="font-semibold">{e.eventStartDate ?? "—"} ~ {e.eventEndDate ?? "—"}</span>
          </span>
          <span>
            타겟(회원): <span className="font-semibold">{formatTargetAccount(e.eventTargetAccount)}</span>
          </span>
          <span>
            타겟(카테고리): <span className="font-semibold">{formatTargetCategory(e.eventTargetCategory)}</span>
          </span>
        </div>

        {e.eventDescription ? (
          <div className="mt-2 text-sm text-gray-700 line-clamp-2">{e.eventDescription}</div>
        ) : null}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          type="button"
          onClick={() => onDetail(e)}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-gray-50"
          title="상세"
        >
          <Info className="h-4 w-4" />
          <span className="hidden sm:inline">상세</span>
        </button>

        {/* ✅ 진행중만 즉시 종료 */}
        {ongoing && (
          <button
            type="button"
            disabled={endingPk === e.eventPk}
            onClick={() => onEndNow(e.eventPk)}
            className={cx(
              "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold",
              "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
              endingPk === e.eventPk && "opacity-50"
            )}
            title="즉시 종료"
          >
            <Ban className="h-4 w-4" />
            <span className="hidden sm:inline">{endingPk === e.eventPk ? "종료 중..." : "즉시 종료"}</span>
          </button>
        )}

        {/* 시작 전/종료는 종료 버튼 없음 */}
        {!ongoing && (
          <div className="hidden sm:block w-[92px]" /> // 버튼 자리 정렬용(모바일은 숨김)
        )}
      </div>
    </div>
  );
}

export default function AdminEventManagePage() {
  const navigate = useNavigate();

  const [events, setEvents] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | success | empty | error
  const [error, setError] = useState("");

  const [selected, setSelected] = useState(null);
  const [endingPk, setEndingPk] = useState(null);

  async function fetchAll() {
    setError("");
    setStatus("loading");
    try {
      const res = await ornablyAPI.get("/admin/event/all");
      const data = res?.data;
      const list = Array.isArray(data) ? data : data?.eventDatas ?? data?.events ?? [];
      if (!Array.isArray(list) || list.length === 0) {
        setEvents([]);
        setStatus("empty");
        return;
      }
      // 시작일 최신 우선
      const sorted = [...list].sort((a, b) => String(b.eventStartDate ?? "").localeCompare(String(a.eventStartDate ?? "")));
      setEvents(sorted);
      setStatus("success");
    } catch (err) {
      const sc = err?.response?.status;
      if (sc === 401) setError("로그인이 필요합니다. (관리자 인증 필요)");
      else if (sc === 403) setError("권한이 없습니다.");
      else if (sc === 400) setError(getApiErrorMessage(err, "요청값을 확인해주세요."));
      else setError(getApiErrorMessage(err, "잠시 후 다시 시도해주세요."));
      setEvents([]);
      setStatus("error");
    }
  }

  useEffect(() => {
    fetchAll();
  }, []);

  const grouped = useMemo(() => {
    const ongoing = [];
    const upcoming = [];
    const ended = [];

    for (const e of events) {
      const c = classifyEvent(e);
      if (c === "ONGOING") ongoing.push(e);
      else if (c === "ENDED") ended.push(e);
      else upcoming.push(e);
    }

    // 보기 좋게: 진행중은 종료일 빠른 것부터, 시작 전은 시작일 빠른 것부터, 종료는 종료일 최근 것부터
    ongoing.sort((a, b) => String(a.eventEndDate ?? "").localeCompare(String(b.eventEndDate ?? "")));
    upcoming.sort((a, b) => String(a.eventStartDate ?? "").localeCompare(String(b.eventStartDate ?? "")));
    ended.sort((a, b) => String(b.eventEndDate ?? "").localeCompare(String(a.eventEndDate ?? "")));

    return { ongoing, upcoming, ended };
  }, [events]);

  async function endNow(eventPk) {
    const ok = window.confirm(`이벤트를 즉시 종료할까요?\n\neventPk: ${eventPk}`);
    if (!ok) return;

    try {
      setEndingPk(eventPk);
      setError("");

      const res = await ornablyAPI.patch(`/admin/event/${eventPk}/end`);
      const endedPk = res?.data?.eventPk ?? eventPk;
      const endedDate = res?.data?.eventEndDate;
      location.reload();
      /*setEvents((prev) =>
        prev.map((e) =>
          Number(e.eventPk) === Number(endedPk)
            ? { ...e, eventEndDate: endedDate ?? e.eventEndDate }
            : e
        )
      );*/

      setSelected((prev) => {
        if (!prev) return prev;
        if (Number(prev.eventPk) !== Number(endedPk)) return prev;
        return { ...prev, eventEndDate: endedDate ?? prev.eventEndDate };
      });
    } catch (err) {
      const sc = err?.response?.status;
      if (sc === 400) setError(getApiErrorMessage(err, "요청값을 확인해주세요."));
      else if (sc === 401) setError("로그인이 필요합니다. (관리자 인증 필요)");
      else if (sc === 403) setError("권한이 없습니다.");
      else if (sc === 404) setError("이벤트를 찾을 수 없습니다.");
      else if (sc === 409) setError(getApiErrorMessage(err, "이미 종료되었거나 정책상 종료할 수 없습니다."));
      else setError(getApiErrorMessage(err, "잠시 후 다시 시도해주세요."));
    } finally {
      setEndingPk(null);
    }
  }

  return (
    <div className="min-w-0">
      {/* Title + Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-gray-900">이벤트 관리</h2>
          <p className="text-sm text-gray-500 mt-1">진행중/시작 전/종료 이벤트로 구분해서 관리합니다.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate("/admin/event/new")}
            className="inline-flex items-center gap-2 rounded-xl bg-gray-900 text-white px-4 py-2 text-sm font-semibold hover:bg-gray-800"
          >
            <Plus className="h-4 w-4" />
            이벤트 등록
          </button>

          <button
            type="button"
            onClick={fetchAll}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" />
            새로고침
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Content */}
      <div className="mt-5 space-y-5">
        {status === "loading" && (
          <div className="rounded-2xl bg-white/50 border border-white/50 p-6 text-sm text-gray-600">
            불러오는 중...
          </div>
        )}

        {status === "empty" && (
          <div className="rounded-2xl bg-white/50 border border-white/50 p-6 text-sm text-gray-600">
            등록된 이벤트가 없습니다.
          </div>
        )}

        {status === "error" && !events.length && (
          <div className="rounded-2xl bg-white/50 border border-white/50 p-6 text-sm text-gray-600">
            목록을 불러오지 못했습니다.
          </div>
        )}

        {(status === "success" || events.length > 0) && (
          <>
            {/* 1) 진행중 */}
            <Section
              title={`진행중인 이벤트 (${grouped.ongoing.length})`}
              subtitle="진행중인 이벤트는 즉시 종료할 수 있어요."
              right={<Badge tone="green">진행중</Badge>}
            >
              {grouped.ongoing.length === 0 ? (
                <div className="p-6 text-sm text-gray-600">진행중인 이벤트가 없습니다.</div>
              ) : (
                <div className="divide-y divide-gray-200/60">
                  {grouped.ongoing.map((e) => (
                    <EventRow
                      key={e.eventPk}
                      e={e}
                      status="ONGOING"
                      onDetail={setSelected}
                      onEndNow={endNow}
                      endingPk={endingPk}
                    />
                  ))}
                </div>
              )}
            </Section>

            {/* 2) 시작 전 */}
            <Section
              title={`시작하지 않은 이벤트 (${grouped.upcoming.length})`}
              subtitle="시작일이 아직 오지 않은 이벤트입니다."
              right={<Badge tone="amber">시작 전</Badge>}
            >
              {grouped.upcoming.length === 0 ? (
                <div className="p-6 text-sm text-gray-600">시작 전 이벤트가 없습니다.</div>
              ) : (
                <div className="divide-y divide-gray-200/60">
                  {grouped.upcoming.map((e) => (
                    <EventRow
                      key={e.eventPk}
                      e={e}
                      status="UPCOMING"
                      onDetail={setSelected}
                      onEndNow={endNow}
                      endingPk={endingPk}
                    />
                  ))}
                </div>
              )}
            </Section>

            {/* 3) 종료됨 */}
            <Section
              title={`종료된 이벤트 (${grouped.ended.length})`}
              subtitle="종료된 이벤트입니다."
              right={<Badge tone="gray">종료</Badge>}
            >
              {grouped.ended.length === 0 ? (
                <div className="p-6 text-sm text-gray-600">종료된 이벤트가 없습니다.</div>
              ) : (
                <div className="divide-y divide-gray-200/60">
                  {grouped.ended.map((e) => (
                    <EventRow
                      key={e.eventPk}
                      e={e}
                      status="ENDED"
                      onDetail={setSelected}
                      onEndNow={endNow}
                      endingPk={endingPk}
                    />
                  ))}
                </div>
              )}
            </Section>
          </>
        )}
      </div>

      {/* Detail Modal */}
      <Modal
        open={!!selected}
        title={selected ? `이벤트 상세 #${selected.eventPk}` : "이벤트 상세"}
        onClose={() => setSelected(null)}
      >
        {selected && (
          <div className="space-y-4">
            <div>
              <div className="text-sm font-extrabold text-gray-900">{selected.eventName}</div>
              <div className="mt-1 text-sm text-gray-600">
                기간: <span className="font-semibold">{selected.eventStartDate ?? "—"} ~ {selected.eventEndDate ?? "—"}</span>
              </div>
              <div className="mt-1 text-sm text-gray-600">
                할인율: <span className="font-semibold">{selected.eventDiscountRate ?? 0}%</span>
              </div>
            </div>

            <div className="rounded-2xl bg-gray-50 border border-gray-200 p-4">
              <div className="text-xs font-bold text-gray-500 mb-1">타겟(회원)</div>
              <div className="text-sm font-semibold text-gray-900">{formatTargetAccount(selected.eventTargetAccount)}</div>

              <div className="text-xs font-bold text-gray-500 mt-3 mb-1">타겟(카테고리)</div>
              <div className="text-sm font-semibold text-gray-900">{formatTargetCategory(selected.eventTargetCategory)}</div>
            </div>

            <div className="rounded-2xl bg-white border border-gray-200 p-4">
              <div className="text-xs font-bold text-gray-500 mb-1">설명</div>
              <div className="text-sm text-gray-800 whitespace-pre-wrap">{selected.eventDescription || "—"}</div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-50"
              >
                닫기
              </button>

              {classifyEvent(selected) === "ONGOING" && (
                <button
                  type="button"
                  disabled={endingPk === selected.eventPk}
                  onClick={() => endNow(selected.eventPk)}
                  className={cx(
                    "rounded-xl px-4 py-2 text-sm font-semibold inline-flex items-center gap-2",
                    "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
                    endingPk === selected.eventPk && "opacity-50"
                  )}
                >
                  <Ban className="h-4 w-4" />
                  {endingPk === selected.eventPk ? "종료 중..." : "즉시 종료"}
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
