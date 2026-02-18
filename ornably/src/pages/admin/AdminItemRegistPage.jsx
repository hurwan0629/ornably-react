import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ornablyAPI from "../../lib/api";
import { Upload, X, ArrowLeft, Plus } from "lucide-react";

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

function clampInt(n, min, max) {
  const x = Number(n);
  if (Number.isNaN(x)) return min;
  return Math.max(min, Math.min(max, Math.trunc(x)));
}

function sanitizeNonNegInt(value, fallback = 0) {
  const s = String(value ?? "").replace(/[^\d]/g, "");
  if (!s) return fallback;
  const n = Number(s);
  if (Number.isNaN(n)) return fallback;
  return Math.max(0, Math.trunc(n));
}

// ===== 카테고리 (표시는 한글, 전송은 영문) =====
const CATEGORY_OPTIONS = ["TREE", "LIGHT", "BALL", "FIGURE", "WREATHS", "ETC"];
const CATEGORY_LABEL = {
  TREE: "트리",
  LIGHT: "전구",
  BALL: "볼",
  FIGURE: "피규어",
  WREATHS: "리스",
  ETC: "기타",
};

function Field({ label, hint, children }) {
  return (
    <div>
      <div className="text-xs font-bold text-gray-600">{label}</div>
      {hint ? <div className="text-xs text-red-600 mt-1">{hint}</div> : null}
      <div className="mt-2">{children}</div>
    </div>
  );
}

