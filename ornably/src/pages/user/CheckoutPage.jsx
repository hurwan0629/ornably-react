// src/pages/user/CheckoutPage.jsx
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { getApiMessage } from "../../lib/error";
const storeId = import.meta.env.VITE_PORTONE_STORE_ID;
const channelKey = import.meta.env.VITE_PORTONE_CHANNEL_KEY;

function formatMoney(n) {
  const num = Number(n ?? 0);
  return num.toLocaleString("ko-KR");
}

function clamp0to100(x) {
  const n = Number(x ?? 0);
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

function calcItemUnitPrice(item) {
  // itemDiscountRate가 0이면 itemPrice 사용
  const rate = clamp0to100(item?.itemDiscountRate);
  if (rate <= 0) return Number(item?.itemPrice ?? 0);

  // itemDiscountPrice가 주어지면 그걸 우선 사용, 아니면 itemPrice에서 rate로 계산
  const discountPrice = Number(item?.itemDiscountPrice);
  if (!Number.isNaN(discountPrice) && discountPrice > 0) return discountPrice;

  const price = Number(item?.itemPrice ?? 0);
  return Math.max(0, Math.floor(price * (1 - rate / 100)));
}

async function requestPortOnePayment({ paymentId, orderName, totalAmount}) {
  /**
   * ✅ PortOne v2 결제 연동 포인트
   * 여기서 PortOne SDK 호출해서 결제창 띄우고,
   * 결제 성공 시 "ordersImportUid"에 넣을 값을 반환하면 됨.
   *
   * 네 백 API가 ordersImportUid를 요구하므로,
   * PortOne에서 내려주는 결제 식별자(예: paymentId / imp_uid 등)를 
   * ordersImportUid에 넣는 방식으로 맞추면 됨.
   */
  
  console.log("asdf");
  const res = await PortOne.requestPayment({ 
    storeId: storeId,
    channelKey: channelKey,
    paymentId: paymentId,
    orderName: orderName,
    totalAmount: totalAmount,
    currency: "CURRENCY_KRW",
    payMethod: "CARD"
  });
  const portonePaymentId = res?.paymentId;
  console.log("request paymentId:", paymentId);
  console.log("response paymentId:", portonePaymentId);
  return res.paymentId;
}

export default function CheckoutPage() {
  const location = useLocation();
  const navigate = useNavigate();

  // navigate("/account/checkout", { state: { source: "instance"|"cart", item|items } })
  const source = location.state?.source;
  const instanceItem = location.state?.item ?? null;
  const cartItems = location.state?.items ?? null;

  const [addrStatus, setAddrStatus] = useState("loading"); // loading | ready | error
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressPk, setSelectedAddressPk] = useState(null);

  const [ordersMessage, setOrdersMessage] = useState("");
  const [payStatus, setPayStatus] = useState("idle"); // idle | paying | done | error
  const [errorMsg, setErrorMsg] = useState("");

  // ✅ 표시용 아이템 리스트(인스턴스면 1개 배열로 변환)
  const displayItems = useMemo(() => {
    if (source === "instance" && instanceItem) return [instanceItem];
    if (source === "cart" && Array.isArray(cartItems)) return cartItems;
    return [];
  }, [source, instanceItem, cartItems]);

  // ✅ source 유효성 체크 (state 없이 직접 접근 방지)
  useEffect(() => {
    if (source !== "instance" && source !== "cart") {
      setErrorMsg("잘못된 접근입니다. 결제 정보가 없습니다.");
    }
  }, [source]);

  // ✅ 배송지 로드
  useEffect(() => {
    let alive = true;

    async function loadAddresses() {
      console.log("loadAddress함수 실행...");
      try {
        setAddrStatus("loading");
        setErrorMsg("");

        const res = await axios.get("http://localhost:8088/api/user/address/me", {
          withCredentials: true,
        });

        const list = res.data?.addressDatas ?? [];
        if (!alive) return;

        setAddresses(list);

        // 기본 배송지 우선 선택, 없으면 첫번째
        const def = list.find((a) => a.addressIsDefault);
        const pk = def?.addressPk ?? list?.[0]?.addressPk ?? null;
        setSelectedAddressPk(pk);

        setAddrStatus("ready");
      } catch (e) {
        if (!alive) return;
        setAddrStatus("error");
        setErrorMsg(e?.response?.data?.message ?? "배송지 정보를 불러오지 못했습니다.");
      }
    }

    loadAddresses();
    return () => {
      alive = false;
    };
  }, []);

  // ✅ 금액 계산(프론트 표시용)
  const summary = useMemo(() => {
    const rows = displayItems.map((it) => {
      const price = Number(it?.itemPrice ?? 0);
      const itemName = it?.itemName ?? "상품";
      // 상품 이름 최대 길이
      const len = 6
      const shortItemName = (itemName.length > len) ? itemName.slice(0, len) + "..." : itemName;
      const rate = clamp0to100(it?.itemDiscountRate);
      const unit = calcItemUnitPrice(it);
      const count = Math.max(1, Number(it?.itemCount ?? 1));
      const total = unit * count;

      return {
        itemPk: it?.itemPk,
        shortItemName,
        itemName,
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
  }, [displayItems]);

  const canPay =
    addrStatus === "ready" &&
    !!selectedAddressPk &&
    displayItems.length > 0 &&
    payStatus !== "paying";

  const onPay = async () => {
    if (!canPay) return;

    setPayStatus("paying");
    setErrorMsg("");

    let success = false;

    try {
      const paymentId = "order_" + crypto.randomUUID();
      const totalAmount = summary.totalAmount;

      const orderName = "..." // 너 기존 로직

      const res = await PortOne.requestPayment({
        storeId: import.meta.env.VITE_PORTONE_STORE_ID,
        channelKey: import.meta.env.VITE_PORTONE_CHANNEL_KEY,
        paymentId,
        orderName,
        totalAmount,
        currency: "CURRENCY_KRW",
        payMethod: "CARD",
      });

      // ✅ 사용자가 X를 눌러 닫는 경우: res가 없거나/특정 상태로 올 수 있음
      if (!res || res?.status === "CANCELED" || res?.status === "CANCELLED") {
        return; // finally에서 idle로 복구됨
      }

      const ordersImportUid = res.paymentId; // 또는 네가 쓰는 식별자

      // 백엔드 주문 확정
      if (source === "cart") {
        await axios.post("http://localhost:8088/api/user/orders/cart-payment", {
          addressPk: selectedAddressPk,
          ordersImportUid,
          ordersMessage,
        }, { withCredentials: true });
      } else {
        console.log(summary?.rows[0]?.unit);
        await axios.post("http://localhost:8088/api/user/orders/instance-payment", {
          itemPk: instanceItem?.itemPk,
          itemCount: instanceItem?.itemCount,
          itemPrice: summary?.rows[0]?.unit,
          addressPk: selectedAddressPk,
          ordersImportUid,
          ordersMessage,
        }, { withCredentials: true });
      }

      success = true;
      setPayStatus("done");
      navigate("/account/order", { replace: true });

    } catch (e) {
      // ✅ 취소도 여기로 떨어질 수 있으니 취소는 에러메시지 띄우지 말고 그냥 복구
      if (isUserCancel(e)) {
        return;
      }
      console.log(e);
      setErrorMsg(e?.response?.data?.message ?? "결제 처리 중 오류가 발생했습니다.");
    } finally {
      // ✅ 성공해서 이동한 케이스가 아니면 무조건 버튼 다시 활성화
      console.log("안녕하세요");
      if (!success) setPayStatus("idle");
    }
  };

  function isUserCancel(e) {
    // PortOne/PG별로 형태가 달라서 넓게 잡는게 안전
    const code = e?.code || e?.errorCode;
    const msg = String(e?.message || "");
    return (
      code === "USER_CANCEL" ||
      code === "CANCELED" ||
      msg.includes("cancel") ||
      msg.includes("취소") ||
      msg.includes("창") && msg.includes("닫")
    );
  }
  return (
    <div className="w-full bg-[#f6f4ff] min-h-[calc(100vh-80px)]">
      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="rounded-[28px] bg-white/60 backdrop-blur-md shadow-[0_6px_30px_rgba(17,24,39,0.08)] p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900">최종 결제</h1>
              <p className="mt-1 text-sm text-gray-500">
                배송지 선택 · 요청사항 입력 · 결제 금액 확인
              </p>
            </div>

            <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700">
              {source === "instance" ? "바로구매" : "장바구니 결제"}
            </span>
          </div>

          {errorMsg && (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMsg}
            </div>
          )}

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* 좌측: 배송지 + 요청사항 */}
            <div className="lg:col-span-2 space-y-4">
              {/* 배송지 */}
              <section className="rounded-2xl bg-white shadow-sm border border-gray-100 p-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-gray-900">배송지 선택</h2>
                  {addrStatus === "loading" && (
                    <span className="text-xs text-gray-400">불러오는 중…</span>
                  )}
                </div>

                {addrStatus === "ready" && addresses.length === 0 && (
                  <div className="mt-3 text-sm text-gray-600">
                    등록된 배송지가 없습니다. 배송지를 먼저 등록해주세요.
                  </div>
                )}

                {addrStatus === "ready" && addresses.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {addresses.map((a) => (
                      <label
                        key={a.addressPk}
                        className={[
                          "flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3",
                          selectedAddressPk === a.addressPk
                            ? "border-[#7c3aed] bg-[#7c3aed]/5"
                            : "border-gray-200 bg-white hover:bg-gray-50",
                        ].join(" ")}
                      >
                        <input
                          type="radio"
                          name="addr"
                          className="mt-1"
                          checked={selectedAddressPk === a.addressPk}
                          onChange={() => setSelectedAddressPk(a.addressPk)}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <div className="font-semibold text-gray-900">
                              {a.addressName}
                            </div>
                            {a.addressIsDefault && (
                              <span className="text-xs font-semibold rounded-full bg-[#7c3aed] text-white px-2 py-0.5">
                                기본
                              </span>
                            )}
                          </div>
                          <div className="mt-1 text-sm text-gray-600">
                            {a.addressRegion} {a.addressDetail}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </section>

              {/* 배송 요청사항 */}
              <section className="rounded-2xl bg-white shadow-sm border border-gray-100 p-5">
                <h2 className="text-base font-bold text-gray-900">배송 요청사항</h2>
                <textarea
                  value={ordersMessage}
                  onChange={(e) => setOrdersMessage(e.target.value)}
                  placeholder="예) 문 앞에 놓아주세요 / 부재 시 경비실에 맡겨주세요"
                  className="mt-3 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#7c3aed]"
                  rows={4}
                />
              </section>

              {/* 결제하기 버튼 */}
              <div className="lg:hidden">
                <button
                  type="button"
                  onClick={onPay}
                  disabled={!canPay}
                  className={[
                    "w-full h-12 rounded-full font-semibold shadow-sm transition",
                    canPay
                      ? "bg-[#7c3aed] text-white hover:opacity-90"
                      : "bg-gray-200 text-gray-500 cursor-not-allowed",
                  ].join(" ")}
                >
                  {payStatus === "paying" ? "결제 진행 중..." : "결제하기"}
                </button>
              </div>
            </div>

            {/* 우측: 주문 요약 */}
            <aside className="rounded-2xl bg-white shadow-sm border border-gray-100 p-5 h-fit">
              <h2 className="text-base font-bold text-gray-900">주문 요약</h2>

              <div className="mt-4 space-y-3">
                {summary.rows.map((r) => (
                  <div
                    key={`${r.itemPk}-${r.count}`}
                    className="rounded-2xl border border-gray-100 bg-white px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-semibold text-gray-900">
                          <span title={r.itemName}>{r.shortItemName}</span>
                        </div>
                        <div className="mt-1 text-xs text-gray-500">
                          수량 {r.count}개
                        </div>
                      </div>

                      <div className="text-right">
                        {r.hasDiscount ? (
                          <>
                            <div className="text-xs text-gray-400 line-through">
                              {formatMoney(r.price)}원
                            </div>
                            <div className="text-xs font-semibold text-[#7c3aed]">
                              {r.rate}% 할인
                            </div>
                            <div className="text-sm font-extrabold text-gray-900">
                              {formatMoney(r.unit)}원
                            </div>
                          </>
                        ) : (
                          <div className="text-sm font-extrabold text-gray-900">
                            {formatMoney(r.unit)}원
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-sm">
                      <span className="text-gray-500">소계</span>
                      <span className="font-bold text-gray-900">
                        {formatMoney(r.total)}원
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 space-y-2 text-sm">
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
                  <span className="text-gray-900 font-bold">최종 결제 금액</span>
                  <span className="text-gray-900 font-extrabold text-lg">
                    {formatMoney(summary.totalAmount)}원
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={onPay}
                disabled={!canPay}
                className={[
                  "mt-5 hidden lg:block w-full h-12 rounded-full font-semibold shadow-sm transition",
                  canPay
                    ? "bg-[#7c3aed] text-white hover:opacity-90"
                    : "bg-gray-200 text-gray-500 cursor-not-allowed",
                ].join(" ")}
              >
                {payStatus === "paying" ? "결제 진행 중..." : "결제하기"}
              </button>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
