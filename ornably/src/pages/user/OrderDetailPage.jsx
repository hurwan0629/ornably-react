// src/pages/user/OrderDetailPage.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import Container from "../../components/common/Container";

const API_BASE = import.meta.env?.VITE_API_BASE_URL ?? "http://localhost:8088";

/* ===================== utils ===================== */
function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function formatDateYYYYMMDD(s) {
  if (!s) return "-";
  return String(s);
}

function formatPriceKRW(n) {
  const num = Number(n ?? 0);
  if (Number.isNaN(num)) return "-";
  return num.toLocaleString("ko-KR") + "원";
}

function getApiErrorMessage(err) {
  return (
    err?.response?.data?.message ||
    err?.response?.data?.error?.message ||
    err?.message ||
    "요청 중 오류가 발생했습니다."
  );
}

function clamp0to10(n) {
  const x = Number(n ?? 0);
  if (Number.isNaN(x)) return 0;
  return Math.max(0, Math.min(10, x));
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
        <div className="h-10 w-28 rounded-2xl bg-gray-100 animate-pulse" />
      </div>
    </div>
  );
}

function InfoPill({ label, value }) {
  return (
    <div className="rounded-2xl border bg-white px-4 py-3">
      <p className="text-xs font-extrabold text-gray-500">{label}</p>
      <p className="mt-1 text-sm font-extrabold text-gray-900 break-words" title={value}>{value.length>10 ? value.slice(0,10)+"..." : value}</p>
    </div>
  );
}

function StarBadge({ star }) {
  const s = clamp0to10(star);
  return (
    <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-extrabold text-amber-700">
      평점 {s}/10
    </span>
  );
}

