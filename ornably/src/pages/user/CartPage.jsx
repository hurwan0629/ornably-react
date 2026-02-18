// src/pages/user/CartPage.jsx
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import ornablyAPI from "../../lib/api";

function formatMoney(n) {
  const num = Number(n ?? 0);
  return num.toLocaleString("ko-KR");
}

function clamp0to100(x) {
  const n = Number(x ?? 0);
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

function clampCount(x) {
  const n = Number(x ?? 1);
  if (Number.isNaN(n)) return 1;
  return Math.max(1, Math.min(99, Math.floor(n)));
}

function calcItemUnitPrice(item) {
  const rate = clamp0to100(item?.itemDiscountRate);
  if (rate <= 0) return Number(item?.itemPrice ?? 0);

  const discountPrice = Number(item?.itemDiscountPrice);
  if (!Number.isNaN(discountPrice) && discountPrice > 0) return discountPrice;

  const price = Number(item?.itemPrice ?? 0);
  return Math.max(0, Math.floor(price * (1 - rate / 100)));
}

function getApiErrorMessage(e, fallback) {
  return (
    e?.response?.data?.message ||
    e?.message ||
    fallback ||
    "요청 처리 중 오류가 발생했습니다."
  );
}

export default function CartPage() {
  const navigate = useNavigate();

  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [errorMsg, setErrorMsg] = useState("");
  const [cartItems, setCartItems] = useState([]); // cartDatas
  const [rowBusy, setRowBusy] = useState({}); // { [cartPk]: true/false }
  const [actionBusy, setActionBusy] = useState(false); // 결제 이동 등

  // ✅ 장바구니 로드
  useEffect(() => {
    let alive = true;

    async function loadCart() {
      try {
        setStatus("loading");
        setErrorMsg("");

        const res = await ornablyAPI.get("/user/cart/payment");

        if (!alive) return;

        const list = res?.data?.cartDatas ?? [];
        setCartItems(list);
        setStatus("ready");
      } catch (e) {
        if (!alive) return;
        setStatus("error");
        setErrorMsg(getApiErrorMessage(e, "장바구니 정보를 불러오지 못했습니다."));
      }
    }

    loadCart();
    return () => {
      alive = false;
    };
  }, []);

  // ✅ 프론트 표시/계산용 summary
  const summary = useMemo(() => {
    const rows = (cartItems ?? []).map((it) => {
      const price = Number(it?.itemPrice ?? 0);
      const rate = clamp0to100(it?.itemDiscountRate);
      const unit = calcItemUnitPrice(it);
      const count = clampCount(it?.cartCount ?? 1);
      const total = unit * count;

      return {
        cartPk: it?.cartPk,
        itemPk: it?.itemPk,
        itemName: it?.itemName,
        itemImageUrl: it?.itemImageUrl,
        count,
        price,
        rate,
        unit,
        total,
        hasDiscount: rate > 0 && unit < price,
      };
    });

    const totalAmount = rows.reduce((acc, r) => acc + r.total, 0);
    const originalAmount = rows.reduce((acc, r) => acc + r.price * r.count, 0);
    const discountAmount = Math.max(0, originalAmount - totalAmount);

    return { rows, totalAmount, originalAmount, discountAmount };
  }, [cartItems]);

  const setBusy = (cartPk, v) =>
    setRowBusy((prev) => ({ ...prev, [cartPk]: v }));

  // ✅ 수량 변경 PATCH
  const patchCount = async (cartPk, nextCount) => {
    const safe = clampCount(nextCount);

    // optimistic update
    const prevItems = cartItems;
    setCartItems((list) =>
      list.map((x) => (x.cartPk === cartPk ? { ...x, cartCount: safe } : x))
    );

    setBusy(cartPk, true);
    setErrorMsg("");

    try {
      await ornablyAPI.patch(
        `/user/cart/${cartPk}`,
        { cartNewCount: safe },
      );
    } catch (e) {
      // rollback
      setCartItems(prevItems);
      setErrorMsg(getApiErrorMessage(e, "수량 변경 중 오류가 발생했습니다."));
    } finally {
      setBusy(cartPk, false);
    }
  };

  // ✅ 삭제 DELETE
  const removeItem = async (cartPk) => {
    const prevItems = cartItems;
    // optimistic remove
    setCartItems((list) => list.filter((x) => x.cartPk !== cartPk));

    setBusy(cartPk, true);
    setErrorMsg("");

    try {
      await ornablyAPI.delete(`/user/cart/${cartPk}`);
    } catch (e) {
      // rollback
      setCartItems(prevItems);
      setErrorMsg(getApiErrorMessage(e, "삭제 중 오류가 발생했습니다."));
    } finally {
      setBusy(cartPk, false);
    }
  };

  // ✅ 결제 페이지로 state 전달
  const goCheckout = () => {
    if (actionBusy) return;
    if (status !== "ready") return;
    if (!summary.rows.length) return;

    try {
      setActionBusy(true);

      // CheckoutPage가 기대하는 형태로 변환
      const items = summary.rows.map((r) => {
        const raw = cartItems.find((x) => x.cartPk === r.cartPk) ?? {};
        return {
          itemPk: r.itemPk,
          itemName: r.itemName,
          itemPrice: Number(raw?.itemPrice ?? 0),
          itemDiscountRate: clamp0to100(raw?.itemDiscountRate),
          itemDiscountPrice: Number(raw?.itemDiscountPrice ?? 0),
          itemCount: r.count,
        };
      });

      navigate("/account/checkout", {
        state: {
          source: "cart",
          items,
        },
      });
    } finally {
      // navigate 직후라 사실상 의미 없지만, 안전하게
      setActionBusy(false);
    }
  };

  const canCheckout =
    status === "ready" && summary.rows.length > 0 && !actionBusy;

  return (
    <div className="w-full bg-[#f6f4ff] min-h-[calc(100vh-80px)]">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="rounded-[28px] bg-white/60 backdrop-blur-md shadow-[0_6px_30px_rgba(17,24,39,0.08)] p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900">장바구니</h1>
              <p className="mt-1 text-sm text-gray-500">
                수량 변경 · 상품 삭제 · 결제 진행
              </p>
            </div>

            <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700">
              {summary.rows.length}개
            </span>
          </div>

          {errorMsg && (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMsg}
            </div>
          )}

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* 좌측: 목록 */}
            <div className="lg:col-span-2 space-y-3">
              {status === "loading" && (
                <div className="rounded-2xl bg-white shadow-sm border border-gray-100 p-5 text-sm text-gray-500">
                  장바구니를 불러오는 중…
                </div>
              )}

              {status === "error" && (
                <div className="rounded-2xl bg-white shadow-sm border border-gray-100 p-5 text-sm text-gray-600">
                  장바구니 정보를 불러오지 못했습니다.
                </div>
              )}

              {status === "ready" && summary.rows.length === 0 && (
                <div className="rounded-2xl bg-white shadow-sm border border-gray-100 p-6">
                  <div className="text-sm text-gray-600">
                    장바구니가 비어있습니다.
                  </div>
                  <div className="mt-4">
                    {/* 프로젝트 라우트에 맞게 수정 가능 */}
                    <Link
                      to="/items"
                      className="inline-flex items-center justify-center h-11 px-5 rounded-full bg-[#7c3aed] text-white font-semibold hover:opacity-90"
                    >
                      쇼핑하러 가기
                    </Link>
                  </div>
                </div>
              )}

              {status === "ready" &&
                summary.rows.map((r) => {
                  const busy = !!rowBusy[r.cartPk];

                  return (
                    <div
                      key={r.cartPk}
                      className="rounded-2xl bg-white shadow-sm border border-gray-100 p-5"
                    >
                      <div className="flex gap-4">
                        <div className="w-20 h-20 rounded-2xl bg-gray-100 overflow-hidden flex items-center justify-center">
                          {r.itemImageUrl ? (
                            <img
                              src={r.itemImageUrl}
                              alt={r.itemName ?? `item-${r.itemPk}`}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="text-xs text-gray-400">NO IMG</div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-sm font-bold text-gray-900 truncate">
                                {r.itemName ?? `상품 #${r.itemPk}`}
                              </div>
                              <div className="mt-1 text-xs text-gray-500">
                                상품 PK: {r.itemPk}
                              </div>
                            </div>

                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => removeItem(r.cartPk)}
                              className={[
                                "h-9 px-3 rounded-full text-xs font-semibold border transition",
                                busy
                                  ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50",
                              ].join(" ")}
                            >
                              삭제
                            </button>
                          </div>

                          <div className="mt-3 flex items-center justify-between gap-3">
                            {/* 가격 */}
                            <div className="text-right">
                              {r.hasDiscount ? (
                                <div className="leading-tight">
                                  <div className="text-xs text-gray-400 line-through">
                                    {formatMoney(r.price)}원
                                  </div>
                                  <div className="text-xs font-semibold text-[#7c3aed]">
                                    {r.rate}% 할인
                                  </div>
                                  <div className="text-sm font-extrabold text-gray-900">
                                    {formatMoney(r.unit)}원
                                  </div>
                                </div>
                              ) : (
                                <div className="text-sm font-extrabold text-gray-900">
                                  {formatMoney(r.unit)}원
                                </div>
                              )}
                            </div>

                            {/* 수량 컨트롤 */}
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                disabled={busy || r.count <= 1}
                                onClick={() => patchCount(r.cartPk, r.count - 1)}
                                className={[
                                  "w-10 h-10 rounded-full border font-bold transition",
                                  busy || r.count <= 1
                                    ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                                    : "bg-white text-gray-800 border-gray-200 hover:bg-gray-50",
                                ].join(" ")}
                              >
                                -
                              </button>

                              <input
                                value={r.count}
                                disabled={busy}
                                onChange={(e) => {
                                  const next = clampCount(e.target.value);
                                  setCartItems((list) =>
                                    list.map((x) =>
                                      x.cartPk === r.cartPk
                                        ? { ...x, cartCount: next }
                                        : x
                                    )
                                  );
                                }}
                                onBlur={(e) => {
                                  const next = clampCount(e.target.value);
                                  if (next !== r.count) patchCount(r.cartPk, next);
                                }}
                                inputMode="numeric"
                                className={[
                                  "w-16 h-10 rounded-2xl border text-center text-sm font-semibold outline-none",
                                  busy
                                    ? "bg-gray-100 text-gray-500 border-gray-200"
                                    : "bg-white text-gray-900 border-gray-200 focus:border-[#7c3aed]",
                                ].join(" ")}
                              />

                              <button
                                type="button"
                                disabled={busy || r.count >= 99}
                                onClick={() => patchCount(r.cartPk, r.count + 1)}
                                className={[
                                  "w-10 h-10 rounded-full border font-bold transition",
                                  busy || r.count >= 99
                                    ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                                    : "bg-white text-gray-800 border-gray-200 hover:bg-gray-50",
                                ].join(" ")}
                              >
                                +
                              </button>
                            </div>
                          </div>

                          <div className="mt-3 flex items-center justify-between text-sm">
                            <span className="text-gray-500">소계</span>
                            <span className="font-bold text-gray-900">
                              {formatMoney(r.total)}원
                            </span>
                          </div>

                          {busy && (
                            <div className="mt-2 text-xs text-gray-400">
                              처리 중…
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

              {/* 모바일 결제 버튼 */}
              <div className="lg:hidden">
                <button
                  type="button"
                  onClick={goCheckout}
                  disabled={!canCheckout}
                  className={[
                    "w-full h-12 rounded-full font-semibold shadow-sm transition",
                    canCheckout
                      ? "bg-[#7c3aed] text-white hover:opacity-90"
                      : "bg-gray-200 text-gray-500 cursor-not-allowed",
                  ].join(" ")}
                >
                  결제하기
                </button>
              </div>
            </div>

            {/* 우측: 요약 */}
            <aside className="rounded-2xl bg-white shadow-sm border border-gray-100 p-5 h-fit">
              <h2 className="text-base font-bold text-gray-900">결제 요약</h2>

              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">상품 금액</span>
                  <span className="font-semibold text-gray-900">
                    {formatMoney(summary.originalAmount)}원
                  </span>
                </div>

                {summary.discountAmount > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">할인 금액</span>
                    <span className="font-semibold text-[#7c3aed]">
                      -{formatMoney(summary.discountAmount)}원
                    </span>
                  </div>
                )}

                <div className="h-px bg-gray-200 my-2" />

                <div className="flex items-center justify-between">
                  <span className="text-gray-900 font-bold">총 결제 금액</span>
                  <span className="text-gray-900 font-extrabold text-lg">
                    {formatMoney(summary.totalAmount)}원
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={goCheckout}
                disabled={!canCheckout}
                className={[
                  "mt-5 hidden lg:block w-full h-12 rounded-full font-semibold shadow-sm transition",
                  canCheckout
                    ? "bg-[#7c3aed] text-white hover:opacity-90"
                    : "bg-gray-200 text-gray-500 cursor-not-allowed",
                ].join(" ")}
              >
                결제하기
              </button>

              <div className="mt-3 text-xs text-gray-400">
                * 결제하기를 누르면 결제 페이지로 이동합니다.
              </div>

              <div className="mt-4">
                {/* 프로젝트 라우트에 맞게 수정 가능 */}
                <Link
                  to="/items"
                  className="inline-flex w-full items-center justify-center h-11 rounded-full border border-gray-200 bg-white text-gray-800 font-semibold hover:bg-gray-50"
                >
                  쇼핑 계속하기
                </Link>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