export default function AdminItemRegistPage() {
  const [successOpen, setSuccessOpen] = useState(false);
  const [createdItemPk, setCreatedItemPk] = useState(null); // 응답에 pk 있으면 저장


  const navigate = useNavigate();

  // 1) form 초기값을 숫자 -> 문자열로 (빈칸 가능)
  const [form, setForm] = useState({
    itemName: "",
    itemPrice: "",   // ✅ string
    itemStock: "",   // ✅ string
    itemCategory: "TREE",
    itemDescription: "",
  });

  // 2) 입력용 헬퍼: onChange는 "빈칸 or 숫자"만 허용 (검증/클램프 X)
  function sanitizeNumericInputAllowEmpty(v) {
    const raw = String(v ?? "");
    if (raw === "") return "";
    return raw.replace(/[^\d]/g, ""); // 숫자만 남김
  }

  // 3) onBlur에서만 정규화(클램프)
  function normalizeNumericOnBlur(v, max = 2_000_000_000) {
    if (v === "") return ""; // ✅ 빈칸은 그대로 둠(원하면 "0"으로 바꿔도 됨)
    return String(clampInt(Number(v), 0, max));
  }

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({}); // 서버 fieldErrors 대응 가능

  const canSubmit = useMemo(() => !submitting, [submitting]);

  function onPickImage(e) {
    const file = e.target.files?.[0] || null;
    setImageFile(file);
    setError("");
    setFieldErrors({});

    if (!file) {
      setImagePreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setImagePreview(url);
  }

  function removeImage() {
    setImageFile(null);
    setImagePreview("");
  }

  function validateClient() {
    const fe = {};

    const name = String(form.itemName || "").trim();
    if (!name) fe.itemName = "상품 이름을 입력해주세요.";

    const price = form.itemPrice === "" ? 0 : Number(form.itemPrice);
    if (Number.isNaN(price) || price < 0) fe.itemPrice = "가격은 0 이상의 숫자여야 합니다.";

    const stock = form.itemStock === "" ? 0 : Number(form.itemStock);
    if (Number.isNaN(stock) || stock < 0) fe.itemStock = "재고는 0 이상의 숫자여야 합니다.";

    if (!form.itemCategory) fe.itemCategory = "카테고리를 선택해주세요.";

    const desc = String(form.itemDescription || "").trim();
    if (!desc) fe.itemDescription = "상품 설명을 입력해주세요.";

    if (!imageFile) fe.itemImage = "상품 이미지를 등록해주세요.";

    setFieldErrors(fe);
    return Object.keys(fe).length === 0;
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    setFieldErrors({});

    if (!validateClient()) return;

    try {
      setSubmitting(true);

      const priceNum = clampInt(sanitizeNonNegInt(form.itemPrice, 0), 0, 2_000_000_000);
      const stockNum = clampInt(sanitizeNonNegInt(form.itemStock, 0), 0, 2_000_000_000);

      const fd = new FormData();
      fd.append("itemName", String(form.itemName).trim());
      fd.append("itemPrice", String(priceNum));
      fd.append("itemStock", String(stockNum));
      fd.append("itemCategory", form.itemCategory);
      fd.append("itemDescription", String(form.itemDescription).trim());
      fd.append("itemImage", imageFile);

      const res = await ornablyAPI.post("/admin/item", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // 응답 스펙이 문서에 없어서 성공 시 일반 처리
      const pk =
        res?.data?.itemPk ??
        res?.data?.item?.itemPk ??
        res?.data?.data?.itemPk ??
        null;

      setCreatedItemPk(pk);
      setSuccessOpen(true);
      return res;
    } catch (err) {
      const sc = err?.response?.status;
      const data = err?.response?.data;

      if (sc === 400) {
        setError(data?.message || "입력값을 확인해주세요.");
        if (data?.fieldErrors && typeof data.fieldErrors === "object") {
          setFieldErrors(data.fieldErrors);
        }
      } else if (sc === 401) {
        setError("로그인이 필요합니다.");
      } else if (sc === 403) {
        setError("관리자만 접근할 수 있는 요청입니다.");
      } else {
        setError(getApiErrorMessage(err, "상품 등록 중 오류가 발생했습니다."));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-w-0">
      {successOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setSuccessOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
              <div className="text-sm font-extrabold text-gray-900">등록 완료</div>
              <button
                type="button"
                onClick={() => setSuccessOpen(false)}
                className="rounded-lg px-3 py-1 text-sm font-semibold bg-gray-100 hover:bg-gray-200"
              >
                닫기
              </button>
            </div>

            <div className="px-5 py-5">
              <div className="text-sm text-gray-800 font-semibold">
                상품이 등록되었습니다.
              </div>
              {createdItemPk && (
                <div className="mt-2 text-xs text-gray-500">
                  itemPk: <span className="font-semibold text-gray-800">{createdItemPk}</span>
                </div>
              )}

              <div className="mt-5 flex flex-col sm:flex-row gap-2 sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setSuccessOpen(false);
                    navigate("/admin/item");
                  }}
                  className="inline-flex justify-center rounded-xl bg-violet-600 text-white px-4 py-2 text-sm font-extrabold hover:bg-violet-700"
                >
                  목록으로 이동
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
            <h2 className="text-xl font-extrabold tracking-tight text-gray-900">상품 등록</h2>
          </div>
          <p className="text-sm text-gray-500 mt-2">상품 정보를 입력하고 이미지를 등록하세요.</p>
        </div>
      </div>

      {error && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={submit} className="mt-5 space-y-5">
        {/* 상단 2열: 이미지 / 핵심 정보 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* LEFT: Image */}
          <div className="rounded-[28px] bg-white/60 border border-white/50 backdrop-blur-md shadow-[0_6px_30px_rgba(17,24,39,0.06)] overflow-hidden">
            <div className="px-5 sm:px-6 py-4 border-b border-gray-200/60 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-extrabold text-gray-900">이미지</div>
                <div className="text-xs text-gray-500 mt-1">상품 대표 이미지</div>
              </div>

              <div className="flex items-center gap-2">
                <label className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-50 cursor-pointer">
                  <Upload className="h-4 w-4" />
                  이미지 선택
                  <input type="file" accept="image/*" className="hidden" onChange={onPickImage} />
                </label>

                {imageFile && (
                  <button
                    type="button"
                    onClick={removeImage}
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-gray-50"
                  >
                    <X className="h-4 w-4" />
                    제거
                  </button>
                )}
              </div>
            </div>

            <div className="p-4 sm:p-6">
              <div className={cx("rounded-2xl border bg-white overflow-hidden", fieldErrors.itemImage ? "border-red-300" : "border-gray-200")}>
                {imagePreview ? (
                  <img src={imagePreview} alt="preview" className="w-full h-[260px] sm:h-[340px] object-cover" />
                ) : (
                  <div className="w-full h-[260px] sm:h-[340px] flex items-center justify-center text-gray-400 text-sm">
                    이미지 미리보기
                  </div>
                )}
              </div>

              {fieldErrors.itemImage && <div className="mt-2 text-xs text-red-600">{fieldErrors.itemImage}</div>}

              <div className="mt-3 text-sm text-gray-700 truncate">
                {imageFile ? `선택됨: ${imageFile.name}` : "선택된 파일 없음"}
              </div>
            </div>
          </div>

          {/* RIGHT: Info */}
          <div className="rounded-[28px] bg-white/60 border border-white/50 backdrop-blur-md shadow-[0_6px_30px_rgba(17,24,39,0.06)] p-5 sm:p-6">
            <div className="text-sm font-extrabold text-gray-900">상품 정보</div>

            <div className="mt-4 grid grid-cols-1 gap-4">
              <Field label="상품 이름" hint={fieldErrors.itemName}>
                <input
                  value={form.itemName}
                  onChange={(e) => setForm((p) => ({ ...p, itemName: e.target.value }))}
                  className={cx(
                    "w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:ring",
                    fieldErrors.itemName ? "border-red-300" : "border-gray-200"
                  )}
                  placeholder="예) 크리스마스 트리 150cm"
                />
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="가격" hint={fieldErrors.itemPrice}>
                  <input
                    type="text"                 // ✅ number 말고 text 추천 (빈칸/삭제 UX가 훨씬 안정적)
                    inputMode="numeric"
                    value={form.itemPrice}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        itemPrice: sanitizeNumericInputAllowEmpty(e.target.value),
                      }))
                    }
                    onBlur={() =>
                      setForm((p) => ({
                        ...p,
                        itemPrice: normalizeNumericOnBlur(p.itemPrice),
                      }))
                    }
                    className={cx(
                      "w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:ring",
                      fieldErrors.itemPrice ? "border-red-300" : "border-gray-200"
                    )}
                    placeholder="0"
                  />
                </Field>

                <Field label="재고" hint={fieldErrors.itemStock}>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.itemStock}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        itemStock: sanitizeNumericInputAllowEmpty(e.target.value),
                      }))
                    }
                    onBlur={() =>
                      setForm((p) => ({
                        ...p,
                        itemStock: normalizeNumericOnBlur(p.itemStock),
                      }))
                    }
                    className={cx(
                      "w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:ring",
                      fieldErrors.itemStock ? "border-red-300" : "border-gray-200"
                    )}
                    placeholder="0"
                  />
                </Field>
              </div>

              <Field label="카테고리" hint={fieldErrors.itemCategory}>
                <select
                  value={form.itemCategory}
                  onChange={(e) => setForm((p) => ({ ...p, itemCategory: e.target.value }))}
                  className={cx(
                    "w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:ring",
                    fieldErrors.itemCategory ? "border-red-300" : "border-gray-200"
                  )}
                >
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_LABEL[c] ?? c}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </div>
        </div>

        {/* 하단: 상세 설명 */}
        <div className="rounded-[28px] bg-white/60 border border-white/50 backdrop-blur-md shadow-[0_6px_30px_rgba(17,24,39,0.06)] p-5 sm:p-6">
          <div className="text-sm font-extrabold text-gray-900">상세설명</div>
          <div className="text-xs text-gray-500 mt-1">상품 상세/주의사항 등을 입력하세요.</div>

          <div className="mt-4">
            <textarea
              value={form.itemDescription}
              onChange={(e) => setForm((p) => ({ ...p, itemDescription: e.target.value }))}
              className={cx(
                "w-full rounded-2xl border bg-white px-4 py-3 text-sm outline-none focus:ring min-h-[180px]",
                fieldErrors.itemDescription ? "border-red-300" : "border-gray-200"
              )}
              placeholder="상세 설명을 입력해주세요."
            />
            {fieldErrors.itemDescription && <div className="mt-2 text-xs text-red-600">{fieldErrors.itemDescription}</div>}
          </div>
        </div>

        {/* Submit 버튼 (우하단 느낌) */}
        <div className="flex items-center justify-end">
          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded-2xl bg-violet-600 text-white px-8 py-4 text-lg font-extrabold hover:bg-violet-700 disabled:opacity-50 inline-flex items-center gap-2 shadow-sm"

          >
            <Plus className="h-5 w-5" />
            상품 등록하기
          </button>
        </div>
      </form>
    </div>
  );
}
