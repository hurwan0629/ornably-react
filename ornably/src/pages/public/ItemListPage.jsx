import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import axios from "axios";
import Container from "../../components/common/Container";
import { useAuth } from "../../auth/AuthContext"; // ✅ 프로젝트에 맞게 경로 조정

const API_BASE = import.meta.env?.VITE_API_BASE_URL ?? "http://localhost:8088";

/* ===================== utils ===================== */
function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

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

function isWithinDays(dateStr, days) {
  if (!dateStr) return false;
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= days;
}

/* ===================== UI atoms ===================== */
function Skeleton({ className = "" }) {
  return <div className={`animate-pulse rounded-xl bg-gray-100 ${className}`} />;
}

function SoftCard({ children, className = "" }) {
  return (
    <div className={["rounded-3xl border bg-white shadow-sm", className].join(" ")}>
      {children}
    </div>
  );
}

function ItemCardV2({ item, badge, onOpen, onWish, onAddCart }) {
  const rate = clampRate(item?.itemDiscountRate);
  const hasDiscount = rate >= 1 && typeof item?.itemDiscountPrice === "number";
  const priceMain = hasDiscount ? item?.itemDiscountPrice : item?.itemPrice;
  const priceOrigin = hasDiscount ? item?.itemPrice : null;

  const CATEGORY_MAP = Object.fromEntries(
    CATEGORIES.map(c => [c.key, c.label])
  );

  const getCategoryLabel = (key) => CATEGORY_MAP[key.toLowerCase()] ?? key;

  return (
    <div className="rounded-3xl border bg-white shadow-sm hover:shadow-md transition overflow-hidden">
      <button onClick={onOpen} className="block w-full text-left">
        <div className="relative aspect-[4/3] bg-gray-100">
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

          {(badge || hasDiscount) && (
            <div className="absolute left-3 top-3 flex items-center gap-2">
              {!!badge && (
                <span className="inline-flex items-center rounded-full border border-transparent bg-gray-900/85 px-2.5 py-1 text-xs font-medium text-white">
                  {badge}
                </span>
              )}
              {hasDiscount && (
                <span className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700">
                  {rate}% OFF
                </span>
              )}
            </div>
          )}
        </div>

        <div className="p-4">
          <p
            className="font-semibold text-gray-900 line-clamp-2 min-h-[2.75rem] leading-[1.375rem]"
            title={item?.itemName ?? ""}   // ✅ 2줄 넘어가면 hover 시 전체 표시
          >
            {item?.itemName ?? "-"}
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
                {getCategoryLabel(item.itemCategory)}
                </span>
            )}
          </div>

          <div className="mt-3 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-base font-semibold text-gray-900">{formatPriceKRW(priceMain)}</p>
              {priceOrigin != null 
              ? (<p className="mt-1 text-xs text-gray-400 line-through">{formatPriceKRW(priceOrigin)}</p>)
              : (<p className="mt-1 text-xs text-gray-400 line-through"><br/></p>)}
            </div>
          </div>
        </div>
      </button>

      <div className="px-4 pb-4 grid grid-cols-2 gap-2">
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
  );
}

/* ===================== Pagination ===================== */
function buildPageList(current, max) {
  if (!max || max <= 1) return [1];
  if (max <= 7) return Array.from({ length: max }, (_, i) => i + 1);

  const pages = new Set([1, 2, max - 1, max, current - 1, current, current + 1]);
  const list = Array.from(pages)
    .filter((p) => p >= 1 && p <= max)
    .sort((a, b) => a - b);

  const out = [];
  for (let i = 0; i < list.length; i++) {
    out.push(list[i]);
    if (i < list.length - 1 && list[i + 1] - list[i] > 1) out.push("...");
  }
  return out;
}

function Pagination({ page, maxPages, onChange }) {
  const items = useMemo(() => buildPageList(page, maxPages), [page, maxPages]);
  if (!maxPages || maxPages <= 1) return null;

  return (
    <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page <= 1}
        className={cx(
          "h-10 px-4 rounded-2xl border text-sm font-semibold transition",
          page <= 1 ? "bg-gray-50 text-gray-300 border-gray-100" : "bg-white hover:border-gray-300"
        )}
      >
        이전
      </button>

      {items.map((p, idx) =>
        p === "..." ? (
          <span key={`dots-${idx}`} className="px-2 text-sm text-gray-400">
            ···
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            className={cx(
              "h-10 min-w-10 px-3 rounded-2xl border text-sm font-extrabold transition",
              p === page
                ? "bg-violet-600 text-white border-violet-600"
                : "bg-white hover:border-gray-300 text-gray-800"
            )}
          >
            {p}
          </button>
        )
      )}

      <button
        type="button"
        onClick={() => onChange(Math.min(maxPages, page + 1))}
        disabled={page >= maxPages}
        className={cx(
          "h-10 px-4 rounded-2xl border text-sm font-semibold transition",
          page >= maxPages
            ? "bg-gray-50 text-gray-300 border-gray-100"
            : "bg-white hover:border-gray-300"
        )}
      >
        다음
      </button>
    </div>
  );
}

