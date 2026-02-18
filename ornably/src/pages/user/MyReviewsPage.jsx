// src/pages/user/MyReviewPage.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Container from "../../components/common/Container";
import ornablyAPI from "../../lib/api";


const API_BASE = import.meta.env?.VITE_API_BASE_URL ?? "http://localhost:8088";

/* ===================== utils ===================== */
function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function clamp0to10(n) {
  const x = Number(n ?? 0);
  if (Number.isNaN(x)) return 0;
  return Math.max(0, Math.min(10, x));
}

function getApiErrorMessage(err) {
  return (
    err?.response?.data?.message ||
    err?.response?.data?.error?.message ||
    err?.message ||
    "요청 중 오류가 발생했습니다."
  );
}

/* ===================== UI ===================== */
function SkeletonRow() {
  return (
    <div className="rounded-3xl border bg-white shadow-sm p-4">
      <div className="flex items-center gap-4">
        <div className="h-20 w-24 rounded-2xl bg-gray-100 animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-2/3 rounded bg-gray-100 animate-pulse" />
          <div className="h-4 w-1/2 rounded bg-gray-100 animate-pulse" />
          <div className="h-4 w-1/3 rounded bg-gray-100 animate-pulse" />
        </div>
        <div className="flex flex-col gap-2">
          <div className="h-10 w-24 rounded-2xl bg-gray-100 animate-pulse" />
          <div className="h-10 w-24 rounded-2xl bg-gray-100 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onGoItems }) {
  return (
    <div className="rounded-3xl border bg-white shadow-sm p-10 text-center">
      <p className="text-lg font-extrabold text-gray-900">작성한 리뷰가 없습니다</p>
      <p className="mt-2 text-sm text-gray-500">
        상품을 구매하고 리뷰를 남기면 여기에서 확인할 수 있어요.
      </p>

      <div className="mt-6 flex justify-center">
        <button
          type="button"
          onClick={onGoItems}
          className="h-11 px-5 rounded-2xl border border-violet-200 bg-violet-50 text-violet-700 font-extrabold text-sm hover:bg-violet-100 transition"
        >
          상품 보러가기
        </button>
      </div>
    </div>
  );
}

function StarBadge({ star }) {
  const s = clamp0to10(star);
  return (
    <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-extrabold text-amber-700">
      리뷰 평점 {s} / 5
    </span>
  );
}

function ReviewRow({
  row,
  deleting,
  onDelete,
  onEdit,
  onOpenItem,
}) {
  // ⚠️ itemPk / reviewPk 는 API 명세에 없는데,
  // "삭제(reviewPk)" / "수정(itemPk)" 요구가 있어서
  // 응답에 포함된다고 가정하고 사용함.
  const itemPk = Number(row?.itemPk);
  const reviewPk = Number(row?.reviewPk);
  const canOpenItem = !Number.isNaN(itemPk);
  const canDelete = !Number.isNaN(reviewPk);

  return (
    <div className="rounded-3xl border bg-white shadow-sm p-4 hover:shadow-md transition">
      <div className="flex items-center gap-4">
        {/* item clickable area */}
        <button
          type="button"
          onClick={() => canOpenItem && onOpenItem?.(itemPk)}
          disabled={!canOpenItem}
          className={cx(
            "flex-1 min-w-0 text-left flex items-center gap-4 rounded-2xl p-2 -m-2 transition",
            canOpenItem ? "hover:bg-gray-50" : "opacity-60 cursor-not-allowed"
          )}
          title={canOpenItem ? "상품 상세로 이동" : "itemPk가 없어 이동할 수 없습니다"}
        >
          {/* image */}
          <div className="h-20 w-24 flex-shrink-0 overflow-hidden rounded-2xl bg-gray-100">
            {row?.reviewImageUrl ? (
              <img
                src={row.reviewImageUrl}
                alt={row?.itemName ?? "상품"}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-xs text-gray-400">
                NO IMAGE
              </div>
            )}
          </div>

          {/* text */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <p className="font-extrabold text-gray-900 truncate">{row?.itemName ?? "-"}</p>
              <StarBadge star={row?.reviewStar} />
            </div>

            <p className="mt-2 text-sm font-extrabold text-gray-900 truncate">
              {row?.reviewTitle ?? "-"}
            </p>
            <p className="mt-1 text-sm text-gray-600 line-clamp-2">
              {row?.reviewContent ?? "-"}
            </p>
          </div>
        </button>

        {/* actions */}
        <div className="flex-shrink-0 flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (!canDelete || deleting) return;
              onDelete?.(reviewPk);
            }}
            disabled={!canDelete || deleting}
            className={cx(
              "h-10 px-4 rounded-2xl border text-sm font-extrabold transition",
              !canDelete || deleting
                ? "bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed"
                : "bg-white text-rose-700 border-rose-200 hover:bg-rose-50"
            )}
          >
            {deleting ? "삭제 중..." : "삭제"}
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (!canOpenItem) return;
              onEdit?.(itemPk, reviewPk);
            }}
            disabled={!canOpenItem}
            className={cx(
              "h-10 px-4 rounded-2xl border text-sm font-extrabold transition",
              !canOpenItem
                ? "bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed"
                : "bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100"
            )}
          >
            수정하기
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===================== Page ===================== */
export default function MyReviewPage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState("");

  const [rows, setRows] = useState([]); // reviewDatas
  const [deletingMap, setDeletingMap] = useState({}); // { [reviewPk]: true }

  const isEmpty = useMemo(
    () => !loading && !errMsg && (rows?.length ?? 0) === 0,
    [loading, errMsg, rows]
  );

  const goItems = () => navigate("/items");
  const openItem = (itemPk) => navigate(`/item/${itemPk}`);

  const goEdit = (itemPk, reviewPk) => {
    navigate("/account/review/write", {
      state: { type: "update", itemPk, reviewPk },
    });
  };

  const loadMyReviews = async () => {
    setLoading(true);
    setErrMsg("");
    try {
      const res = await ornablyAPI.get(`/user/review/me`, {
        withCredentials: true,
      });

      setRows(res?.data?.reviewDatas ?? []);
    } catch (err) {
      const status = err?.response?.status;
      const code = err?.response?.data?.code;

      // 404: 작성한 리뷰 없음 -> 빈 상태로 표시
      if (status === 404 && code === "REVIEW_NOT_FOUND") {
        setRows([]);
        setErrMsg("");
      } else {
        setErrMsg(getApiErrorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMyReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const deleteReview = async (reviewPk) => {
    const pk = Number(reviewPk);
    if (Number.isNaN(pk)) return;

    setErrMsg("");
    setDeletingMap((m) => ({ ...m, [pk]: true }));

    // optimistic remove
    const prev = rows;
    setRows((list) => (list ?? []).filter((r) => Number(r?.reviewPk) !== pk));

    try {
      await ornablyAPI.delete(`/user/review`, {
        params: { reviewPk: pk },
      });
      // 204 NO_CONTENT
    } catch (err) {
      // rollback
      setRows(prev);
      setErrMsg(getApiErrorMessage(err));
    } finally {
      setDeletingMap((m) => {
        const next = { ...m };
        delete next[pk];
        return next;
      });
    }
  };

  return (
    <Container>
      <div className="py-8">
        {/* header */}
        <div className="rounded-3xl border bg-white shadow-sm p-5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-lg font-extrabold text-gray-900">내가 쓴 리뷰</p>
            <p className="mt-1 text-sm text-gray-500">
              총 <span className="font-extrabold text-gray-900">{rows?.length ?? 0}</span>개
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadMyReviews}
              className="h-11 px-4 rounded-2xl border bg-white text-gray-800 font-extrabold text-sm hover:border-gray-300 transition"
            >
              새로고침
            </button>

            <button
              type="button"
              onClick={goItems}
              className="h-11 px-4 rounded-2xl border border-violet-200 bg-violet-50 text-violet-700 font-extrabold text-sm hover:bg-violet-100 transition"
            >
              상품 보러가기
            </button>
          </div>
        </div>

        {/* error */}
        {!!errMsg && (
          <div className="mt-4 rounded-3xl border border-rose-200 bg-rose-50 p-4">
            <p className="text-sm font-extrabold text-rose-700">오류</p>
            <p className="mt-1 text-sm text-rose-700">{errMsg}</p>
          </div>
        )}

        {/* content */}
        <div className="mt-6 space-y-3">
          {loading ? (
            <>
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonRow key={i} />
              ))}
            </>
          ) : isEmpty ? (
            <EmptyState onGoItems={goItems} />
          ) : (
            (rows ?? []).map((row, idx) => (
              <ReviewRow
                key={`${row?.reviewPk ?? "x"}-${idx}`}
                row={row}
                deleting={!!deletingMap?.[Number(row?.reviewPk)]}
                onDelete={deleteReview}
                onEdit={goEdit}
                onOpenItem={openItem}
              />
            ))
          )}
        </div>
      </div>
    </Container>
  );
}
