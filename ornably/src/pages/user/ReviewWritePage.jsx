// src/pages/user/ReviewWritePage.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Container from "../../components/common/Container";
import { getApiMessage } from "../../lib/error";
import ornablyAPI from "../../lib/api";

/* ===================== utils ===================== */
function clamp(n, min, max) {
  const x = Number(n);
  if (Number.isNaN(x)) return min;
  return Math.max(min, Math.min(max, x));
}
function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

/**
 * /account/review/write
 * - state: { type: "new"|"update", itemPk, reviewPk? }
 * - query: ?type=new&itemPk=123&reviewPk=9
 */
function readParams(location) {
  console.log("파라미터");
  const qs = new URLSearchParams(location.search);
  const s = location.state || {};
  
  const typeRaw = s.type ?? qs.get("type") ?? "new";
  const type = typeRaw === "update" ? "update" : "new";
  
  const itemPk = Number(s.itemPk ?? qs.get("itemPk") ?? 0) || 0;
  const reviewPk = Number(s.reviewPk ?? qs.get("reviewPk") ?? 0) || null;
  
  console.log(qs);
  console.log(s);

  return { type, itemPk, reviewPk };
}

/* ===================== Stars (text star, selectable) ===================== */
/*function StarRow({ score5 = 0, editable = false, onChange, disabled = false }) {
  // score10: 2~10(서버), UI는 1~5 정수
  const safe5 = clamp(score5, 1, 5);
  const filled = score5;

  const setScore5 = (v) => {
    const next5 = clamp(v, 1, 5);
    onChange?.(next5);
  };

  return (
    <div className="rounded-xl border bg-white px-3 py-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="text-sm font-medium text-zinc-800">별점</div>
        <div className="text-xs font-semibold text-zinc-700">
          {score5}/5
        </div>
      </div>

      <div
        className={cx(
          "flex items-center gap-2 rounded-lg border px-3 py-3",
          disabled ? "bg-zinc-50" : "bg-white"
        )}
      >
        <div className="flex items-center">
          {Array.from({ length: 5 }).map((_, i) => {
            const isOn = i < filled;
            const clickable = editable && !disabled;
            return (
              <button
                key={i}
                type="button"
                disabled={!clickable}
                onClick={() => setScore5(i + 1)}
                className={cx(
                  "px-0.5 text-xl leading-none",
                  clickable ? "cursor-pointer" : "cursor-default",
                  isOn ? "text-violet-600" : "text-zinc-300",
                  clickable && "hover:scale-110 active:scale-95"
                )}
                aria-label={`${i + 1}점 선택`}
              >
                ★
              </button>
            );
          })}
        </div>

      
      </div>

      {disabled && (
        <div className="mt-2 text-xs text-zinc-500">
          수정 모드에서는 별점을 변경할 수 없습니다.
        </div>
      )}
    </div>
  );
}*/
function StarRow({ score5 = 1, editable = false, onChange, disabled = false }) {
  const value = clamp(score5, 1, 5);

  const wrapperRef = useRef(null); // (선택) 이벤트 받는 영역: 박스
  const starsRef = useRef(null);   // ✅ 점수 계산 기준: 별 영역
  const draggingRef = useRef(false);

  const canInteract = editable && !disabled;

  const calcScoreFromX = (clientX) => {
    const el = starsRef.current; // ✅ 별 영역 기준
    if (!el) return value;

    const rect = el.getBoundingClientRect();
    const x = clientX - rect.left;

    // 별 영역 밖으로 나가면 끝값으로 clamp
    const ratio = x / rect.width;
    const next = Math.ceil(ratio * 5);

    return clamp(next, 1, 5);
  };

  const updateScore = (e) => {
    onChange?.(calcScoreFromX(e.clientX));
  };

  const onPointerDown = (e) => {
    if (!canInteract) return;
    draggingRef.current = true;

    // 박스에서 드래그가 끊기지 않게 캡처
    e.currentTarget.setPointerCapture?.(e.pointerId);

    updateScore(e);
  };

  const onPointerMove = (e) => {
    if (!canInteract || !draggingRef.current) return;
    updateScore(e);
  };

  const stopDrag = (e) => {
    draggingRef.current = false;
    try {
      e.currentTarget.releasePointerCapture?.(e.pointerId);
    } catch {}
  };

  return (
    <div className="rounded-xl border bg-white px-3 py-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm font-medium text-zinc-800">별점</div>
        <div className="text-xs font-semibold text-zinc-700">{value} / 5</div>
      </div>

      {/* 박스(잡기 쉬움): 이벤트는 여기서 받되 */}
      <div
        ref={wrapperRef}
        className={cx(
          "flex items-center rounded-lg border px-3 py-3 select-none",
          disabled ? "bg-zinc-50" : "bg-white",
          canInteract ? "cursor-pointer" : "cursor-default"
        )}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={stopDrag}
        onPointerLeave={stopDrag}
        onPointerCancel={stopDrag}
      >
        {/* ✅ 별 영역: 점수 계산은 여기 width 기준 */}
        <div ref={starsRef} className="flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <span
              key={i}
              className={cx(
                "text-2xl leading-none",
                i < value ? "text-violet-600" : "text-zinc-300"
              )}
            >
              ★
            </span>
          ))}
        </div>
      </div>

      {disabled && (
        <div className="mt-2 text-xs text-zinc-500">
          수정 모드에서는 별점을 변경할 수 없습니다.
        </div>
      )}
    </div>
  );
}



