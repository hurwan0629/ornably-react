// src/pages/user/OrderListPage.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Container from "../../components/common/Container";

const API = "http://localhost:8088";

/* ===================== utils ===================== */
function formatDateYYYYMMDD(s) {
  if (!s) return "-";
  return String(s);
}

function formatMoneyKRW(n) {
  const num = Number(n ?? 0);
  if (Number.isNaN(num)) return "-";
  return num.toLocaleString("ko-KR") + "원";
}

function getApiErrorMessage(err) {
  // 서버 에러 포맷: { code, message } 가정
  const msg = err?.response?.data?.message;
  if (msg) return msg;

  const status = err?.response?.status;
  if (status === 401) return "로그인이 필요합니다.";
  if (status === 403) return "해당 요청에 대한 접근 권한이 없습니다.";
  if (status === 404) return "주문 내역이 존재하지 않습니다.";
  return "요청 중 오류가 발생했습니다.";
}

function stateTone(state) {
  const s = String(state ?? "").toUpperCase();

  // ❌ 취소/환불
  if (s.includes("취소") || s.includes("환불")) {
    return "border-red-200 bg-red-50 text-red-700";
  }

  // ✅ 배송 완료 → 초록
  if (s.includes("배송 완료") || s.includes("DELIVERY_COMPLETE") || s === "DELIVERED") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  // 🚚 배송중 → 주황
  if (s.includes("배송중") || s.includes("DELIVERING")) {
    return "border-orange-200 bg-orange-50 text-orange-700";
  }

  // 📦 배송 준비중 → 기존 색 유지 (회색)
  if (s.includes("READY") || s.includes("배송 준비중")) {
    return "border-zinc-200 bg-zinc-50 text-zinc-700";
  }

  // 💳 결제 관련
  if (s.includes("PAID") || s.includes("PAY")) {
    return "border-indigo-200 bg-indigo-50 text-indigo-700";
  }

  return "border-zinc-200 bg-zinc-50 text-zinc-700";
}


/* ===================== UI ===================== */
function SkeletonRow() {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="flex gap-4">
        <div className="h-20 w-20 rounded-xl bg-zinc-100" />
        <div className="flex-1">
          <div className="h-4 w-1/3 rounded bg-zinc-100" />
          <div className="mt-2 h-4 w-2/3 rounded bg-zinc-100" />
          <div className="mt-3 h-4 w-1/2 rounded bg-zinc-100" />
        </div>
      </div>
    </div>
  );
}

export default function OrderListPage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [orders, setOrders] = useState([]);

  const hasOrders = useMemo(() => Array.isArray(orders) && orders.length > 0, [orders]);

  const loadOrders = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(`${API}/api/user/orders/me`, {
        withCredentials: true,
      });
      setOrders(res?.data?.ordersDatas ?? []);
    } catch (err) {
      setOrders([]);
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goDetail = (ordersPk) => {
    navigate(`/account/order/${ordersPk}`);
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      <Container>
        {/* Header */}
        <div className="pt-6">
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h1 className="text-lg font-semibold text-zinc-900">주문 내역</h1>
                <p className="mt-1 text-sm text-zinc-500">
                  최근 주문부터 확인할 수 있어요.
                </p>
              </div>
              <button
                onClick={loadOrders}
                className="rounded-xl border px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 active:scale-[0.99]"
              >
                새로고침
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="py-6">
          {loading && (
            <div className="grid gap-3">
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </div>
          )}

          {!loading && error && (
            <div className="rounded-2xl border bg-white p-6 text-center shadow-sm">
              <p className="text-sm text-zinc-700">{error}</p>
              <button
                onClick={loadOrders}
                className="mt-4 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:opacity-90 active:scale-[0.99]"
              >
                다시 시도
              </button>
            </div>
          )}

          {!loading && !error && !hasOrders && (
            <div className="rounded-2xl border bg-white p-10 text-center shadow-sm">
              <p className="text-sm text-zinc-700">주문 내역이 아직 없어요.</p>
              <p className="mt-2 text-xs text-zinc-500">
                상품을 구매하면 이곳에 주문이 표시됩니다.
              </p>
            </div>
          )}

          {!loading && !error && hasOrders && (
            <div className="grid gap-3">
              {orders.map((o) => {
                const pk = o?.ordersPk;
                const state = o?.ordersStatus ?? "-";
                const img = o?.itemImageUrl; // 문서엔 number로 되어있지만 보통 URL string이라 가정
                const itemName = o?.ordersSignatureItemName ?? "대표 상품";
                const itemCount = Number(o?.ordersItemCount ?? 0);
                const total = o?.ordersTotalAmount;
                const date = o?.ordersDate;

                const addressName = o?.addressName ?? "";
                const addressRegion = o?.addressRegion ?? "";
                const addressDetail = o?.addressDetail ?? "";

                return (
                  <button
                    key={pk}
                    type="button"
                    onClick={() => goDetail(pk)}
                    className="w-full rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:-translate-y-[1px] hover:shadow active:translate-y-0"
                  >
                    <div className="flex items-start gap-4">
                      {/* image */}
                      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-zinc-100">
                        {img ? (
                          <img
                            src={img}
                            alt={itemName}
                            className="h-full w-full object-cover"
                            loading="lazy"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        ) : null}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={[
                              "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
                              stateTone(state),
                            ].join(" ")}
                          >
                            {state}
                          </span>
                          <span className="text-xs text-zinc-500">
                            {formatDateYYYYMMDD(date)}
                          </span>
                          <span className="text-xs text-zinc-400">·</span>
                          <span className="text-xs text-zinc-500">주문번호 #{pk}</span>
                        </div>

                        <div className="mt-2 truncate text-sm font-semibold text-zinc-900">
                          {itemName}
                        </div>

                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                          <span className="text-zinc-700">
                            총 {Number.isNaN(itemCount) ? "-" : itemCount}개 상품
                          </span>
                          <span className="text-zinc-300">|</span>
                          <span className="font-semibold text-zinc-900">
                            {formatMoneyKRW(total)}
                          </span>
                        </div>

                        <div className="mt-2 text-xs text-zinc-500">
                          <span className="font-medium text-zinc-600">배송지명: {addressName}</span>
                          {addressName ? <span className="text-zinc-300"> · </span> : null}
                          <span className="break-words">
                            {addressRegion} {addressDetail}
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0 self-center text-zinc-400">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M9 18l6-6-6-6" />
                        </svg>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </Container>
    </div>
  );
}
