import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ornablyAPI from "../../lib/api"; // 프로젝트에서 쓰는 axios 인스턴스(있다면)
import { Trash2, Search, RotateCcw, Plus, Pencil } from "lucide-react";
import { createPortal } from "react-dom";

function cx(...c) {
  return c.filter(Boolean).join(" ");
}

function toNumOrEmpty(v) {
  const s = String(v ?? "").trim();
  if (!s) return "";
  const n = Number(s);
  return Number.isNaN(n) ? "" : n;
}

function getApiErrorMessage(err, fallback = "요청 중 오류가 발생했습니다.") {
  return (
    err?.response?.data?.message ||
    err?.response?.data?.error?.message ||
    err?.message ||
    fallback
  );
}

const CATEGORY_OPTIONS = [
  { value: "ALL", label: "전체" },
  { value: "TREE", label: "TREE" },
  { value: "LIGHT", label: "LIGHT" },
  { value: "BALL", label: "BALL" },
  { value: "FIGURE", label: "FIGURE" },
  { value: "WREATHS", label: "WREATHS" },
  { value: "ETC", label: "ETC" },
];

export default function AdminItemSearchPage() {
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // { itemPk, itemName } 정도 저장

  const navigate = useNavigate();

  const didInit = useRef(false);

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    search();
  }, []);

  const [form, setForm] = useState({
    itemPk: "",
    itemName: "",
    itemCategory: "ALL",
    itemPriceMin: "",
    itemPriceMax: "",
    itemRegistDateStart: "",
    itemRegistDateEnd: "",
  });

  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("idle"); // idle | loading | success | empty | error
  const [error, setError] = useState("");

  const [deleteBusyPk, setDeleteBusyPk] = useState(null);

  const queryParams = useMemo(() => {
    const p = {};

    const itemPk = toNumOrEmpty(form.itemPk);
    const itemPriceMin = toNumOrEmpty(form.itemPriceMin);
    const itemPriceMax = toNumOrEmpty(form.itemPriceMax);

    if (itemPk !== "") p.itemPk = itemPk;
    if (String(form.itemName || "").trim()) p.itemName = String(form.itemName).trim();
    if (form.itemCategory && form.itemCategory !== "ALL") p.itemCategory = form.itemCategory;
    if (itemPriceMin !== "") p.itemPriceMin = itemPriceMin;
    if (itemPriceMax !== "") p.itemPriceMax = itemPriceMax;

    if (form.itemRegistDateStart) p.itemRegistDateStart = form.itemRegistDateStart; // YYYY-MM-DD
    if (form.itemRegistDateEnd) p.itemRegistDateEnd = form.itemRegistDateEnd;

    return p;
  }, [form]);

  function onChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function openDeleteModal(it) {
    console.log("openDeleteModal", it);
    setDeleteTarget({ itemPk: it.itemPk, itemName: it.itemName });
    setDeleteModalOpen(true);
  }

  function closeDeleteModal() {
    setDeleteModalOpen(false);
    setDeleteTarget(null);
  }


  function reset() {
    setForm({
      itemPk: "",
      itemName: "",
      itemCategory: "ALL",
      itemPriceMin: "",
      itemPriceMax: "",
      itemRegistDateStart: "",
      itemRegistDateEnd: "",
    });
    setItems([]);
    setStatus("idle");
    setError("");
  }

  async function search(e) {
    e?.preventDefault?.();
    setError("");
    setStatus("loading");

    try {
      const res = await ornablyAPI.get("/admin/item/search", { params: queryParams });
      const list = res?.data?.itemDatas ?? [];
      if (!Array.isArray(list) || list.length === 0) {
        setItems([]);
        setStatus("empty");
        return;
      }
      setItems(list);
      setStatus("success");
    } catch (err) {
      // 상태코드별 문구를 API 문서 기준으로 최대한 맞춤
      const sc = err?.response?.status;
      if (sc === 400) {
        setError(getApiErrorMessage(err, "요청 값이 올바르지 않습니다."));
      } else if (sc === 401) {
        setError("로그인이 필요합니다.");
      } else if (sc === 403) {
        setError("관리자만 접근할 수 있는 요청입니다.");
      } else if (sc === 404) {
        setError("검색 조건에 해당하는 상품 정보가 존재하지 않습니다.");
      } else {
        setError(getApiErrorMessage(err, "상품 검색 중 오류가 발생했습니다."));
      }
      setItems([]);
      setStatus("error");
    }
  }

  async function deleteItem(itemPk) {
    try {
      setDeleteBusyPk(itemPk);
      setError("");

      await ornablyAPI.delete(`/admin/item/${itemPk}`);

      setItems((prev) => {
        const next = prev.filter((it) => Number(it.itemPk) !== Number(itemPk));
        setStatus(next.length === 0 ? "empty" : "success");
        return next;
      });

      closeDeleteModal();
    } catch (err) {
      const sc = err?.response?.status;
      if (sc === 400) setError(getApiErrorMessage(err, "요청 값이 올바르지 않습니다."));
      else if (sc === 401) setError("로그인이 필요합니다.");
      else if (sc === 403) setError("관리자만 접근할 수 있는 요청입니다.");
      else if (sc === 404) setError("해당 상품을 찾을 수 없습니다.");
      else if (sc === 409) setError(getApiErrorMessage(err, "주문 이력이 존재하는 상품은 삭제할 수 없습니다."));
      else setError(getApiErrorMessage(err, "상품 삭제 중 오류가 발생했습니다."));
      setStatus("error");
    } finally {
      setDeleteBusyPk(null);
    }
  } 

  
  return (
    <div className="min-w-0">
      {deleteModalOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4"
            role="dialog"
            aria-modal="true"
            onClick={closeDeleteModal}
          >
            <div
              className="w-full max-w-md rounded-2xl bg-white shadow-xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
                <div className="text-sm font-extrabold text-gray-900">상품 삭제</div>
                <button
                  type="button"
                  onClick={closeDeleteModal}
                  className="rounded-lg px-3 py-1 text-sm font-semibold bg-gray-100 hover:bg-gray-200"
                >
                  닫기
                </button>
              </div>

              <div className="px-5 py-5">
                <div className="text-sm text-gray-800">
                  아래 상품을 <span className="font-extrabold text-red-600">삭제</span>할까요?
                </div>

                <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                  <div className="text-xs text-gray-500">itemPk</div>
                  <div className="text-sm font-extrabold text-gray-900">
                    {deleteTarget?.itemPk ?? "-"}
                  </div>

                  <div className="mt-2 text-xs text-gray-500">상품명</div>
                  <div className="text-sm font-semibold text-gray-900 truncate">
                    {deleteTarget?.itemName ?? "-"}
                  </div>

                  <div className="mt-3 text-xs text-red-600">
                    * 품절 처리가 아니라 데이터가 실제로 삭제됩니다.
                  </div>
                </div>

                <div className="mt-5 flex flex-col sm:flex-row gap-2 sm:justify-end">
                  <button
                    type="button"
                    onClick={closeDeleteModal}
                    className="inline-flex justify-center rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-50"
                  >
                    취소
                  </button>

                  <button
                    type="button"
                    disabled={deleteTarget?.itemPk == null || deleteBusyPk === deleteTarget?.itemPk}
                    onClick={() => deleteItem(deleteTarget.itemPk)}
                    className={cx(
                      "inline-flex justify-center rounded-xl px-4 py-2 text-sm font-extrabold",
                      "bg-red-600 text-white hover:bg-red-700",
                      deleteBusyPk === deleteTarget?.itemPk && "opacity-50"
                    )}
                  >
                    {deleteBusyPk === deleteTarget?.itemPk ? "삭제 중..." : "삭제하기"}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}


      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-gray-900">상품 검색</h2>
          <p className="text-sm text-gray-500 mt-1">
            조건을 입력하고 검색하세요. (미입력 값은 모두 포함)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate("/admin/item/new")}
            className="inline-flex items-center gap-2 rounded-xl bg-gray-900 text-white px-4 py-2 text-sm font-semibold hover:bg-gray-800"
          >
            <Plus className="h-4 w-4" />
            상품 등록
          </button>
        </div>
      </div>

      {/* Search Form */}
      <form onSubmit={search} className="mt-5 rounded-2xl bg-white/60 border border-white/50 p-4 sm:p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">상품 PK</label>
            <input
              name="itemPk"
              value={form.itemPk}
              onChange={onChange}
              placeholder="예) 12"
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring"
              inputMode="numeric"
            />
          </div>

          <div className="lg:col-span-1">
            <label className="block text-xs font-bold text-gray-600 mb-1">상품명</label>
            <input
              name="itemName"
              value={form.itemName}
              onChange={onChange}
              placeholder="부분 검색"
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">카테고리</label>
            <select
              name="itemCategory"
              value={form.itemCategory}
              onChange={onChange}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring"
            >
              {CATEGORY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="block text-xs font-bold text-gray-600 mb-1">가격 Min</label>
              <input
                name="itemPriceMin"
                value={form.itemPriceMin}
                onChange={onChange}
                placeholder="0"
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring"
                inputMode="numeric"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold text-gray-600 mb-1">가격 Max</label>
              <input
                name="itemPriceMax"
                value={form.itemPriceMax}
                onChange={onChange}
                placeholder="999999"
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring"
                inputMode="numeric"
              />
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-gray-600 mb-1">등록일 범위</label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                name="itemRegistDateStart"
                value={form.itemRegistDateStart}
                onChange={onChange}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring"
              />
              <span className="text-gray-400 text-sm">~</span>
              <input
                type="date"
                name="itemRegistDateEnd"
                value={form.itemRegistDateEnd}
                onChange={onChange}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring"
              />
            </div>
          </div>

          <div className="sm:col-span-2 lg:col-span-2 flex items-end gap-2">
            <button
              type="submit"
              disabled={status === "loading"}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 text-white px-4 py-2 text-sm font-semibold hover:bg-gray-800 disabled:opacity-50 w-full sm:w-auto"
            >
              <Search className="h-4 w-4" />
              {status === "loading" ? "검색 중..." : "검색"}
            </button>

            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-50 w-full sm:w-auto"
            >
              <RotateCcw className="h-4 w-4" />
              초기화
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
      </form>

      {/* Result */}
      <div className="mt-5">
        {status === "idle" && (
          <div className="rounded-2xl bg-white/50 border border-white/50 p-6 text-sm text-gray-600">
            검색 조건을 입력한 뒤 <span className="font-semibold">검색</span>을 눌러주세요.
          </div>
        )}

        {status === "loading" && (
          <div className="rounded-2xl bg-white/50 border border-white/50 p-6 text-sm text-gray-600">
            불러오는 중...
          </div>
        )}

        {status === "empty" && (
          <div className="rounded-2xl bg-white/50 border border-white/50 p-6 text-sm text-gray-600">
            검색 결과가 없습니다.
          </div>
        )}

        {(status === "success" || (status === "error" && items.length > 0)) && (
          <div className="rounded-2xl bg-white/60 border border-white/50 overflow-hidden">
            <div className="px-4 sm:px-5 py-3 flex items-center justify-between border-b border-gray-200/60">
              <div className="text-sm font-bold text-gray-800">
                결과 <span className="text-gray-500">({items.length})</span>
              </div>
            </div>

            <div className="divide-y divide-gray-200/60">
              {items.map((it) => (
                <div key={it.itemPk} className="p-4 sm:p-5 flex gap-4 items-center">
                  {/* Thumb */}
                  <div className="h-16 w-16 rounded-xl bg-white border border-gray-200 overflow-hidden flex-shrink-0">
                    {it.itemImageUrl ? (
                      <img
                        src={it.itemImageUrl}
                        alt={it.itemName}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-xs text-gray-400">
                        NO IMAGE
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-500">#{it.itemPk}</span>
                      <div className="font-extrabold text-gray-900 truncate">{it.itemName}</div>
                    </div>
                    <div className="mt-1 text-sm text-gray-600 flex flex-wrap gap-x-4 gap-y-1">
                      <span>
                        가격:{" "}
                        <span className="font-semibold text-gray-900">
                          {Number(it.itemPrice ?? 0).toLocaleString("ko-KR")}원
                        </span>
                      </span>
                      <span>등록일: <span className="font-semibold">{it.itemRegistDate ?? "-"}</span></span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => navigate(`/admin/item/${it.itemPk}`)}
                      className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-gray-50"
                      title="상세/수정"
                    >
                      <Pencil className="h-4 w-4" />
                      <span className="hidden sm:inline">상세</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => openDeleteModal(it)}
                      disabled={deleteBusyPk === it.itemPk}
                      className={cx(
                        "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold",
                        "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
                        deleteBusyPk === it.itemPk && "opacity-50"
                      )}
                      title="삭제"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="hidden sm:inline">
                        {deleteBusyPk === it.itemPk ? "삭제 중..." : "삭제"}
                      </span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