/* ===================== Page constants ===================== */
const SORTS = [
  // { key: "default", label: "전체" },
  { key: "new", label: "신상품" },
  { key: "popular", label: "인기" },
  { key: "discount", label: "할인 순" },
  { key: "new-reverse", label: "오래된 순" },
];

const CATEGORIES = [
  { key: "all", label: "전체" },
  { key: "tree", label: "트리" },
  { key: "light", label: "전구" },
  { key: "ball", label: "볼" },
  { key: "figure", label: "피규어" },
  { key: "wreaths", label: "리스" },
  { key: "etc", label: "기타" },
];
/* ===================== Modal ===================== */
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

/* ===================== ItemListPage ===================== */
export default function ItemListPage() {
  const navigate = useNavigate();
  const { authorities = [] } = useAuth?.() ?? {};
  const isUser = authorities?.[0] === "USER";
  const { type } = useParams()
  const [searchParams, setSearchParams] = useSearchParams();

  const http = useMemo(() => {
    return axios.create({
      baseURL: API_BASE,
      timeout: 7000,
      withCredentials: true,
    });
  }, []);

  // query state
  const SORT_TYPES = new Set(["new", "popular","discount"]);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [sort, setSort] = useState("new"); 
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(1);
  const [dataCount, setDataCount] = useState(12);


  // data state
  const [items, setItems] = useState([]);
  const [maxPages, setMaxPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");

  // modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMsg, setModalMsg] = useState({ title: "", desc: "", confirmText: "확인", onConfirm: null });

  const lastReqRef = useRef(0);

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

  const onSubmitSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const onChangeSort = (nextSort) => {
    setPage(1);
    setSort(nextSort);
  };

  const onChangeCategory = (nextCategory) => {
    setPage(1);
    setCategory(nextCategory);
  };

  const pickBadge = (item) => {
    const rate = clampRate(item?.itemDiscountRate);
    if (rate >= 1) return "SALE";
    if (isWithinDays(item?.itemRegistDate, 7)) return "NEW";
    return "";
  };

  const fetchItems = async () => {
    const reqId = Date.now();
    lastReqRef.current = reqId;

    setLoading(true);
    setErrorText("");

    try {
      const res = await http.get("/api/all/item", {
        params: {
          search: search || "",
          category: category === "all" ? ["all"] : [category],
          sort,
          page,
          dataCount,
        },
      });

      if (lastReqRef.current !== reqId) return;

      setItems(res?.data?.itemDatas ?? []);
      setMaxPages(res?.data?.maxPages ?? 1);
    } catch (err) {
      if (lastReqRef.current !== reqId) return;

      const status = err?.response?.status;
      if (status === 404) {
        setItems([]);
        setMaxPages(1);
        setErrorText("요청에 맞는 상품이 없습니다.");
      } else {
        setErrorText(getApiErrorMessage(err));
      }
    } finally {
      if (lastReqRef.current !== reqId) return;
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, sort, category, page, dataCount]);

  useEffect(() => {
    if (SORT_TYPES.has(type)) {
      setSort(type);
    } else {
      setSort("new");
    }
  
    setCategory(searchParams.get("key") ?? "all");
  }, [type, searchParams]);

  // ✅ 찜: 무조건 POST
  const requestWishlistPost = async (itemPk) => {
    if (!isUser) return openLoginModal("찜 기능은 로그인한 사용자만 이용할 수 있어요.");
    try {
      await http.post(`/api/user/wishlist/${itemPk}`);
      openInfoModal("찜 완료", "찜 목록에 추가했어요.");
    } catch (err) {
      openInfoModal("요청 실패", getApiErrorMessage(err));
    }
  };

  // ✅ 장바구니: cartCount=1 고정
  const requestAddCartOne = async (itemPk) => {
    if (!isUser) return openLoginModal("장바구니 기능은 로그인한 사용자만 이용할 수 있어요.");
    try {
      await http.post("/api/user/cart", { itemPk, cartCount: 1 });
      openInfoModal("장바구니 담기", "장바구니에 1개 담았어요.");
    } catch (err) {
      openInfoModal("요청 실패", getApiErrorMessage(err));
    }
  };

  return (
    <div className="bg-gradient-to-b from-violet-50 via-white to-white min-h-[calc(100vh-0px)]">
      <Container>
        <div className="py-8">
          {/* Header */}
          <div className="flex flex-col gap-2">
            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-violet-100 px-3 py-1 text-sm font-medium text-violet-700">
              <span className="h-2 w-2 rounded-full bg-violet-500" />
              상품 목록
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900">
              원하는 분위기의 오너먼트를 찾아보자
            </h1>
            <p className="text-sm text-gray-500">
              검색 / 카테고리 / 정렬 / 페이지당 개수로 빠르게 탐색할 수 있어요.
            </p>
          </div>

          {/* Controls (3줄 구조) */}
          <div className="mt-6 rounded-3xl border bg-white p-4 shadow-sm">
            {/* 1줄: 검색 + 페이지당 개수 */}
            <form onSubmit={onSubmitSearch} className="grid grid-cols-1 gap-3 md:grid-cols-12">
              <div className="md:col-span-9">
                <input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="검색창"
                  className="h-11 w-full rounded-2xl border bg-white px-4 text-sm font-semibold text-zinc-900
                             placeholder:text-zinc-400
                             focus:border-violet-400 focus:outline-none focus:ring-4 focus:ring-violet-100"
                />
              </div>

              <div className="md:col-span-3">
                <select
                  value={dataCount}
                  onChange={(e) => {
                    setPage(1);
                    setDataCount(Number(e.target.value));
                  }}
                  className="h-11 w-full rounded-2xl border bg-white px-3 text-sm font-extrabold text-zinc-900
                             focus:border-violet-400 focus:outline-none focus:ring-4 focus:ring-violet-100"
                >
                  <option value={8}>한페이지당 상품 개수 선택 (8)</option>
                  <option value={12}>한페이지당 상품 개수 선택 (12)</option>
                  <option value={16}>한페이지당 상품 개수 선택 (16)</option>
                  <option value={20}>한페이지당 상품 개수 선택 (20)</option>
                </select>
              </div>

              <button type="submit" className="hidden" aria-hidden />
            </form>

            {/* 2줄: 카테고리 pill */}
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="text-sm font-extrabold text-zinc-800 shrink-0">카테고리 선택</div>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => onChangeCategory(c.key)}
                    className={cx(
                      "h-9 px-3 rounded-2xl border text-sm font-extrabold transition",
                      category === c.key
                        ? "bg-gray-900 text-white border-gray-900"
                        : "bg-white text-gray-800 hover:border-gray-300"
                    )}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 3줄: 정렬 */}
            <div className="mt-3 flex flex-wrap gap-3">
              {SORTS.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => onChangeSort(s.key)}
                  className={cx(
                    "h-10 rounded-2xl border px-6 text-sm font-extrabold transition",
                    sort === s.key
                      ? "bg-violet-600 border-violet-600 text-white"
                      : "bg-white text-zinc-800 hover:border-zinc-300"
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* list */}
          <div className="mt-6">
            {errorText && (
              <div className="mb-4 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-rose-700">
                <div className="font-semibold">안내</div>
                <div className="mt-1 text-sm">{errorText}</div>
              </div>
            )}

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: Math.min(8, dataCount) }).map((_, i) => (
                  <div key={i} className="rounded-3xl border bg-white overflow-hidden">
                    <Skeleton className="aspect-[4/3]" />
                    <div className="p-4">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="mt-3 h-3 w-1/2" />
                      <Skeleton className="mt-4 h-4 w-2/3" />
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <Skeleton className="h-10 rounded-2xl" />
                        <Skeleton className="h-10 rounded-2xl" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : items.length === 0 ? (
              <SoftCard className="p-6 text-center">
                <div className="text-gray-900 font-extrabold">상품이 없습니다</div>
                <div className="mt-2 text-sm text-gray-500">
                  검색어/정렬/카테고리를 바꿔서 다시 찾아보세요.
                </div>
              </SoftCard>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {items.map((it) => (
                    <ItemCardV2
                      key={it.itemPk}
                      item={it}
                      badge={pickBadge(it)}
                      onOpen={() => navigate(`/item/${it.itemPk}`)}
                      onWish={() => requestWishlistPost(it.itemPk)}
                      onAddCart={() => requestAddCartOne(it.itemPk)}
                    />
                  ))}
                </div>

                <Pagination
                  page={page}
                  maxPages={maxPages}
                  onChange={(p) => {
                    if (p < 1 || p > maxPages) return;
                    setPage(p);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                />
              </>
            )}
          </div>
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
