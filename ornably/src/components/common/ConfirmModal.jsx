// src/components/common/ConfirmModal.jsx
export default function ConfirmModal({
  open,
  title = "확인",
  message = "",
  confirmText = "확인",
  cancelText = "취소",
  onConfirm,
  onCancel,
  danger = false,
  disabled = false,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* overlay */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => !disabled && onCancel?.()}
      />

      {/* modal */}
      <div className="relative w-full max-w-md rounded-[24px] bg-white p-6 shadow-xl">
        <h3 className="text-lg font-extrabold text-gray-900">
          {title}
        </h3>

        {message && (
          <p className="mt-2 text-sm text-gray-600 whitespace-pre-line">
            {message}
          </p>
        )}

        <div className="mt-6 flex gap-2">
          {cancelText && (
            <button
              type="button"
              onClick={onCancel}
              disabled={disabled}
              className={[
                "flex-1 h-12 rounded-full font-semibold border transition",
                disabled
                  ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                  : "bg-white text-gray-800 border-gray-200 hover:bg-gray-50",
              ].join(" ")}
            >
              {cancelText}
            </button>
          )}

          <button
            type="button"
            onClick={onConfirm}
            disabled={disabled}
            className={[
              "flex-1 h-12 rounded-full font-semibold shadow-sm transition",
              disabled
                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                : danger
                ? "bg-red-600 text-white hover:opacity-90"
                : "bg-black text-white hover:opacity-90",
            ].join(" ")}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
