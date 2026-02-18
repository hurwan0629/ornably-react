// src/pages/user/WishlistPage.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Container from "../../components/common/Container";
import ornablyAPI from "../../lib/api";
import { getApiMessage } from "../../lib/error";


/* ===================== utils ===================== */
function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function clampRate(rate) {
  const n = Number(rate ?? 0);
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

function formatPriceKRW(n) {
  const num = Number(n ?? 0);
  if (Number.isNaN(num)) return "-";
  return num.toLocaleString("ko-KR") + "원";
}

/* ===================== UI atoms ===================== */
function SkeletonRow() {
  return (
    <div className="rounded-3xl border bg-white shadow-sm p-4">
      <div className="flex items-center gap-4">
        <div className="h-20 w-24 rounded-2xl bg-gray-100 animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-2/3 rounded bg-gray-100 animate-pulse" />
          <div className="h-4 w-1/3 rounded bg-gray-100 animate-pulse" />
        </div>
        <div className="h-10 w-24 rounded-2xl bg-gray-100 animate-pulse" />
      </div>
    </div>
  );
}

function EmptyState({ onGoItems }) {
  return (
    <div className="rounded-3xl border bg-white shadow-sm p-10 text-center">
      <p className="text-lg font-extrabold text-gray-900">찜한 상품이 아직 없어요</p>
      <p className="mt-2 text-sm text-gray-500">
        마음에 드는 상품을 찜해두면 여기에서 한 번에 볼 수 있어요.
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

function ToggleButton({ on, loading, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={cx(
        "h-10 px-4 rounded-2xl border text-sm font-extrabold transition",
        loading && "opacity-60 cursor-not-allowed",
        on
          ? "border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100"
          : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
      )}
      aria-pressed={on}
    >
      {loading ? "처리 중..." : on ? "찜 ON" : "찜 OFF"}
    </button>
  );
}

/* ===================== Row item ===================== */
function WishlistRow({ item, liked, toggling, onOpen, onToggle }) {
  const rate = clampRate(item?.itemDiscountRate);
  const hasDiscount = rate >= 1 && typeof item?.itemDiscountPrice === "number";
  const priceMain = hasDiscount ? item?.itemDiscountPrice : item?.itemPrice;
  const priceOrigin = hasDiscount ? item?.itemPrice : null;

  return (
    <div
      className={cx(
        "rounded-3xl border bg-white shadow-sm p-4 transition",
        liked ? "opacity-100" : "opacity-70"
      )}
    >
      <div className="flex items-center gap-4">
        {/* 이미지 */}
        <button
          type="button"
          onClick={onOpen}
          className="relative h-20 w-24 flex-shrink-0 overflow-hidden rounded-2xl bg-gray-100"
          title="상품 상세로 이동"
        >
          {item?.itemImageUrl ? (
            <img
              src={item.itemImageUrl}
              alt={item?.itemName ?? "상품"}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-xs text-gray-400">
              NO IMAGE
            </div>
          )}

          {hasDiscount && (
            <span className="absolute left-2 top-2 inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[11px] font-extrabold text-violet-700">
              {rate}%
            </span>
          )}
        </button>

        {/* 상품 정보 */}
        <button
          type="button"
          onClick={onOpen}
          className="flex-1 text-left min-w-0"
          title="상품 상세로 이동"
        >
          <p className="font-extrabold text-gray-900 truncate">{item?.itemName ?? "-"}</p>

          <div className="mt-1 flex items-end gap-3">
            <p className="text-base font-extrabold text-gray-900">{formatPriceKRW(priceMain)}</p>
            {priceOrigin != null && (
              <p className="text-xs text-gray-400 line-through">{formatPriceKRW(priceOrigin)}</p>
            )}
          </div>
        </button>

        {/* 찜 토글 */}
        <div className="flex-shrink-0">
          <ToggleButton on={liked} loading={toggling} onClick={onToggle} />
        </div>
      </div>
    </div>
  );
}

/* ===================== Page ===================== */
export default function WishlistPage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState("");

  // 서버에서 받은 "찜 목록 데이터"
  const [items, setItems] = useState([]); // wishlistDatas

  // UI에서만 쓰는 "현재 토글 상태" (페이지 안에서는 삭제해도 row 유지)
  // { [itemPk]: true|false }
  const [likedMap, setLikedMap] = useState({});

  // { [itemPk]: true } 토글 중
  const [togglingMap, setTogglingMap] = useState({});

  const isEmpty = useMemo(
    () => !loading && !errMsg && (items?.length ?? 0) === 0,
    [loading, errMsg, items]
  );

  const goItems = () => navigate("/items");
  const goItemDetail = (itemPk) => navigate(`/item/${itemPk}`);

  const loadWishlist = async () => {
    setLoading(true);
    setErrMsg("");
    try {
      const res = await ornablyAPI.get(`/user/wishlist`);

      const list = res?.data?.wishlistDatas ?? [];
      setItems(list);

      // 목록으로 들어온 애들은 기본 liked=true
      const nextLiked = {};
      for (const it of list) {
        const pk = Number(it?.itemPk);
        if (!Number.isNaN(pk)) nextLiked[pk] = true;
      }
      setLikedMap(nextLiked);
    } catch (err) {
      const status = err?.response?.status;
      const code = err?.response?.data?.code;

      // 404(위시리스트 없음)은 "빈 상태"로 취급
      if (status === 404 && code === "WISHLIST_NOT_FOUND") {
        setItems([]);
        setLikedMap({});
        setErrMsg("");
      } else {
        setErrMsg(getApiMessage(err));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWishlist();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleWishlist = async (itemPk) => {
    const pk = Number(itemPk);
    if (Number.isNaN(pk)) return;

    const currentlyLiked = !!likedMap?.[pk];

    // UI 먼저 반영 (페이지 내에서 row는 유지)
    setTogglingMap((m) => ({ ...m, [pk]: true }));
    setLikedMap((m) => ({ ...m, [pk]: !currentlyLiked }));

    try {
      if (currentlyLiked) {
        // ON -> OFF : 삭제
        await ornablyAPI.delete(`/user/wishlist/${pk}`);
      } else {
        // OFF -> ON : 추가
        await ornablyAPI.post(`/user/wishlist/${pk}`, null);
      }
    } catch (err) {
      // 실패 시 원복
      setLikedMap((m) => ({ ...m, [pk]: currentlyLiked }));
      setErrMsg(getApiMessage(err));
    } finally {
      setTogglingMap((m) => {
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
            <p className="text-lg font-extrabold text-gray-900">내 찜 목록</p>
            <p className="mt-1 text-sm text-gray-500">
              총 <span className="font-extrabold text-gray-900">{items?.length ?? 0}</span>개
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goItems}
              className="h-11 px-4 rounded-2xl border border-violet-200 bg-violet-50 text-violet-700 font-extrabold text-sm hover:bg-violet-100 transition"
            >
              상품 구경하러 가기
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
            (items ?? []).map((it) => {
              const pk = Number(it?.itemPk);
              const liked = !!likedMap?.[pk];
              const toggling = !!togglingMap?.[pk];

              return (
                <WishlistRow
                  key={it?.itemPk}
                  item={it}
                  liked={liked}
                  toggling={toggling}
                  onOpen={() => goItemDetail(it?.itemPk)}
                  onToggle={() => toggleWishlist(it?.itemPk)}
                />
              );
            })
          )}
        </div>
      </div>
    </Container>
  );
}
