// src/pages/public/HomePage.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import Container from "../../components/common/Container";
import { useAuth } from "../../auth/AuthContext"
import ornablyAPI from "../../lib/api";

const API = "http://localhost:8088";

/* ===================== utils ===================== */
function formatPriceKRW(n) {
  if (typeof n !== "number") return "-";
  return n.toLocaleString("ko-KR") + "원";
}
function clampRate(rate) {
  if (typeof rate !== "number") return 0;
  return Math.max(0, Math.min(100, rate));
}
function getApiErrorMessage(err) {
  return (
    err?.response?.data?.message ||
    err?.response?.data?.error?.message ||
    err?.message ||
    "요청 중 오류가 발생했습니다."
  );
}

/* ===================== UI atoms ===================== */
function Pill({ children, className = "" }) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
        className,
      ].join(" ")}
    >
      {children}
    </span>
  );
}

function Skeleton({ className = "" }) {
  return <div className={`animate-pulse rounded-xl bg-gray-100 ${className}`} />;
}

function SectionHeader({ title, subtitle, right }) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div>
        <h2 className="text-base sm:text-lg font-semibold tracking-tight">{title}</h2>
        {subtitle && <p className="mt-1 text-xs sm:text-sm text-gray-500">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

function SoftCard({ children, className = "" }) {
  return (
    <div className={["rounded-3xl border bg-white shadow-sm", className].join(" ")}>
      {children}
    </div>
  );
}

/* ===================== Hero Carousel (NO SCROLL) ===================== */
/**
 * 스크롤 대신 transform 기반 캐러셀로 구현:
 * - 스크롤바/스냅 이슈 제거
 * - 드래그/터치로 인덱스 이동
 */
// 이벤트 창
function HeroCarousel({ events, loading }) {
  const list = Array.isArray(events) ? events : [];
  const [idx, setIdx] = useState(0);

  // 드래그 상태
  const [dragX, setDragX] = useState(0); // 현재 드래그 중 px 이동량
  const [isDragging, setIsDragging] = useState(false);
  const draggingRef = useRef(false);
  const startXRef = useRef(0);
  const movedRef = useRef(false);

  const viewportRef = useRef(null);

  // 이벤트 개수가 바뀌면 idx 범위 보정
  useEffect(() => {
    if (idx > list.length - 1) setIdx(Math.max(0, list.length - 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list.length]);

  const canPrev = idx > 0;
  const canNext = idx < list.length - 1;

  const go = (nextIdx) => {
    const bounded = Math.max(0, Math.min(list.length - 1, nextIdx));
    setIdx(bounded);
  };

  // const prev = () => canPrev && go(idx - 1);
  // const next = () => canNext && go(idx + 1);

  const onPointerDown = (e) => {
    if (!viewportRef.current) return;
    viewportRef.current.setPointerCapture?.(e.pointerId);

    draggingRef.current = true;
    setIsDragging(true);
    startXRef.current = e.clientX;
    movedRef.current = false;
    setDragX(0);
  };

  const onPointerMove = (e) => {
    if (!draggingRef.current) return;
    const dx = e.clientX - startXRef.current;
    if (Math.abs(dx) > 6) movedRef.current = true;
    setDragX(dx);
  };

  const onPointerUp = () => {
    if (!draggingRef.current) return;
    draggingRef.current = false;

    const el = viewportRef.current;
    const w = el?.clientWidth ?? 1;

    // 이동 임계값: 화면의 15% or 80px 중 작은 쪽
    const threshold = Math.min(80, w * 0.15);

    if (dragX <= -threshold && canNext) {
      go(idx + 1);
    } else if (dragX >= threshold && canPrev) {
      go(idx - 1);
    }

    setDragX(0);
    setIsDragging(false);
  };

  const safeClick = (ev) => {
    // 드래그로 이동했다면 클릭 무시
    if (movedRef.current) return;
    onClickEvent?.(ev);
  };

  if (loading) {
    return (
      <SoftCard className="overflow-hidden">
        <div className="p-4 sm:p-6">
          <SectionHeader title="시즌 이벤트" subtitle="최대 할인 이벤트를 확인해보세요" />
          <div className="mt-4 rounded-3xl border bg-gradient-to-br from-violet-50 via-white to-white p-4 sm:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Skeleton className="h-6 w-44" />
                <Skeleton className="mt-3 h-3 w-64" />
                <Skeleton className="mt-5 h-10 w-36 rounded-full" />
              </div>
              <Skeleton className="aspect-[16/9] md:aspect-[4/3] rounded-3xl" />
            </div>
            <div className="mt-4 flex items-center justify-between">
              <div className="flex gap-2">
                <Skeleton className="h-2 w-6 rounded-full" />
                <Skeleton className="h-2 w-2 rounded-full" />
                <Skeleton className="h-2 w-2 rounded-full" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-9 w-9 rounded-full" />
                <Skeleton className="h-9 w-9 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </SoftCard>
    );
  }

  if (list.length === 0) {
    return (
      <SoftCard className="p-5 sm:p-6">
        <SectionHeader title="시즌 이벤트" subtitle="진행중인 이벤트가 없습니다." />
      </SoftCard>
    );
  }

    return (
    <SoftCard className="overflow-hidden">
      <div className="p-4 sm:p-6">
        <SectionHeader title="시즌 이벤트" subtitle="최대 할인 이벤트를 확인해보세요" />

        {/* ✅ 보라 박스가 오버플로우(클리핑) 기준 */}
        <div className="mt-4 rounded-3xl border bg-gradient-to-br from-violet-50 via-white to-white overflow-hidden">
          {/* ✅ viewport: 드래그 이벤트는 여기서만 */}
          <div
            ref={viewportRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            className={[
              "relative select-none touch-pan-y",
              isDragging ? "cursor-grabbing" : "cursor-grab",
            ].join(" ")}
          >
            {/* track */}
            <div
              className="flex"
              style={{
                transform: `translateX(calc(${-idx * 100}% + ${dragX}px))`,
                transition: isDragging ? "none" : "transform 300ms ease",
              }}
            >
              {list.map((ev, i) => {
                const discountRate = clampRate(ev?.eventDiscountRate);
                const tagText =
                  typeof ev?.eventDiscountRate === "number" && ev.eventDiscountRate > 0
                    ? `최대 ${discountRate}%`
                    : "진행중";
                const dateText =
                  ev?.eventStartDate && ev?.eventEndDate
                    ? `${ev.eventStartDate} ~ ${ev.eventEndDate}`
                    : null;

                return (
                  <div key={ev.eventPk ?? i} className="w-full shrink-0 p-4 sm:p-6">
                    <button
                      onClick={() => safeClick(ev)}
                      className="w-full text-left rounded-3xl bg-white/70 border border-white/60 shadow-sm hover:shadow-md transition overflow-hidden"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                        {/* left */}
                        <div className="p-5 sm:p-7">
                          <div className="flex flex-wrap gap-2">
                            <Pill className="border-violet-200 bg-violet-50 text-violet-700">
                              ✨ {tagText}
                            </Pill>
                            {dateText && (
                              <Pill className="border-gray-200 bg-white text-gray-600">
                                {dateText}
                              </Pill>
                            )}
                          </div>

                          <h3 className="mt-3 text-xl sm:text-2xl font-semibold tracking-tight text-gray-900 leading-snug">
                            {ev?.eventName ?? "오너블리 시즌 이벤트"}
                          </h3>

                          <p className="mt-2 text-sm text-gray-600 whitespace-pre-line">
                            {ev?.eventDescription ?? "이벤트 설명이 없습니다."}
                          </p>
                        </div>

                        {/* right image */}
                        <div className="p-5 sm:p-7 md:pl-0">
                          <div className="rounded-3xl overflow-hidden bg-gray-100 aspect-[21/9] md:aspect-[16/9]">
                          {/*<div className="rounded-3xl overflow-hidden bg-gray-100 aspect-[16/9] md:aspect-[4/3]">*/}
                            {ev?.eventImageUrl ? (
                              <img
                                src={ev.eventImageUrl}
                                alt={ev?.eventName ?? "이벤트 이미지"}
                                className="h-full w-full object-cover"
                                loading="lazy"
                                draggable={false}
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-xs text-gray-400">
                                NO IMAGE
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ✅ 슬라이드 바(도트) : 배너 아래 (보라 박스 안쪽 하단) */}
          <div className="px-6 sm:px-8 pb-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {list.map((_, d) => (
                  <button
                    key={d}
                    onClick={() => go(d)}
                    className={[
                      "h-2 rounded-full transition",
                      d === idx ? "w-6 bg-violet-600" : "w-2 bg-gray-300",
                    ].join(" ")}
                    aria-label={`배너 ${d + 1}로 이동`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </SoftCard>
  );

}

/* ===================== Category UI ===================== */
// 카테고리 데이터
const CATEGORY_CARDS = [
  { key: "tree", label: "트리", desc: "미니/대형/테마", icon: "🎄" },
  { key: "light", label: "전구", desc: "LED · 웜/쿨", icon: "💡" },
  { key: "ball", label: "볼", desc: "유리/메탈/펄", icon: "🟣" },
  { key: "figure", label: "피규어", desc: "캐릭터/인형", icon: "🧸" },
  { key: "wreaths", label: "리스", desc: "현관/벽/테이블", icon: "🌿" },
  { key: "etc", label: "기타", desc: "리본/소품/세트", icon: "🎁" },
];

const CATEGORY_LABEL_KR = {
  TREE: "트리",
  LIGHT: "전구",
  BALL: "볼",
  FIGURE: "피규어",
  WREATHS: "리스",
  ETC: "기타",
};


// 카테고리 카드
function CategoryCards({ onClickCategory }) {
  return (
    <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {CATEGORY_CARDS.map((c) => (
        <button
          key={c.key}
          onClick={() => onClickCategory?.(c.key)}
          className="text-left rounded-2xl border bg-white shadow-sm hover:shadow-md transition p-4"
        >
          <div className="flex items-start gap-3">
            <div className="h-11 w-11 rounded-2xl bg-violet-50 border border-violet-100 flex items-center justify-center text-lg">
              {c.icon}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-900">{c.label}</p>
              <p className="mt-1 text-xs text-gray-500">{c.desc}</p>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
/* ===================== Modal ===================== */
// 모달 컴포넌트 함수
function ConfirmModal({ open, title, desc, onClose, onConfirm, confirmText = "확인" }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/35" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-3xl border bg-white p-5 shadow-lg">
        <div className="text-lg font-extrabold text-zinc-900">{title}</div>
        {desc && <div className="mt-2 text-sm text-zinc-600 whitespace-pre-line">{desc}</div>}

        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            onClick={onClose}
            className="h-11 rounded-2xl border bg-white text-sm font-extrabold text-zinc-800 hover:border-zinc-300 transition"
          >
            닫기
          </button>
          <button
            onClick={onConfirm}
            className="h-11 rounded-2xl border border-violet-200 bg-violet-600 text-sm font-extrabold text-white hover:bg-violet-700 transition"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
/* ===================== Item Card ===================== */
// 상품 카드
function ItemCardV2({ item, badge = "NEW", onOpen, onWish, onAddCart }) {
  const rate = clampRate(item?.itemDiscountRate);
  const hasDiscount = rate > 0 && typeof item?.itemDiscountPrice === "number";

  const priceMain = hasDiscount ? item?.itemDiscountPrice : item?.itemPrice;
  const priceOrigin = hasDiscount ? item?.itemPrice : null;

  const name = item?.itemName ?? "-";

  return (
    <div className="rounded-3xl border bg-white shadow-sm hover:shadow-md transition overflow-hidden flex flex-col h-full">
      {/* ✅ 상단 클릭 영역 (이미지+정보) */}
      <button onClick={onOpen} className="block w-full text-left">
        <div className="relative aspect-[4/3] bg-gray-100">
          {item?.itemImageUrl ? (
            <img
              src={item.itemImageUrl}
              alt={name}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-xs text-gray-400">
              NO IMAGE
            </div>
          )}

          <div className="absolute left-3 top-3 flex items-center gap-2">
            <Pill className="border-transparent bg-gray-900/85 text-white">{badge}</Pill>
            {hasDiscount && (
              <Pill className="border-violet-200 bg-violet-50 text-violet-700">
                {rate}% OFF
              </Pill>
            )}
          </div>
        </div>
      </button>

      {/* ✅ 가운데 정보 영역: 남는 공간을 먹고, 버튼은 아래로 */}
      <div className="p-4 flex flex-col flex-1">
        {/* ✅ 2줄 고정 + ... + title */}
        <p
          className="font-semibold text-gray-900 line-clamp-2 min-h-[48px] leading-6"
          title={name}
        >
          {name}
        </p>

        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 text-xs text-gray-600">
            <span aria-hidden>⭐</span>
            <span className="font-medium">
              {typeof item?.itemAvgStar === "number" ? (item.itemAvgStar.toFixed(1)==0.0 ? "0.0 (리뷰 없음)" : item.itemAvgStar.toFixed(1)) : "0.0 (리뷰 없음)"}
            </span>
          </div>

          {item?.itemCategory && (
            <span className="text-xs text-gray-500">
              {CATEGORY_LABEL_KR[item.itemCategory] ?? item.itemCategory}
            </span>
          )}

        </div>

        <div className="mt-3">
          <p className="text-base font-semibold text-gray-900">
            {formatPriceKRW(priceMain)}
          </p>

          {priceOrigin != null ? (
            <p className="mt-1 text-xs text-gray-400 line-through">
              {formatPriceKRW(priceOrigin)}
            </p>
          ) : (
            // ✅ 항상 같은 높이 확보 (줄바꿈 대신)
            <div className="mt-1 h-[16px]" />
          )}
        </div>

        {/* ✅ 버튼을 항상 카드 하단으로 밀기 */}
        <div className="mt-auto pt-4 grid grid-cols-2 gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onWish?.();
            }}
            className="h-10 rounded-2xl border bg-white text-sm font-semibold text-gray-800 hover:border-gray-300 transition"
          >
            찜
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddCart?.();
            }}
            className="h-10 rounded-2xl border border-violet-200 bg-violet-50 text-sm font-semibold text-violet-700 hover:bg-violet-100 transition"
          >
            담기
          </button>
        </div>
      </div>
    </div>
  );
}


/* ===================== Page ===================== */
export default function HomePage() {
  const navigate = useNavigate();
  const { authorities = [] } = useAuth?.() ?? {};
  const isUser = authorities?.[0] === "USER";


  const [events, setEvents] = useState([]);
  const [newItems, setNewItems] = useState([]);
  const [popularItems, setPopularItems] = useState([]);

  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingNew, setLoadingNew] = useState(true);
  const [loadingPopular, setLoadingPopular] = useState(true);

  const [errorEvents, setErrorEvents] = useState("");
  const [errorNew, setErrorNew] = useState("");
  const [errorPopular, setErrorPopular] = useState("");

    // modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMsg, setModalMsg] = useState({ title: "", desc: "", confirmText: "확인", onConfirm: null });

  const openLoginModal = (desc) => {
    setModalMsg({
      title: "로그인이 필요합니다",
      desc: desc ?? "이 기능은 로그인한 사용자만 이용할 수 있어요.",
      confirmText: "로그인",
      onConfirm: () => navigate("/login"),
    });
    setModalOpen(true);
  };

  const openInfoModal = (title, desc) => {
    setModalMsg({
      title,
      desc,
      confirmText: "확인",
      onConfirm: () => setModalOpen(false),
    });
    setModalOpen(true);
  };

  // ✅ 찜: 무조건 POST
  const requestWishlistPost = async (itemPk) => {
    console.log("찜 버튼 눌림");
    if (!isUser) return openLoginModal("찜 기능은 로그인한 사용자만 이용할 수 있어요.");
    try {
      await ornablyAPI.post(`/user/wishlist/${itemPk}`);
      openInfoModal("찜 완료", "찜 목록에 추가했어요.");
    } catch (err) {
      openInfoModal("요청 실패", getApiErrorMessage(err));
    }
  };

  // ✅ 장바구니: cartCount=1 고정
  const requestAddCartOne = async (itemPk) => {
    console.log("장바구니 버튼 눌림");
    if (!isUser) return openLoginModal("장바구니 기능은 로그인한 사용자만 이용할 수 있어요.");
    try {
      await ornablyAPI.post(`/user/cart`, { itemPk, cartCount: 1 });
      openInfoModal("장바구니 담기", "장바구니에 1개 담았어요.");
    } catch (err) {
      openInfoModal("요청 실패", getApiErrorMessage(err));
    }
  };


  const fetchAll = async () => {
    //   에러 초기화
    setErrorEvents("");
    setErrorNew("");
    setErrorPopular("");

    setLoadingEvents(true);
    setLoadingNew(true);
    setLoadingPopular(true);

    try {
      const [evRes, newRes, popRes] = await Promise.allSettled([
        ornablyAPI.get("/all/event/in-progress"),
        ornablyAPI.get("/all/item?sort=default&dataCount=4&page=1"),
        ornablyAPI.get("/all/item?sort=popular&dataCount=4&page=1"),
      ]);

      // events
      if (evRes.status === "fulfilled") {
        setEvents(evRes.value?.data?.eventDatas ?? []);
      } else {
        const status = evRes.reason?.response?.status;
        if (status === 404) setEvents([]);
        else {
          setEvents([]);
          setErrorEvents(getApiErrorMessage(evRes.reason, "이벤트를 불러오지 못했습니다."));
        }
      }

      // new items
      if (newRes.status === "fulfilled") {
        setNewItems(newRes.value?.data?.itemDatas ?? []);
      } else {
        const status = newRes.reason?.response?.status;
        if (status === 404) setNewItems([]);
        else {
          setNewItems([]);
          setErrorNew(getApiErrorMessage(newRes.reason, "신상품을 불러오지 못했습니다."));
        }
      }

      // popular items
      if (popRes.status === "fulfilled") {
        setPopularItems(popRes.value?.data?.itemDatas ?? []);
      } else {
        const status = popRes.reason?.response?.status;
        if (status === 404) setPopularItems([]);
        else {
          setPopularItems([]);
          setErrorPopular(getApiErrorMessage(popRes.reason, "인기상품을 불러오지 못했습니다."));
        }
      }
    } finally {
      setLoadingEvents(false);
      setLoadingNew(false);
      setLoadingPopular(false);
    }
  };


  useEffect(() => {
    fetchAll();
  }, []);

  const handleClickEvent = () => navigate("/items/discount");
  const onClickCategory = (category) => navigate(`/items/category?key=${category}`);

  const newGrid = useMemo(() => {
    if (loadingNew) {
      return (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-3xl border bg-white overflow-hidden">
              <Skeleton className="aspect-[4/3]" />
              <div className="p-4">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="mt-2 h-3 w-1/2" />
                <Skeleton className="mt-4 h-10 w-full" />
              </div>
            </div>
          ))}
        </div>
      );
    }
    if (!newItems || newItems.length === 0) return <p className="mt-4 text-sm text-gray-600">신상품이 없습니다.</p>;

    return (
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {newItems.map((it) => (
          <ItemCardV2
            key={it.itemPk}
            item={it}
            badge="NEW"
            onOpen={() => navigate(`/item/${it.itemPk}`)}
            onWish={() => requestWishlistPost(it.itemPk)}
            onAddCart={() => requestAddCartOne(it.itemPk)}
          />
        ))}
      </div>
    );
  }, [loadingNew, newItems, navigate]);

  const popularGrid = useMemo(() => {
    if (loadingPopular) {
      return (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-3xl border bg-white overflow-hidden">
              <Skeleton className="aspect-[4/3]" />
              <div className="p-4">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="mt-2 h-3 w-1/2" />
                <Skeleton className="mt-4 h-10 w-full" />
              </div>
            </div>
          ))}
        </div>
      );
    }
    if (!popularItems || popularItems.length === 0) return <p className="mt-4 text-sm text-gray-600">인기상품이 없습니다.</p>;

    return (
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {popularItems.map((it) => (
          <ItemCardV2
            key={it.itemPk}
            item={it}
            badge="HOT"
            onOpen={() => navigate(`/item/${it.itemPk}`)}
            onWish={() => requestWishlistPost(it.itemPk)}
            onAddCart={() => requestAddCartOne(it.itemPk)}
          />
        ))}
      </div>
    );
  }, [loadingPopular, popularItems, navigate]);

  return (
    <div className="bg-gray-50">
      <Container>
        <div className="py-6 sm:py-8">
          {/* Hero */}
          <HeroCarousel events={events} loading={loadingEvents}/>
          {errorEvents && (
            <div className="mt-4 rounded-3xl border bg-white p-4 text-sm text-gray-700">
              {errorEvents}
            </div>
          )}
          {/* Category */}
          <div className="mt-6">
            <SectionHeader
              title="카테고리"
              subtitle="원하는 분위기로 빠르게 이동"
              right={
                <Link to="/items" className="text-sm font-medium text-gray-700 hover:text-gray-900">
                  전체보기 →
                </Link>
              }
            />
            <CategoryCards onClickCategory={onClickCategory} />
          </div>

          {/* New */}
          <div className="mt-8">
            <SectionHeader
              title="신상품"
              subtitle="방금 도착한 NEW 컬렉션"
              right={
                <Link to="/items/new" className="text-sm font-medium text-gray-700 hover:text-gray-900">
                  더보기 →
                </Link>
              }
            />
            {errorNew ? (
              <div className="mt-4 rounded-3xl border bg-white p-4 text-sm text-gray-700">
                {errorNew}
              </div>
            ) : (
              newGrid
            )}

          </div>

          {/* Popular */}
          <div className="mt-10">
            <SectionHeader
              title="인기상품"
              subtitle="지금 가장 많이 찾는 아이템"
              right={
                <Link to="/items/popular" className="text-sm font-medium text-gray-700 hover:text-gray-900">
                  더보기 →
                </Link>
              }
            />
            {errorPopular ? (
              <div className="mt-4 rounded-3xl border bg-white p-4 text-sm text-gray-700">
                {errorPopular}
              </div>
            ) : (
              popularGrid
            )}
          </div>
          <div className="h-10" />
        </div>
      </Container>
      <ConfirmModal
        open={modalOpen}
        title={modalMsg.title}
        desc={modalMsg.desc}
        confirmText={modalMsg.confirmText}
        onClose={() => setModalOpen(false)}
        onConfirm={() => {
          const fn = modalMsg.onConfirm;
          setModalOpen(false);
          fn?.();
        }}
      />
    </div>
  );
}