/* ===================== Row ===================== */
function OrderItemRow({ it, onOpenItem, onGoReview }) {
  const itemPk = Number(it?.itemPk);

  const price = Number(it?.ordersItemPrice ?? 0);
  const count = Number(it?.ordersItemCount ?? 0);
  const sum = (Number.isNaN(price) ? 0 : price) * (Number.isNaN(count) ? 0 : count);

  const reviewed = !!it?.isReviewed;
  const reviewDisabled = reviewed;

  const handleOpen = () => {
    onOpenItem?.(itemPk);
  };

  const handleReview = (e) => {
    // 혹시 상위 클릭이 걸려있을까봐 안전장치
    e.stopPropagation();
    if (reviewDisabled) return;
    onGoReview?.(itemPk);
  };

  return (
    <div className="rounded-3xl border bg-white shadow-sm p-4 hover:shadow-md transition">
      <div className="flex items-center gap-4">
        {/* ✅ 클릭 가능한 상품 영역 (이미지+정보) */}
        <div className="flex-1 min-w-0">
          <button
            type="button"
            onClick={handleOpen}

            className={"w-full text-left flex items-center gap-4 rounded-2xl p-2 -m-2 transition hover:bg-gray-50"}
            title={"상품 상세로 이동"}
          >
            {/* image */}
            <div className="h-20 w-24 flex-shrink-0 overflow-hidden rounded-2xl bg-gray-100">
              {it?.itemImageUrl ? (
                <img
                  src={it.itemImageUrl}
                  alt={it?.itemName ?? "상품"}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-xs text-gray-400">
                  NO IMAGE
                </div>
              )}
            </div>

            {/* info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <p className="font-extrabold text-gray-900 truncate">{it?.itemName ?? "-"}</p>
                {/*<StarBadge star={it?.itemStar} />*/}
              </div>

              <div className="mt-2 flex flex-wrap items-end gap-3">
                <p className="text-sm text-gray-600">
                  단가 <span className="font-extrabold text-gray-900">{formatPriceKRW(price)}</span>
                </p>
                <p className="text-sm text-gray-600">
                  수량 <span className="font-extrabold text-gray-900">{count}</span>
                </p>
                <p className="text-sm text-gray-600">
                  합계 <span className="font-extrabold text-gray-900">{formatPriceKRW(sum)}</span>
                </p>
              </div>

              <p className="mt-2 text-xs text-gray-500">
                리뷰 상태:{" "}
                <span className={cx("font-extrabold", reviewed ? "text-gray-900" : "text-violet-700")}>
                  {reviewed ? "작성 완료" : "미작성"}
                </span>
              </p>
            </div>
          </button>
        </div>

        {/* ✅ 리뷰 버튼 (중첩 없음) */}
        <div className="flex-shrink-0">
          <button
            type="button"
            onClick={handleReview}
            disabled={reviewDisabled}
            className={cx(
              "h-10 px-4 rounded-2xl border text-sm font-extrabold transition",
              reviewDisabled
                ? "bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed"
                : "bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100"
            )}
          >
            {reviewed ? "리뷰 완료" : "리뷰 작성"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===================== Page ===================== */
export default function OrderDetailPage() {
  const { orderPk } = useParams(); // /order/:orderPk
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState("");

  const [header, setHeader] = useState({
    ordersImportUid: "",
    ordersDate: "",
    ordersPaymentType: "",
    ordersMessage: "",
    addressName: "",
    addressRegion: "",
    addressDetail: "",
    ordersStatus: "",   // ✅ 추가
  });


  const [items, setItems] = useState([]); // ordersItemDatas (각 row에 itemPk 포함)

  const totalAmount = useMemo(() => {
    return (items ?? []).reduce((acc, it) => {
      const price = Number(it?.ordersItemPrice ?? 0);
      const count = Number(it?.ordersItemCount ?? 0);
      const sum = (Number.isNaN(price) ? 0 : price) * (Number.isNaN(count) ? 0 : count);
      return acc + sum;
    }, 0);
  }, [items]);

  const loadOrderDetail = async () => {
    const pk = Number(orderPk);
    if (Number.isNaN(pk)) {
      setErrMsg("주문 번호가 올바르지 않습니다.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrMsg("");
    try {
      const res = await axios.get(`${API_BASE}/api/user/orders-item/me`, {
        withCredentials: true,
        params: { ordersPk: pk },
      });

      setItems(res?.data?.ordersItemDatas ?? []);
      setHeader({
        ordersImportUid: res?.data?.ordersData?.ordersImportUid ?? "",
        ordersDate: res?.data?.ordersData?.ordersDate ?? "",
        ordersPaymentType: res?.data?.ordersData?.ordersPaymentType ?? "",
        ordersMessage: res?.data?.ordersData?.ordersMessage ?? "",
        addressName: res?.data?.ordersData?.addressName ?? "",
        addressRegion: res?.data?.ordersData?.addressRegion ?? "",
        addressDetail: res?.data?.ordersData?.addressDetail ?? "",
        ordersStatus: res?.data?.ordersData?.ordersStatus ?? "",   // ✅ 추가
      });

    } catch (err) {
      const status = err?.response?.status;
      const code = err?.response?.data?.code;

      if (status === 404 && code === "ORDER_NOT_FOUND") setErrMsg("주문 내역이 존재하지 않습니다.");
      else setErrMsg(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrderDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderPk]);

  const onGoBack = () => navigate(-1);
  const onGoOrders = () => navigate("/account/order");

  const onOpenItem = (itemPk) => {
    navigate(`/item/${itemPk}`);
  };

  // ✅ 리뷰 페이지로 이동 + state로 데이터 전달
  const onGoReview = (itemPk) => {
    navigate("/account/review/write", {
      state: { type: "new", itemPk } 
    });
  };

  return (
    <Container>
      <div className="py-8">
        {/* header */}
        <div className="rounded-3xl border bg-white shadow-sm p-5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-lg font-extrabold text-gray-900">주문 상세</p>
            <p className="mt-1 text-sm text-gray-500">
              주문번호 <span className="font-extrabold text-gray-900">{orderPk ?? "-"}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onGoBack}
              className="h-11 px-4 rounded-2xl border bg-white text-gray-800 font-extrabold text-sm hover:border-gray-300 transition"
            >
              뒤로
            </button>
            <button
              type="button"
              onClick={onGoOrders}
              className="h-11 px-4 rounded-2xl border border-violet-200 bg-violet-50 text-violet-700 font-extrabold text-sm hover:bg-violet-100 transition"
            >
              주문목록으로
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

        {/* meta / shipping */}
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <InfoPill label="결제 고유번호(importUid)" value={header.ordersImportUid || "-"} />
          <InfoPill label="주문일" value={formatDateYYYYMMDD(header.ordersDate)} />
          <InfoPill label="결제수단" value={header.ordersPaymentType || "-"} />
          <InfoPill label="배송지명" value={header.addressName || "-"} />
          <InfoPill label="주문 상태" value={header.ordersStatus || "-"} />
          <InfoPill label="배송 요청사항" value={header.ordersMessage || "-"} />
        </div>

        {/* total */}
        <div className="mt-6 rounded-3xl border bg-white shadow-sm p-5 flex items-center justify-between gap-3">
          <p className="text-sm font-extrabold text-gray-700">총 결제 금액(계산)</p>
          <p className="text-lg font-extrabold text-gray-900">{formatPriceKRW(totalAmount)}</p>
        </div>

        {/* items */}
        <div className="mt-6">
          <div className="flex items-center justify-between">
            <p className="text-base font-extrabold text-gray-900">주문 상품</p>
            <button
              type="button"
              onClick={loadOrderDetail}
              className="h-10 px-4 rounded-2xl border bg-white text-gray-800 font-extrabold text-sm hover:border-gray-300 transition"
            >
              새로고침
            </button>
          </div>

          <div className="mt-3 space-y-3">
            {loading ? (
              <>
                {Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonRow key={i} />
                ))}
              </>
            ) : (
              (items ?? []).map((it, idx) => (
                <OrderItemRow
                  key={`${it?.itemPk ?? "x"}-${idx}`}
                  it={it}
                  onOpenItem={onOpenItem}
                  onGoReview={onGoReview}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </Container>
  );
}