/* ===================== page ===================== */
export default function ReviewWritePage() {
  const navigate = useNavigate();
  const location = useLocation();

  const { type, itemPk, reviewPk: reviewPkFromState } = useMemo(
    () => readParams(location),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [location.key]
  );

  const isUpdate = type === "update";
  const fileRef = useRef(null);

  const [initLoading, setInitLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");
  const [okMsg, setOkMsg] = useState("");

  // 기존 리뷰 (update에서만)
  const [existing, setExisting] = useState({
    reviewPk: reviewPkFromState,
    reviewTitle: "",
    star5: 5, // 2~10
    reviewContent: "",
    reviewImageUrl: "",
  });

  // 입력값
  const [form, setForm] = useState({
    reviewTitle: "",
    reviewContent: "",
    // 서버는 2~10, UI는 1~5 정수만
    star5: 5, // default 4/5
    imageFile: null,
  });

  const previewUrl = useMemo(() => {
    if (!form.imageFile) return "";
    return URL.createObjectURL(form.imageFile);
  }, [form.imageFile]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // update: 기존 데이터 로드
  useEffect(() => {
    let alive = true;
    setError("");
    setOkMsg("");
    (async () => {
      if (!itemPk) {
        setError("itemPk가 없습니다. (주문 상세에서 itemPk를 넘겨주세요)");
        return;
      }
      if (!isUpdate) return;

      setInitLoading(true);
      try {
        const res = await ornablyAPI.get(`/user/review/${existing.reviewPk}`);
        const data = res?.data ?? {};
        const star5 = clamp(data.reviewStar ?? 5, 1, 5);
        const next = {
          reviewPk: data.reviewPk ?? reviewPkFromState ?? null,
          reviewTitle: data.reviewTitle ?? "",
          reviewStar5: star5,
          reviewContent: data.reviewContent ?? "",
          reviewImageUrl: data.reviewImageUrl ?? "",
        };

        if (!alive) return;
        setExisting(next);
        setForm((p) => ({
          ...p,
          reviewTitle: next.reviewTitle,
          reviewContent: next.reviewContent,
          star5: star5, // 수정 모드에서는 이 값 표시만(변경 불가)
          imageFile: null,
        }));
      } catch (err) {
        if (!alive) return;
        setError(getApiMessage(err));
      } finally {
        if (alive) setInitLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [isUpdate, itemPk, reviewPkFromState]);

  const canSubmit = useMemo(() => {
    if (!itemPk) return false;
    if (initLoading || loading) return false;
    if (!form.reviewTitle.trim()) return false;
    if (!form.reviewContent.trim()) return false;
    if (!form.star5) return false;
    if (isUpdate && !existing.reviewPk) return false;
    return true;
  }, [itemPk, initLoading, loading, form, isUpdate, existing.reviewPk]);

  const onChange = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const clearImage = () => onChange("imageFile", null);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setError("");
    setOkMsg("");

    try {
      if (!isUpdate) {
        // 신규: POST /api/user/review/{itemPk} (multipart)
        const fd = new FormData();
        fd.append("reviewTitle", form.reviewTitle);
        fd.append("reviewContent", form.reviewContent);

        const star5 = clamp(form.star5, 1, 5); // 2~10
        fd.append("reviewStar", String(star5));

        if (form.imageFile) fd.append("reviewImage", form.imageFile);

        await ornablyAPI.post(`/user/review/${itemPk}`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        setOkMsg("리뷰가 등록되었습니다.");
        setTimeout(() => navigate(-1), 250);
      } else {
        // 수정: PATCH /api/user/review/{reviewPk}
        await ornablyAPI.patch(`/user/review/${existing.reviewPk}`, {
          reviewTitle: form.reviewTitle,
          reviewContent: form.reviewContent,
        });

        setOkMsg("리뷰가 수정되었습니다.");
        setTimeout(() => navigate(-1), 250);
      }
    } catch (err) {
      setError(getApiMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const imageSrc = useMemo(() => {
    if (!isUpdate && previewUrl) return previewUrl;
    if (isUpdate && existing.reviewImageUrl) return existing.reviewImageUrl;
    return "";
  }, [isUpdate, previewUrl, existing.reviewImageUrl]);

  return (
    <div className="min-h-screen">
      <Container>
        {/* TOP BAR */}
        <div className="pt-10">
          <div className="mx-auto max-w-5xl rounded-2xl border bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="text-lg font-semibold text-zinc-900">리뷰 작성/수정</div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="rounded-xl border px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 active:scale-[0.99]"
                >
                  뒤로
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ALERTS */}
        <div className="mx-auto mt-4 max-w-5xl space-y-2">
          {(initLoading || loading) && (
            <div className="rounded-2xl border bg-white px-4 py-3 text-sm text-zinc-600 shadow-sm">
              처리 중...
            </div>
          )}
          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
              {error}
            </div>
          )}
          {okMsg && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 shadow-sm">
              {okMsg}
            </div>
          )}
          {isUpdate && !existing.reviewPk && !initLoading && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 shadow-sm">
              ⚠️ 수정 요청(PATCH)에 필요한 <b>reviewPk</b>가 없습니다.
              <br />
              GET /api/user/review/{`{itemPk}`} 응답에 reviewPk 포함(권장) 또는 별도 조회 API가 필요합니다.
            </div>
          )}
        </div>

        {/* MAIN */}
        <div className="mx-auto mt-4 max-w-5xl">
          <form onSubmit={onSubmit} className="rounded-2xl border bg-white p-6 shadow-sm">
            <div className="grid gap-6 md:grid-cols-[360px_1fr]">
              {/* LEFT */}
              <div className="space-y-4">
                {/* Image box */}
                <div className="rounded-2xl border bg-white p-4">
                  <div className="mb-3 text-sm font-semibold text-zinc-900">이미지</div>

                  <div className="overflow-hidden rounded-xl border bg-zinc-50">
                    {imageSrc ? (
                      <img src={imageSrc} alt="preview" className="h-[240px] w-full object-cover" />
                    ) : (
                      <div className="flex h-[240px] items-center justify-center text-sm text-zinc-500">
                        이미지 미리보기
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={isUpdate || initLoading || loading}
                      onChange={(e) => onChange("imageFile", e.target.files?.[0] ?? null)}
                    />

                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      disabled={isUpdate || initLoading || loading}
                      className={cx(
                        "flex-1 rounded-xl border px-3 py-2 text-sm font-medium",
                        isUpdate
                          ? "bg-zinc-50 text-zinc-400"
                          : "bg-white text-zinc-700 hover:bg-zinc-50 active:scale-[0.99]"
                      )}
                    >
                      이미지 선택
                    </button>

                    <button
                      type="button"
                      onClick={clearImage}
                      disabled={isUpdate || initLoading || loading || !form.imageFile}
                      className={cx(
                        "w-28 rounded-xl border px-3 py-2 text-sm font-medium",
                        isUpdate || !form.imageFile
                          ? "bg-zinc-50 text-zinc-400"
                          : "bg-white text-zinc-700 hover:bg-zinc-50 active:scale-[0.99]"
                      )}
                    >
                      선택 해제
                    </button>
                  </div>

                  {isUpdate && (
                    <div className="mt-2 text-xs text-zinc-500">
                      *수정의 경우 이미지 변경 불가
                    </div>
                  )}
                </div>

                {/* Stars (NEW: selectable 1~5 / UPDATE: read-only) */}
                <StarRow
                  score5={form.star5}
                  editable={!isUpdate}
                  disabled={isUpdate || initLoading || loading}
                  onChange={(nextStar5) => onChange("star5", nextStar5)}
                />
              </div>

              {/* RIGHT */}
              <div className="space-y-4">
                <div className="rounded-2xl border bg-white p-4">
                  <div className="mb-2 text-sm font-semibold text-zinc-900">리뷰 제목</div>
                  <input
                    value={form.reviewTitle}
                    onChange={(e) => onChange("reviewTitle", e.target.value)}
                    disabled={initLoading || loading}
                    className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-zinc-400"
                    placeholder="리뷰 제목"
                  />
                </div>

                <div className="rounded-2xl border bg-white p-4">
                  <div className="mb-2 text-sm font-semibold text-zinc-900">리뷰 내용</div>
                  <textarea
                    value={form.reviewContent}
                    onChange={(e) => onChange("reviewContent", e.target.value)}
                    disabled={initLoading || loading}
                    className="min-h-[320px] w-full resize-none rounded-xl border px-3 py-2 text-sm outline-none focus:border-zinc-400"
                    placeholder="리뷰 내용"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className={cx(
                      "rounded-xl px-6 py-3 text-sm font-semibold text-white transition",
                      canSubmit ? "bg-zinc-900 hover:opacity-90 active:scale-[0.99]" : "bg-zinc-300"
                    )}
                  >
                    {isUpdate ? "수정하기" : "등록하기"}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>

        <div className="h-10" />
      </Container>
    </div>
  );
}
