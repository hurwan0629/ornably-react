import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ornablyAPI from "../../lib/api";
import { ArrowLeft, Upload, RefreshCw, Pencil, Save, Plus, Image as ImageIcon } from "lucide-react";

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

// 카테고리(표시는 한글, 서버 값은 영문)
const CATEGORY_LABEL = {
  TREE: "트리",
  LIGHT: "전구",
  BALL: "볼",
  FIGURE: "피규어",
  WREATHS: "리스",
  ETC: "기타",
};

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

export default function AdminItemManagePage() {
  const { itemPk } = useParams();
  const navigate = useNavigate();

  const [status, setStatus] = useState("loading"); // loading | success | error
  const [error, setError] = useState("");

  const [item, setItem] = useState(null);

  // 편집 입력값들
  const [nameInput, setNameInput] = useState("");
  const [priceInput, setPriceInput] = useState(0);
  const [stockSetInput, setStockSetInput] = useState(0); // "재고 등록"
  const [stockAddInput, setStockAddInput] = useState(0); // "재고 추가"
  const [descInput, setDescInput] = useState("");

  // 이미지 수정
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");

  // 버튼 로딩 상태
  const [busy, setBusy] = useState({
    name: false,
    price: false,
    stock: false,
    desc: false,
    image: false,
    reload: false,
  });

  const itemCategoryLabel = useMemo(() => {
    const c = item?.itemCategory;
    return CATEGORY_LABEL[c] ?? c ?? "—";
  }, [item]);

  async function fetchItem() {
    setError("");
    setBusy((p) => ({ ...p, reload: true }));
    setStatus("loading");
    try {
      const res = await ornablyAPI.get(`/admin/item/manage/${itemPk}`);
      const data = res?.data;

      setItem(data);

      // 폼 초기화
      setNameInput(String(data?.itemName ?? ""));
      setPriceInput(Number(data?.itemPrice ?? 0));
      setStockSetInput(Number(data?.itemStock ?? 0));
      setStockAddInput(0);
      setDescInput(String(data?.itemDescription ?? "")); // 서버가 itemDescription을 안 주면 "" 유지

      setImageFile(null);
      setImagePreview(String(data?.itemImageUrl ?? ""));

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
      setBusy((p) => ({ ...p, reload: false }));
    }
  }

  useEffect(() => {
    fetchItem();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemPk]);

  function setBusyKey(key, v) {
    setBusy((p) => ({ ...p, [key]: v }));
  }

  async function patchName() {
    const v = String(nameInput || "").trim();
    if (!v) {
      setError("상품 이름은 비어있을 수 없습니다.");
      return;
    }
    setError("");
    setBusyKey("name", true);
    try {
      await ornablyAPI.patch(`/account/item/${itemPk}/itemName`, { itemName: v });
      setItem((p) => ({ ...p, itemName: v }));
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
      setItem((p) => ({ ...p, itemPrice: v }));
      setPriceInput(v);
    } catch (err) {
      setError(getApiErrorMessage(err, "상품 정보 수정 중 오류가 발생했습니다."));
    } finally {
      setBusyKey("price", false);
    }
  }

  async function patchStock(newStock) {
    const v = clampInt(sanitizeNonNegInt(newStock, 0), 0, 2_000_000_000);
    setError("");
    setBusyKey("stock", true);
    try {
      await ornablyAPI.patch(`/account/item/${itemPk}/itemStock`, { itemStock: v });
      setItem((p) => ({ ...p, itemStock: v }));
      setStockSetInput(v);
      setStockAddInput(0);
    } catch (err) {
      setError(getApiErrorMessage(err, "상품 정보 수정 중 오류가 발생했습니다."));
    } finally {
      setBusyKey("stock", false);
    }
  }

  async function patchDescription() {
    const v = String(descInput || "").trim();
    if (!v) {
      setError("상품 설명은 비어있을 수 없습니다.");
      return;
    }
    setError("");
    setBusyKey("desc", true);
    try {
      // 문서에 오타가 있어 itemDesciption / itemDesciption 키도 같이 맞춤
      await ornablyAPI.patch(`/account/item/${itemPk}/itemDesciption`, { itemDesciption: v });
      setItem((p) => ({ ...p, itemDescription: v }));
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
    const url = URL.createObjectURL(file);
    setImagePreview(url);
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

      // 서버가 새 URL을 내려주면 그걸 쓰고, 아니면 새로고침
      await fetchItem();
    } catch (err) {
      setError(getApiErrorMessage(err, "상품 정보 수정 중 오류가 발생했습니다."));
    } finally {
      setBusyKey("image", false);
    }
  }

  const canShow = status === "success" && item;

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
          <p className="text-sm text-gray-500 mt-2">
            상품 정보 수정 / 재고 관리 / 이미지 변경을 할 수 있어요.
          </p>
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
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
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
          {/* 상단: 이름/PK + 이름 변경 버튼 (그림 느낌) */}
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

          {/* 메인 2열: 이미지 / 가격&재고 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* LEFT: 이미지 + 이미지 수정 */}
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
                {/* itemImageUrl 기준 */}
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

            {/* RIGHT: 가격 수정 + 재고 관리 */}
            <div className="space-y-5">
              {/* 가격 수정 */}
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
                <div className="mt-2 text-xs text-gray-500">* 음수/문자 입력은 자동으로 제거됩니다.</div>
              </SectionCard>

              {/* 재고 */}
              <SectionCard title="상품 재고 관리">
                <div className="rounded-2xl border border-gray-200 bg-white px-4 py-4">
                  <div className="text-xs font-bold text-gray-500">현재 재고</div>
                  <div className="mt-1 text-lg font-extrabold text-gray-900">
                    {Number(item.itemStock ?? 0).toLocaleString("ko-KR")}개
                  </div>
                </div>

                {/* 재고 등록(절대값) */}
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 items-end">
                  <div>
                    <div className="text-xs font-bold text-gray-600">재고 입력창 (재고를 이 값으로 설정)</div>
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

                {/* 재고 추가 */}
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 items-end">
                  <div>
                    <div className="text-xs font-bold text-gray-600">추가할 재고 개수 (현재 재고에 더함)</div>
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

                <div className="mt-3 text-xs text-gray-500">
                  * 서버 API는 <span className="font-semibold">itemStock(최종값)</span>만 받기 때문에, “재고 추가”는
                  현재 재고 + 입력값을 계산해서 전송합니다.
                </div>
              </SectionCard>
            </div>
          </div>

          {/* 상품 설명 + 수정하기 버튼 (그림 느낌) */}
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
            <div className="mt-2 text-xs text-gray-500">
              * 문서에 경로/필드명이 <span className="font-semibold">itemDesciption</span>으로 적혀 있어서 그대로 사용했습니다.
              (서버가 itemDescription이면 알려줘. 즉시 수정해줄게)
            </div>
          </SectionCard>

          {/* 리뷰 보기 */}
          <div className="flex items-center justify-start">
            <button
              type="button"
              onClick={() => navigate(`/admin/item/${item.itemPk}/review`)}
              className="rounded-2xl border border-gray-200 bg-white px-6 py-3 text-sm font-extrabold hover:bg-gray-50"
            >
              상품에 등록된 리뷰 보기
            </button>
          </div>

          <div className="text-xs text-gray-500">
            * 조회: <span className="font-semibold">GET /api/admin/item/manage/{`{itemPk}`}</span>
            <br />
            * 수정: <span className="font-semibold">PATCH /api/account/item/{`{itemPk}`}/itemName | itemPrice | itemStock | itemDesciption | itemImage</span>
          </div>
        </div>
      )}
    </div>
  );
}
