// src/pages/public/ItemDetailPage.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Container from "../../components/common/Container";
import { useAuth } from "../../auth/AuthContext";
import ornablyAPI from "../../lib/api";

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

// 0~10 주면 ★ 5개 적당히 채워만들어주는 역할
function StarRow({ score5 = 0 }) {
  // score10: 0~10
  const filled = Math.round(score5); // 단순 표시(별 5개)
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center">
        {/* 일단 별 5개 만들기 */}
        {Array.from({ length: 5 }).map((_, i) => (
          <span
            key={i}
            className={cx("text-sm", i < filled ? "text-violet-600" : "text-zinc-300")}
            aria-hidden
          >
            ★
          </span>
        ))}
      </div>
      <div className="text-sm text-zinc-600">
        <span className="font-semibold text-zinc-800">{score5.toFixed(1)}</span>
        <span> / 5.0</span>
      </div>
    </div>
  );
}

/* ===================== Modal ===================== */
// open: 모달이 열려야하는지 아닌지 판별 ex) 로그인 한경우 vs 안한경우
// 모달 제목
// 모달 내용
// onClose: 모달 끌때 닫기 누르면 할 작업
// actions: 닫기 이외의 작업 설명
function Modal({ open, title, children, onClose, actions }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
        aria-hidden
      />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-3xl border border-zinc-100 bg-white shadow-xl">
          <div className="p-5">
            <div className="text-lg font-extrabold text-zinc-900">{title}</div>
            <div className="mt-2 text-sm text-zinc-600">{children}</div>

            <div className="mt-5 flex justify-end gap-2">
              {actions ? (
                actions
              ) : (
                <button
                  onClick={onClose}
                  className="h-10 rounded-2xl bg-zinc-900 px-4 text-sm font-extrabold text-white hover:bg-zinc-800"
                >
                  확인
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===================== Review Pagination ===================== */
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
  if (!maxPages || maxPages <= 1) return null;
  const items = buildPageList(page, maxPages);

  return (
    <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page <= 1}
        className={cx(
          "h-10 rounded-2xl border px-4 text-sm font-bold transition",
          page <= 1 ? "bg-zinc-50 text-zinc-300 border-zinc-100" : "bg-white hover:border-zinc-300"
        )}
      >
        이전
      </button>

      {items.map((p, idx) =>
        p === "..." ? (
          <span key={`dots-${idx}`} className="px-2 text-sm text-zinc-400">
            ···
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            className={cx(
              "h-10 min-w-10 rounded-2xl border px-3 text-sm font-extrabold transition",
              p === page
                ? "bg-violet-600 text-white border-violet-600"
                : "bg-white hover:border-zinc-300 text-zinc-800"
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
          "h-10 rounded-2xl border px-4 text-sm font-bold transition",
          page >= maxPages ? "bg-zinc-50 text-zinc-300 border-zinc-100" : "bg-white hover:border-zinc-300"
        )}
      >
        다음
      </button>
    </div>
  );
}

/* ===================== Page ===================== */
// url 파라미터에서 아이템pk 가져오기
export default function ItemDetailPage() {
  const { itemPk } = useParams();
  const navigate = useNavigate();
  const auth = useAuth();

  // 찜하기, 장바구니, 바로구매를 위해 현재 사용자(USER)인지를 저장하는 데이터 생성
  const isUser = useMemo(() => {
    const list = auth?.authorities ?? [];
    // 요구사항: authorities[0]에 USER가 없으면 막기
    // 실제로는 배열 어디에든 있을 수 있어서 includes도 같이 지원
    return list?.[0] === "USER" || list?.includes("USER");
  }, [auth?.authorities]);

  // 상품 정보
  const [notFound, setNotFound] = useState(false);
  const [loadingItem, setLoadingItem] = useState(true);
  const [itemError, setItemError] = useState("");
  const [item, setItem] = useState(null); // itemData

  // 리뷰
  const [reviewLoading, setReviewLoading] = useState(true);
  const [reviewError, setReviewError] = useState("");
  const [reviewDatas, setReviewDatas] = useState([]);
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewMaxPages, setReviewMaxPages] = useState(1);
  const reviewDataCount = 5; // 사진처럼 5개 표시

  // 수량
  const [count, setCount] = useState(1);

  // 모달
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [actionModal, setActionModal] = useState({ open: false, title: "", message: "" });

  // 로그인 필요! 라는 모달창을 띄우는 함수 set어쩌고 하면 -> 상태변화 감지 -> 모달창이 올라온다.
  const openLoginModal = () => setLoginModalOpen(true);

  const guarded = (fn) => {
    return async (...args) => {
      if (!isUser) {
        openLoginModal();
        return;
      }
      return fn?.(...args);
    };
  };

  const hasDiscount = clampRate(item?.itemDiscountRate) > 0;
  const displayPrice = hasDiscount ? item?.itemDiscountPrice : item?.itemPrice;

  /* ---------- 상품 상세 데이터 받아오기 ---------- */
  useEffect(() => {
    let alive = true;

    (async () => {
      setLoadingItem(true);
      setItemError("");
      setNotFound(false); // ✅ 초기화
      try {
        const res = await ornablyAPI.get(`/all/item/${itemPk}`);
        if (!alive) return;
        setItem(res?.data?.itemData ?? null);
      } catch (err) { 
        if (!alive) return;
        const status = err?.response?.status;

        if (status === 404) {
          setNotFound(true);       // ✅ 404 전용 플래그
          setItem(null);
        } else {
          setItemError(getApiErrorMessage(err));
        }
      } finally {
        if (!alive) return;
        setLoadingItem(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [itemPk]);


  /* ---------- 리뷰 데이터 받아오기 ---------- */
  useEffect(() => {
    let alive = true;

    (async () => {
      setReviewLoading(true);
      setReviewError("");
      try {
        // 명세에는 page가 없어서 "dataCount=5만" 있는데, 사진처럼 페이지네이션이 필요함.
        // 백엔드가 page를 지원한다면 여기 params에 page를 추가하면 됨.
        const res = await ornablyAPI.get("/all/review/item-detail-page", {
          params: { itemPk: Number(itemPk), dataCount: reviewDataCount, page: reviewPage },
        });

        if (!alive) return;

        setReviewDatas(res?.data?.reviewDatas ?? []);
        // 백이 maxPages를 내려주면 그걸 쓰고, 없으면 1로
        setReviewMaxPages(res?.data?.maxPages ?? 1);
      } catch (err) {
        if (!alive) return;
        setReviewError(getApiErrorMessage(err));
      } finally {
        if (!alive) return;
        setReviewLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [itemPk, reviewPage]);

  /* ---------- 상호작용 버튼 [찜목록 토글, 장바구니, 바로구매] ---------- */
  const handleToggleWishlist = guarded(async () => {
    const current = !!item?.itemWishlistToggle;
    try {
      if (current) {
        await ornablyAPI.delete(`/user/wishlist/${item.itemPk}`);
        setItem((prev) => ({ ...prev, itemWishlistToggle: false }));
      } else {
        await ornablyAPI.post(`/user/wishlist/${item.itemPk}`);
        setItem((prev) => ({ ...prev, itemWishlistToggle: true }));
      }
    } catch (err) {
      setActionModal({
        open: true,
        title: "찜 처리 실패",
        message: getApiErrorMessage(err),
      });
    }
  });
  
  const handleAddCart = guarded(async () => {
    try {
      const res = await ornablyAPI.post("/user/cart", {
        itemPk: item.itemPk,
        cartCount: count,
      });
      const ok = !!res?.data?.success;
      setActionModal({
        open: true,
        title: "장바구니에 담았어요",
        message: "장바구니로 이동할까요?",
      });
    } catch (err) {
      setActionModal({
        open: true,
        title: "장바구니 처리 실패",
        message: getApiErrorMessage(err),
      });
    }
  });

  const handleBuyNow = guarded(async () => {
    console.log("=== 즉시구매 ===");
    console.log("[item]");
    console.log(item);
    console.log("cartCount:["+count+"]");


    // 실제 결제 플로우가 정해지면 교체
    // 지금은 "주문 페이지로 이동" 정도로만 처리
    navigate("/account/checkout", {
      state: {
        source: "instance",
        item: {
          itemPk: itemPk, 
          itemPrice: item.itemPrice, 
          itemDiscountRate: item.itemDiscountRate, 
          itemDiscountPrice: item.itemDiscountPrice,
          itemCount: count,
        },
      },
    });
  });

  if (!loadingItem && notFound) {
    return (
      <div className="bg-gradient-to-b from-violet-50 via-white to-white min-h-[calc(100vh-0px)]">
        <Container>
          <div className="py-10">
            <div className="mx-auto max-w-3xl rounded-3xl border bg-white p-8 shadow-sm text-center">
              <div className="text-3xl">🫥</div>
              <h1 className="mt-3 text-xl font-extrabold text-zinc-900">
                상품이 존재하지 않아요
              </h1>
              <p className="mt-2 text-sm text-zinc-600">
                삭제되었거나 잘못된 주소로 접근했을 수 있어요.
              </p>

              <div className="mt-6 flex flex-wrap justify-center gap-2">
                <button
                  className="h-11 rounded-2xl bg-zinc-900 px-5 text-sm font-extrabold text-white hover:bg-zinc-800"
                  onClick={() => navigate(-1)}
                >
                  뒤로가기
                </button>
                <button
                  className="h-11 rounded-2xl border bg-white px-5 text-sm font-extrabold text-zinc-800 hover:border-zinc-300"
                  onClick={() => navigate("/items")}
                >
                  상품 목록으로
                </button>
              </div>
            </div>
          </div>
        </Container>
      </div>
    );
  }
  return (
    <div className="bg-gradient-to-b from-violet-50 via-white to-white min-h-[calc(100vh-0px)]">
      <Container>
        <div className="py-8">
          
          {/* Top section */}
          {loadingItem ? (
            <div className="rounded-3xl border bg-white p-6 shadow-sm">불러오는 중...</div>
          ) : itemError ? (
            <div className="rounded-3xl border border-rose-100 bg-rose-50 p-6 text-rose-700">
              <div className="font-extrabold">상품 정보를 불러오지 못했어요</div>
              <div className="mt-2 text-sm">{itemError}</div>
              <div className="mt-4 flex gap-2">
                <button
                  className="h-10 rounded-2xl bg-zinc-900 px-4 text-sm font-extrabold text-white hover:bg-zinc-800"
                  onClick={() => navigate(-1)}
                >
                  뒤로가기
                </button>
                <button
                  className="h-10 rounded-2xl border bg-white px-4 text-sm font-extrabold text-zinc-800 hover:border-zinc-300"
                  onClick={() => window.location.reload()}
                >
                  새로고침
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
              {/* left: image */}
              <div className="lg:col-span-7">
                <div className="rounded-3xl border bg-white p-4 shadow-sm">
                  <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-dashed border-violet-200 bg-violet-50/40">
                    {item?.itemImageUrl ? (
                      <img
                        src={item.itemImageUrl}
                        alt={item?.itemName ?? "상품"}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <div className="text-center">
                          <div className="font-extrabold text-violet-700">상품 이미지 영역</div>
                          <div className="mt-1 text-xs text-zinc-500">
                            여기에 대표 상품 이미지를 넣어주세요 (예: 1:1 또는 4:5 비율 추천)
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* right: info */}
              <div className="lg:col-span-5">
                <div className="rounded-3xl border bg-white p-6 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <h1 className="text-xl font-extrabold text-zinc-900 leading-snug">
                      {item?.itemName ?? "-"}
                    </h1>

                    <button
                      type="button"
                      onClick={handleToggleWishlist}
                      className={cx(
                        "h-11 w-11 shrink-0 rounded-2xl border bg-white grid place-items-center transition",
                        item?.itemWishlistToggle
                          ? "border-violet-300 text-violet-600"
                          : "border-zinc-200 text-zinc-700 hover:border-zinc-300"
                      )}
                      title={item?.itemWishlistToggle ? "찜 해제" : "찜"}
                    >
                      {item?.itemWishlistToggle ? "♥" : "♡"}
                    </button>
                  </div>

                  <div className="mt-3">
                    <div className="text-2xl font-extrabold text-zinc-900">
                      {formatPriceKRW(displayPrice)}
                    </div>

                    {hasDiscount && (
                      <div className="mt-1 flex items-center gap-2 text-sm">
                        <span className="text-zinc-400 line-through">
                          {formatPriceKRW(item?.itemPrice)}
                        </span>
                        <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-extrabold text-violet-700">
                          {clampRate(item?.itemDiscountRate)}% 할인
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <StarRow score5={item?.itemAvgStar ?? 0} />
                    <span className="text-xs text-zinc-500">{item?.itemCartegory}</span>
                  </div>

                  {/* description placeholder */}
                  <div className="mt-4 rounded-2xl border bg-zinc-50 p-4 text-sm text-zinc-600 leading-relaxed">
                    {item?.itemDescription}
                  </div>

                  {/* count */}
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <div className="text-sm font-bold text-zinc-800">수량</div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCount((c) => Math.max(1, c - 1))}
                        className="h-10 w-10 rounded-2xl border bg-white text-lg font-extrabold text-zinc-800 hover:border-zinc-300"
                      >
                        -
                      </button>
                      <input
                        value={count}
                        onChange={(e) => {
                          const v = Number(String(e.target.value).replaceAll(/\D/g, ""));
                          setCount(Number.isFinite(v) && v >= 1 ? Math.min(99, v) : 1);
                        }}
                        className="h-10 w-16 rounded-2xl border bg-white text-center text-sm font-extrabold text-zinc-900 focus:border-violet-400 focus:outline-none focus:ring-4 focus:ring-violet-100"
                        inputMode="numeric"
                      />
                      <button
                        type="button"
                        onClick={() => setCount((c) => Math.min(99, c + 1))}
                        className="h-10 w-10 rounded-2xl border bg-white text-lg font-extrabold text-zinc-800 hover:border-zinc-300"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={handleAddCart}
                      className="h-11 rounded-2xl border bg-white text-sm font-extrabold text-zinc-900 hover:border-zinc-300 transition"
                    >
                      장바구니 추가
                    </button>
                    <button
                      type="button"
                      onClick={handleBuyNow}
                      className="h-11 rounded-2xl bg-violet-600 text-sm font-extrabold text-white hover:bg-violet-700 transition"
                    >
                      바로 구매
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Review section */}
          <div className="mt-6 rounded-3xl border bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-zinc-900">리뷰</h2>
            </div>

            <div className="mt-4 border-t" />

            {reviewLoading ? (
              <div className="py-10 text-center text-sm text-zinc-500">리뷰 불러오는 중...</div>
            ) : reviewError ? (
              <div className="py-10 text-center text-sm text-rose-600">{reviewError}</div>
            ) : reviewDatas.length === 0 ? (
              <div className="py-10 text-center text-sm text-zinc-500">리뷰가 아직 없어요.</div>
            ) : (
              <div className="mt-4 space-y-3">
                {reviewDatas.map((r) => {
                  const star5 = Math.round(Number(r.reviewStar ?? 0));
                  const filled = Math.round(star5);
                  return (
                    <div key={r.reviewPk} className="rounded-2xl border bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-extrabold text-zinc-900">{r.reviewTitle}</div>
                          <div className="mt-1 text-xs text-zinc-500">
                            {/*작성자*/} {r.reviewAccountName} · {/*작성날짜*/} {r.reviewDate}
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <span
                                key={i}
                                className={cx(
                                  "text-sm",
                                  i < filled ? "text-violet-600" : "text-zinc-300"
                                )}
                                aria-hidden
                              >
                                ★
                              </span>
                            ))}
                          </div>
                          <div className="mt-1 text-xs font-bold text-zinc-700">
                            {Math.round(star5)} / 5
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 text-sm text-zinc-700 leading-relaxed">
                        {r.reviewContent}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <Pagination
              page={reviewPage}
              maxPages={reviewMaxPages}
              onChange={(p) => {
                setReviewPage(p);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
          </div>
        </div>
      </Container>

      {/* login required modal */}
      <Modal
        open={loginModalOpen}
        title="로그인이 필요해요"
        onClose={() => setLoginModalOpen(false)}
        actions={
          <>
            <button
              onClick={() => setLoginModalOpen(false)}
              className="h-10 rounded-2xl border bg-white px-4 text-sm font-extrabold text-zinc-800 hover:border-zinc-300"
            >
              닫기
            </button>
            <button
              onClick={() => navigate("/login")}
              className="h-10 rounded-2xl bg-violet-600 px-4 text-sm font-extrabold text-white hover:bg-violet-700"
            >
              로그인하러 가기
            </button>
          </>
        }
      >
        바로구매/장바구니/찜 기능은 일반 사용자 권한이 필요합니다.
      </Modal>

      {/* action result modal */}
      <Modal
        open={actionModal.open}
        title={actionModal.title}
        onClose={() => setActionModal({ open: false, title: "", message: "" })}
        actions={
          <>
            <button
              onClick={() => setActionModal({ open: false, title: "", message: "" })}
              className="h-10 rounded-2xl border bg-white px-4 text-sm font-extrabold text-zinc-800 hover:border-zinc-300"
            >
              닫기
            </button>
            {actionModal.title.includes("장바구니에 담았어요") && (
              <button
                onClick={() => navigate("/account/cart")}
                className="h-10 rounded-2xl bg-violet-600 px-4 text-sm font-extrabold text-white hover:bg-violet-700"
              >
                장바구니로
              </button>
            )}
          </>
        }
      >
        {actionModal.message}
      </Modal>
    </div>
  );
}
