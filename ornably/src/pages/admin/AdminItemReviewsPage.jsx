import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ornablyAPI from "../../lib/api";
import { ArrowLeft, Trash2, UserRound, RefreshCw, Image as ImageIcon } from "lucide-react";

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

function clamp(n, min, max) {
  const x = Number(n);
  if (Number.isNaN(x)) return min;
  return Math.max(min, Math.min(max, x));
}

// reviewStar: 2~10 -> 5점 만점 느낌으로 보여주기(선택)
function starTo5(star2to10) {
  const s = clamp(star2to10, 0, 10);
  return (s / 2).toFixed(1); // 예: 8 -> 4.0
}

function RowCell({ children, className }) {
  return <div className={cx("text-sm text-gray-800 truncate", className)}>{children}</div>;
}

function ReviewRow({ r, deleting, onDelete, onGoAuthor }) {
  const title = r.reviewTitle ?? "—";
  const content = r.reviewContent ?? "—";
  const hasImage = Boolean(r.reviewImageUrl);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      {/* 상단: 작성자/메타 + (오른쪽 끝) 이미지 */}
      <div className="flex items-start gap-4">
        {/* 왼쪽: 텍스트 */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <div className="text-sm font-extrabold text-gray-900 truncate">
              {r.reviewAccountName ?? "—"}
            </div>

            <div className="text-xs text-gray-500">
              accountPk: {r.accountPk ?? "—"} · reviewPk: {r.reviewPk ?? "—"}
            </div>

            <div className="text-xs text-gray-600">
              별점 <span className="font-bold">{r.reviewStar ?? "—"}</span>{" "}
              <span className="text-gray-500">({r.reviewStar} / 5)</span>
            </div>

            <div className="text-xs text-gray-500">{r.reviewDate ?? "—"}</div>
          </div>

          <div className="mt-2 grid grid-cols-1 gap-1">
            <div className="text-sm font-semibold text-gray-900 truncate">
              {title}
            </div>
            <div className="text-sm text-gray-700 leading-relaxed line-clamp-2 whitespace-pre-line">
              {content}
            </div>
          </div>

          {/* ✅ 버튼들을 리뷰 내용 아래로 */}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onDelete(r.reviewPk)}
              disabled={deleting}
              className={cx(
                "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-extrabold",
                "bg-orange-500 text-white hover:bg-orange-600",
                deleting && "opacity-50"
              )}
              title="리뷰 삭제"
            >
              <Trash2 className="h-4 w-4" />
              삭제
            </button>

            <button
              type="button"
              onClick={() => onGoAuthor(r.accountPk)}
              className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-extrabold bg-emerald-500 text-white hover:bg-emerald-600"
              title="작성자 관리 페이지로 이동"
            >
              <UserRound className="h-4 w-4" />
              작성자
            </button>
          </div>
        </div>

        {/* ✅ 오른쪽 끝에 이미지 크게(모달/크게보기 제거) */}
        {hasImage && (
          <div className="ml-auto shrink-0">
            <img
              src={r.reviewImageUrl}
              alt="review"
              className="h-24 w-24 sm:h-28 sm:w-28 rounded-2xl object-cover border border-gray-200 bg-white"
              loading="lazy"
            />
          </div>
        )}
      </div>
    </div>
  );
}


