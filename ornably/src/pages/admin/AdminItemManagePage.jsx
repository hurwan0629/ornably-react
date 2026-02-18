// src/pages/admin/AdminItemManagePage.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ornablyAPI from "../../lib/api";
import { ArrowLeft, Upload, RefreshCw, Pencil, Save, Plus, Image as ImageIcon } from "lucide-react";

/* ===================== utils ===================== */
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

function sanitizeNonNegInt(value, fallback = 0) {
  const s = String(value ?? "").replace(/[^\d]/g, "");
  if (!s) return fallback;
  const n = Number(s);
  if (Number.isNaN(n)) return fallback;
  return Math.max(0, Math.trunc(n));
}

function clampInt(n, min, max) {
  const x = Number(n);
  if (Number.isNaN(x)) return min;
  return Math.max(min, Math.min(max, Math.trunc(x)));
}

const API_BASE = import.meta.env?.VITE_API_BASE_URL ?? "http://localhost:8088";

function makeImageUrl(url) {
  const s = String(url ?? "").trim();
  if (!s) return "";
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  return s.startsWith("/") ? `${API_BASE}${s}` : `${API_BASE}/${s}`;
}

/* ===================== constants ===================== */
const CATEGORY_LABEL = {
  TREE: "트리",
  LIGHT: "전구",
  BALL: "볼",
  FIGURE: "피규어",
  WREATHS: "리스",
  ETC: "기타",
};

/* ===================== UI ===================== */
function StatPill({ label, value }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
      <div className="text-xs font-bold text-gray-500">{label}</div>
      <div className="mt-1 text-sm font-extrabold text-gray-900">{value}</div>
    </div>
  );
}

function SectionCard({ title, right, children }) {
  return (
    <div className="rounded-[28px] bg-white/60 border border-white/50 backdrop-blur-md shadow-[0_6px_30px_rgba(17,24,39,0.06)] overflow-hidden">
      <div className="px-5 sm:px-6 py-4 border-b border-gray-200/60 flex items-center justify-between gap-3">
        <div className="text-sm font-extrabold text-gray-900">{title}</div>
        {right}
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </div>
  );
}

function ConfirmModal({ open, title, desc, onClose, confirmText = "확인" }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/35" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-3xl border bg-white p-5 shadow-lg">
        <div className="text-lg font-extrabold text-zinc-900">{title}</div>
        {desc && <div className="mt-2 text-sm text-zinc-600 whitespace-pre-line">{desc}</div>}

        <div className="mt-5">
          <button
            onClick={onClose}
            className="h-11 w-full rounded-2xl border border-violet-200 bg-violet-600 text-sm font-extrabold text-white hover:bg-violet-700 transition"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}