export default function AdminItemReviewsPage() {
  const { itemPk } = useParams();
  const navigate = useNavigate();

  const [status, setStatus] = useState("loading"); // loading | success | empty | error
  const [error, setError] = useState("");

  const [reviews, setReviews] = useState([]);
  const [deletingPk, setDeletingPk] = useState(null);
  const [reloading, setReloading] = useState(false);

  async function fetchReviews() {
    setError("");
    setReloading(true);
    setStatus("loading");
    try {
      const res = await ornablyAPI.get(`/admin/item/${itemPk}/review`);
      const data = res?.data;

      const list = data?.reviewDatas ?? [];
      if (!Array.isArray(list) || list.length === 0) {
        setReviews([]);
        setStatus("empty");
        return;
      }

      // 최신순(작성일) 정렬
      const sorted = [...list].sort((a, b) => String(b.reviewDate ?? "").localeCompare(String(a.reviewDate ?? "")));
      setReviews(sorted);
      setStatus("success");
    } catch (err) {
      const sc = err?.response?.status;
      const code = err?.response?.data?.code;

      if (sc === 401) setError("로그인이 필요합니다.");
      else if (sc === 403) setError("관리자만 접근할 수 있는 요청입니다.");
      else if (sc === 404 && code === "REVIEW_NOT_FOUND") setError("해당 상품에 대한 리뷰가 존재하지 않습니다.");
      else if (sc === 404) setError("해당 상품을 찾을 수 없습니다.");
      else setError(getApiErrorMessage(err, "상품 리뷰 조회 중 오류가 발생했습니다."));

      setReviews([]);
      setStatus("error");
    } finally {
      setReloading(false);
    }
  }

  useEffect(() => {
    fetchReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemPk]);

  async function onDelete(reviewPk) {
    const ok = window.confirm(`리뷰를 삭제할까요?\nreviewPk: ${reviewPk}`);
    if (!ok) return;

    setError("");
    setDeletingPk(reviewPk);
    try {
      await ornablyAPI.delete(`/admin/review/${reviewPk}`);
      setReviews((prev) => prev.filter((r) => Number(r.reviewPk) !== Number(reviewPk)));
    } catch (err) {
      const sc = err?.response?.status;
      if (sc === 401) setError("로그인이 필요합니다.");
      else if (sc === 403) setError("관리자만 접근할 수 있는 요청입니다.");
      else if (sc === 404) setError("해당 리뷰를 찾을 수 없습니다.");
      else setError(getApiErrorMessage(err, "리뷰 삭제 중 오류가 발생했습니다."));
    } finally {
      setDeletingPk(null);
    }
  }

  function onGoAuthor(accountPk) {
    if (!accountPk) {
      setError("작성자 PK가 없어 이동할 수 없습니다.");
      return;
    }
    // ✅ 작성자 관리 페이지 라우트는 프로젝트에 맞게 수정
    navigate(`/admin/account/${accountPk}`);
  }

  const count = useMemo(() => reviews.length, [reviews]);

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
            <h2 className="text-xl font-extrabold tracking-tight text-gray-900">상품 리뷰 목록</h2>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            itemPk: <span className="font-semibold text-gray-800">{itemPk}</span> · 리뷰 {count}개
          </p>
        </div>

        <button
          type="button"
          onClick={fetchReviews}
          disabled={reloading}
          className={cx(
            "inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-50",
            reloading && "opacity-50"
          )}
        >
          <RefreshCw className="h-4 w-4" />
          새로고침
        </button>
      </div>

      {error && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* List */}
      <div className="mt-5 space-y-3">
        {status === "loading" && (
          <div className="rounded-2xl bg-white/50 border border-white/50 p-6 text-sm text-gray-600">
            불러오는 중...
          </div>
        )}

        {status === "empty" && (
          <div className="rounded-2xl bg-white/50 border border-white/50 p-6 text-sm text-gray-600">
            해당 상품에 대한 리뷰가 없습니다.
          </div>
        )}

        {status === "error" && !reviews.length && (
          <div className="rounded-2xl bg-white/50 border border-white/50 p-6 text-sm text-gray-600">
            리뷰 목록을 불러오지 못했습니다.
          </div>
        )}

        {reviews.map((r) => (
          <ReviewRow
            key={r.reviewPk}
            r={r}
            deleting={deletingPk === r.reviewPk}
            onDelete={onDelete}
            onGoAuthor={onGoAuthor}
          />
        ))}
      </div>
    </div>
  );
}