/* ===================== page ===================== */
export default function AdminItemManagePage() {
  const { itemPk } = useParams();
  const navigate = useNavigate();

  // status: loading | success | error
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");

  // 서버 itemData만 저장
  const [item, setItem] = useState(null);

  // form states
  const [nameInput, setNameInput] = useState("");
  const [priceInput, setPriceInput] = useState(0);
  const [stockSetInput, setStockSetInput] = useState(0);
  const [stockAddInput, setStockAddInput] = useState(0);
  const [descInput, setDescInput] = useState("");

  // image
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(""); // blob or absolute url
  const prevBlobUrlRef = useRef("");

  // busy flags
  const [busy, setBusy] = useState({
    name: false,
    price: false,
    stock: false,
    desc: false,
    image: false,
    reload: false,
  });

  // success modal
  const [successOpen, setSuccessOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState({ title: "성공", desc: "" });

  const openSuccess = (title, desc = "") => {
    setSuccessMsg({ title, desc });
    setSuccessOpen(true);
  };


  const itemCategoryLabel = useMemo(() => {
    const c = item?.itemCategory;
    return CATEGORY_LABEL[c] ?? c ?? "—";
  }, [item]);

  function setBusyKey(key, v) {
    setBusy((p) => ({ ...p, [key]: v }));
  }

  function safeUpdateItem(patch) {
    setItem((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  function cleanupPrevBlob() {
    const prev = prevBlobUrlRef.current;
    if (prev && prev.startsWith("blob:")) {
      URL.revokeObjectURL(prev);
    }
    prevBlobUrlRef.current = "";
  }

  async function fetchItem() {
    setError("");
    setStatus("loading");
    setBusyKey("reload", true);

    try {
      const res = await ornablyAPI.get(`/admin/item/manage/${itemPk}`);
      const wrapper = res?.data; // { itemData: {...} }
      const itemData = wrapper?.itemData;

      if (!itemData) {
        throw new Error("서버 응답에 itemData가 없습니다.");
      }

      setItem(itemData);

      // init forms
      setNameInput(String(itemData?.itemName ?? ""));
      setPriceInput(Number(itemData?.itemPrice ?? 0));
      setStockSetInput(Number(itemData?.itemStock ?? 0));
      setStockAddInput(0);
      setDescInput(String(itemData?.itemDescription ?? ""));

      // init image
      cleanupPrevBlob();
      setImageFile(null);
      setImagePreview(itemData?.itemImageUrl ? makeImageUrl(itemData.itemImageUrl) : "");

      setStatus("success");
    } catch (err) {
      const sc = err?.response?.status;
      if (sc === 401) setError("로그인이 필요합니다.");
      else if (sc === 403) setError("관리자만 접근할 수 있는 요청입니다.");
      else if (sc === 404) setError("해당 상품 정보를 찾을 수 없습니다.");
      else setError(getApiErrorMessage(err, "상품 관리 정보 조회 중 오류가 발생했습니다."));

      setStatus("error");
      setItem(null);
    } finally {
      setBusyKey("reload", false);
    }
  }

  useEffect(() => {
    fetchItem();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemPk]);

  useEffect(() => {
    return () => {
      cleanupPrevBlob();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ===================== PATCH actions ===================== */
  async function patchName() {
    const v = String(nameInput ?? "").trim();
    if (!v) {
      setError("상품 이름은 비어있을 수 없습니다.");
      return;
    }

    setError("");
    setBusyKey("name", true);
    try {
      await ornablyAPI.patch(`/account/item/${itemPk}/itemName`, { itemName: v });
      safeUpdateItem({ itemName: v });
      openSuccess("수정 완료", "상품 이름이 변경되었습니다.");
    } catch (err) {
      setError(getApiErrorMessage(err, "상품 정보 수정 중 오류가 발생했습니다."));
    } finally {
      setBusyKey("name", false);
    }
  }

  async function patchPrice() {
    const v = clampInt(sanitizeNonNegInt(priceInput, 0), 0, 2_000_000_000);

    setError("");
    setBusyKey("price", true);
    try {
      await ornablyAPI.patch(`/account/item/${itemPk}/itemPrice`, { itemPrice: v });
      safeUpdateItem({ itemPrice: v });
      setPriceInput(v);
      openSuccess("수정 완료", "상품 가격이 변경되었습니다.");
    } catch (err) {
      setError(getApiErrorMessage(err, "상품 정보 수정 중 오류가 발생했습니다."));
    } finally {
      setBusyKey("price", false);
    }
  }

  async function patchStock(finalStock) {
    const v = clampInt(sanitizeNonNegInt(finalStock, 0), 0, 2_000_000_000);

    setError("");
    setBusyKey("stock", true);
    try {
      await ornablyAPI.patch(`/account/item/${itemPk}/itemStock`, { itemStock: v });
      safeUpdateItem({ itemStock: v });
      setStockSetInput(v);
      setStockAddInput(0);
      openSuccess("수정 완료", "재고가 변경되었습니다.");
    } catch (err) {
      setError(getApiErrorMessage(err, "상품 정보 수정 중 오류가 발생했습니다."));
    } finally {
      setBusyKey("stock", false);
    }
  }

  async function patchDescription() {
    const v = String(descInput ?? "").trim();
    if (!v) {
      setError("상품 설명은 비어있을 수 없습니다.");
      return;
    }

    setError("");
    setBusyKey("desc", true);
    try {
      // 서버가 정말 오타 엔드포인트/키를 쓰는 경우를 대비
      await ornablyAPI.patch(`/account/item/${itemPk}/itemDescription`, { itemDescription: v });
      safeUpdateItem({ itemDescription: v });
      openSuccess("수정 완료", "상품 설명이 변경되었습니다.");
    } catch (err) {
      setError(getApiErrorMessage(err, "상품 정보 수정 중 오류가 발생했습니다."));
    } finally {
      setBusyKey("desc", false);
    }
  }

  function onPickImage(e) {
    const file = e.target.files?.[0] || null;
    setImageFile(file);

    if (!file) return;

    cleanupPrevBlob();
    const blobUrl = URL.createObjectURL(file);
    prevBlobUrlRef.current = blobUrl;
    setImagePreview(blobUrl);
  }

  async function patchImage() {
    if (!imageFile) {
      setError("수정할 이미지를 선택해주세요.");
      return;
    }

    setError("");
    setBusyKey("image", true);
    try {
      const fd = new FormData();
      fd.append("itemImage", imageFile);

      await ornablyAPI.patch(`/account/item/${itemPk}/itemImage`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      // 서버가 바뀐 URL을 응답으로 준다면 여기서 반영해도 되지만,
      // 지금은 확실하게 fetch로 동기화
      await fetchItem();
      openSuccess("수정 완료", "상품 이미지가 변경되었습니다.");
    } catch (err) {
      setError(getApiErrorMessage(err, "상품 정보 수정 중 오류가 발생했습니다."));
    } finally {
      setBusyKey("image", false);
    }
  }

  /* ===================== render ===================== */
  const canShow = status === "success" && !!item;

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
            <h2 className="text-xl font-extrabold tracking-tight text-gray-900">상품 관리</h2>
          </div>
          <p className="text-sm text-gray-500 mt-2">상품 정보 수정 / 재고 관리 / 이미지 변경을 할 수 있어요.</p>
        </div>

        <button
          type="button"
          onClick={fetchItem}
          disabled={busy.reload}
          className={cx(
            "inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-50",
            busy.reload && "opacity-50"
          )}
        >
          <RefreshCw className="h-4 w-4" />
          새로고침
        </button>
      </div>

      {error && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {status === "loading" && (
        <div className="mt-5 rounded-2xl bg-white/50 border border-white/50 p-6 text-sm text-gray-600">
          불러오는 중...
        </div>
      )}

      {status === "error" && (
        <div className="mt-5 rounded-2xl bg-white/50 border border-white/50 p-6 text-sm text-gray-600">
          상품 정보를 불러오지 못했습니다.
        </div>
      )}

      {canShow && (
        <div className="mt-5 space-y-5">
          {/* Name / PK */}
          <SectionCard
            title="상품 이름 / 상품 PK"
            right={
              <button
                type="button"
                onClick={patchName}
                disabled={busy.name}
                className={cx(
                  "inline-flex items-center gap-2 rounded-xl bg-gray-900 text-white px-4 py-2 text-sm font-semibold hover:bg-gray-800",
                  busy.name && "opacity-50"
                )}
              >
                <Pencil className="h-4 w-4" />
                이름 바꾸기
              </button>
            }
          >
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-3 items-end">
              <div className="space-y-2">
                <div className="text-xs font-bold text-gray-500">상품 PK</div>
                <div className="text-sm font-extrabold text-gray-900">#{item.itemPk}</div>
              </div>

              <div className="lg:col-span-2">
                <div className="text-xs font-bold text-gray-600">상품 이름</div>
                <input
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring"
                  placeholder="상품 이름"
                />
              </div>
            </div>
          </SectionCard>

          {/* Main 2 columns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Image */}
            <SectionCard
              title="이미지"
              right={
                <div className="flex items-center gap-2">
                  <label className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-gray-50 cursor-pointer">
                    <Upload className="h-4 w-4" />
                    이미지 선택
                    <input type="file" accept="image/*" className="hidden" onChange={onPickImage} />
                  </label>

                  <button
                    type="button"
                    onClick={patchImage}
                    disabled={busy.image}
                    className={cx(
                      "inline-flex items-center gap-2 rounded-xl bg-gray-900 text-white px-3 py-2 text-sm font-semibold hover:bg-gray-800",
                      busy.image && "opacity-50"
                    )}
                  >
                    <ImageIcon className="h-4 w-4" />
                    이미지 수정
                  </button>
                </div>
              }
            >
              <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
                {imagePreview ? (
                  <img src={imagePreview} alt="item" className="w-full h-[280px] sm:h-[360px] object-cover" />
                ) : (
                  <div className="w-full h-[280px] sm:h-[360px] flex items-center justify-center text-gray-400 text-sm">
                    이미지 없음
                  </div>
                )}
              </div>

              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatPill label="등록일" value={item.itemRegistDate ?? "—"} />
                <StatPill label="판매수" value={Number(item.itemSoldCount ?? 0).toLocaleString("ko-KR")} />
                <StatPill label="리뷰수" value={Number(item.itemReviewCount ?? 0).toLocaleString("ko-KR")} />
                <StatPill label="찜수" value={Number(item.itemWishlistCount ?? 0).toLocaleString("ko-KR")} />
              </div>

              <div className="mt-4 text-sm text-gray-700">
                카테고리: <span className="font-semibold">{itemCategoryLabel}</span>
              </div>
            </SectionCard>

            {/* Price / Stock */}
            <div className="space-y-5">
              <SectionCard
                title="상품 가격"
                right={
                  <button
                    type="button"
                    onClick={patchPrice}
                    disabled={busy.price}
                    className={cx(
                      "inline-flex items-center gap-2 rounded-xl bg-gray-900 text-white px-4 py-2 text-sm font-semibold hover:bg-gray-800",
                      busy.price && "opacity-50"
                    )}
                  >
                    <Save className="h-4 w-4" />
                    가격 변경
                  </button>
                }
              >
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={priceInput}
                  onChange={(e) => setPriceInput(sanitizeNonNegInt(e.target.value, 0))}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring"
                  inputMode="numeric"
                />
              </SectionCard>

              <SectionCard title="상품 재고 관리">
                <div className="rounded-2xl border border-gray-200 bg-white px-4 py-4">
                  <div className="text-xs font-bold text-gray-500">현재 재고</div>
                  <div className="mt-1 text-lg font-extrabold text-gray-900">
                    {Number(item.itemStock ?? 0).toLocaleString("ko-KR")}개
                  </div>
                </div>

                {/* Set stock */}
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 items-end">
                  <div>
                    <div className="text-xs font-bold text-gray-600">재고 입력창</div>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={stockSetInput}
                      onChange={(e) => setStockSetInput(sanitizeNonNegInt(e.target.value, 0))}
                      className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring"
                      inputMode="numeric"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => patchStock(stockSetInput)}
                    disabled={busy.stock}
                    className={cx(
                      "h-10 rounded-xl bg-gray-900 text-white px-4 text-sm font-semibold hover:bg-gray-800 inline-flex items-center gap-2 justify-center",
                      busy.stock && "opacity-50"
                    )}
                  >
                    <Save className="h-4 w-4" />
                    재고 등록
                  </button>
                </div>

                {/* Add stock */}
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 items-end">
                  <div>
                    <div className="text-xs font-bold text-gray-600">추가할 재고 개수</div>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={stockAddInput}
                      onChange={(e) => setStockAddInput(sanitizeNonNegInt(e.target.value, 0))}
                      className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring"
                      inputMode="numeric"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => patchStock(Number(item.itemStock ?? 0) + Number(stockAddInput ?? 0))}
                    disabled={busy.stock}
                    className={cx(
                      "h-10 rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold hover:bg-gray-50 inline-flex items-center gap-2 justify-center",
                      busy.stock && "opacity-50"
                    )}
                  >
                    <Plus className="h-4 w-4" />
                    재고 추가
                  </button>
                </div>
              </SectionCard>
            </div>
          </div>

          {/* Description */}
          <SectionCard
            title="상품 설명"
            right={
              <button
                type="button"
                onClick={patchDescription}
                disabled={busy.desc}
                className={cx(
                  "inline-flex items-center gap-2 rounded-xl bg-gray-900 text-white px-4 py-2 text-sm font-semibold hover:bg-gray-800",
                  busy.desc && "opacity-50"
                )}
              >
                <Save className="h-4 w-4" />
                수정하기
              </button>
            }
          >
            <textarea
              value={descInput}
              onChange={(e) => setDescInput(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:ring min-h-[180px]"
              placeholder="상품 설명"
            />
          </SectionCard>

          {/* Review */}
          <div className="flex items-center justify-start">
            <button
              type="button"
              onClick={() => navigate(`/admin/item/${item.itemPk}/review`)}
              className="rounded-2xl border border-gray-200 bg-white px-6 py-3 text-sm font-extrabold hover:bg-gray-50"
            >
              상품에 등록된 리뷰 보기
            </button>
          </div>
        </div>
      )}
      <ConfirmModal
        open={successOpen}
        title={successMsg.title}
        desc={successMsg.desc}
        onClose={() => setSuccessOpen(false)}
        confirmText="확인"
      />
    </div>
  );
}
