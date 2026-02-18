// src/pages/user/AddressListPage.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ornablyAPI from "../../lib/api";
import Container from "../../components/common/Container";

const API = "http://localhost:8088";

/* ===================== utils ===================== */
function getApiErrorMessage(err) {
  return (
    err?.response?.data?.message ||
    err?.response?.data?.error?.message ||
    err?.message ||
    "요청 중 오류가 발생했습니다."
  );
}

/* ===================== Modal ===================== */
function Modal({ open, title, children, onClose, actions }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} aria-hidden />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-3xl border border-zinc-100 bg-white shadow-xl">
          <div className="p-5">
            <div className="text-lg font-extrabold text-zinc-900">{title}</div>
            <div className="mt-2 text-sm text-zinc-600 leading-relaxed">{children}</div>
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

/* ===================== UI atoms ===================== */
function SoftCard({ children, className = "" }) {
  return (
    <div className={["rounded-3xl border bg-white shadow-sm", className].join(" ")}>
      {children}
    </div>
  );
}
function Pill({ children, tone = "default" }) {
  const cls =
    tone === "violet"
      ? "border-violet-200 bg-violet-50 text-violet-700"
      : tone === "zinc"
      ? "border-zinc-200 bg-zinc-50 text-zinc-700"
      : "border-zinc-200 bg-white text-zinc-700";

  return (
    <span className={["inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold", cls].join(" ")}>
      {children}
    </span>
  );
}

export default function AddressListPage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [addresses, setAddresses] = useState([]);

  const [busyPk, setBusyPk] = useState(null); // patch/delete 진행 중인 주소 pk
  const [confirm, setConfirm] = useState({
    open: false,
    type: "", // "delete" | "default"
    address: null,
  });

  const count = addresses?.length ?? 0;

  const canAddMore = count < 10;
  const deleteGloballyDisabled = count <= 1; // "배송지가 1개 이하면 삭제 불가"

  const fetchAddresses = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await ornablyAPI.get(`/user/address/me`);
      setAddresses(res?.data?.addressDatas ?? []);
    } catch (err) {
      const status = err?.response?.status;
      // 404: 등록된 배송지 정보가 없습니다. → UX 상 빈 목록으로 처리
      if (status === 404) setAddresses([]);
      else setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAddresses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openDeleteConfirm = (address) => {
    setConfirm({ open: true, type: "delete", address });
  };

  const openDefaultConfirm = (address) => {
    setConfirm({ open: true, type: "default", address });
  };

  const closeConfirm = () => setConfirm({ open: false, type: "", address: null });

  const handleDelete = async (addressPk) => {
    if (!addressPk) return;
    setBusyPk(addressPk);
    setError("");
    try {
      await ornablyAPI.delete(`/user/address/${addressPk}`);
      // 낙관적 업데이트
      setAddresses((prev) => prev.filter((a) => a.addressPk !== addressPk));
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setBusyPk(null);
    }
  };

  const handleSetDefault = async (addressPk) => {
    if (!addressPk) return;
    setBusyPk(addressPk);
    setError("");
    try {
      await ornablyAPI.patch(`/user/address/${addressPk}`);
      // 서버가 기본값을 바꿨다는 전제 → 프론트에서 반영
      setAddresses((prev) =>
        prev.map((a) => ({
          ...a,
          addressIsDefault: a.addressPk === addressPk,
        }))
      );
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setBusyPk(null);
    }
  };

  const sorted = useMemo(() => {
    const list = Array.isArray(addresses) ? [...addresses] : [];
    // 기본 배송지 우선
    list.sort((a, b) => Number(!!b.addressIsDefault) - Number(!!a.addressIsDefault));
    return list;
  }, [addresses]);

  return (
    <div className="bg-white">
      <Container>
        <div className="py-8">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-2xl font-extrabold text-zinc-900">배송지 목록</div>
              <div className="mt-1 text-sm text-zinc-600">
                등록된 배송지: <span className="font-bold text-zinc-900">{count}</span> / 10
              </div>
            </div>

            <button
              onClick={() => navigate("/account")}
              className="h-10 rounded-2xl border bg-white px-4 text-sm font-extrabold text-zinc-800 hover:border-zinc-300"
            >
              마이페이지
            </button>
          </div>

          {error && (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
              {error}
            </div>
          )}

          <div className="mt-6 space-y-3">
            {loading ? (
              <SoftCard>
                <div className="p-5">
                  <div className="h-4 w-40 animate-pulse rounded bg-zinc-100" />
                  <div className="mt-3 h-3 w-full animate-pulse rounded bg-zinc-100" />
                  <div className="mt-2 h-3 w-2/3 animate-pulse rounded bg-zinc-100" />
                  <div className="mt-5 flex gap-2">
                    <div className="h-10 w-24 animate-pulse rounded-2xl bg-zinc-100" />
                    <div className="h-10 w-24 animate-pulse rounded-2xl bg-zinc-100" />
                  </div>
                </div>
              </SoftCard>
            ) : sorted.length === 0 ? (
              <SoftCard>
                <div className="p-6">
                  <div className="text-lg font-extrabold text-zinc-900">등록된 배송지가 없어요</div>
                  <div className="mt-2 text-sm text-zinc-600">
                    배송지를 등록하면 결제 시 더 빠르게 선택할 수 있어요.
                  </div>
                  <div className="mt-5">
                    <button
                      onClick={() => navigate("/account/address/new")}
                      className="h-11 rounded-2xl bg-violet-600 px-5 text-sm font-extrabold text-white hover:bg-violet-700"
                    >
                      배송지 등록하기
                    </button>
                  </div>
                </div>
              </SoftCard>
            ) : (
              sorted.map((a) => {
                const pk = a?.addressPk;
                const isDefault = !!a?.addressIsDefault;

                // ✅ 삭제 제한 규칙
                // 1) 배송지가 1개 이하면 삭제 불가
                // 2) 기본 배송지는 삭제 불가
                const deleteDisabled = deleteGloballyDisabled || isDefault || busyPk === pk;

                // ✅ 기본 배송지 설정 버튼은 기본 배송지이면 비활성
                const defaultDisabled = isDefault || busyPk === pk;

                const postal = a?.addrssPostalCode ?? a?.addressPostalCode ?? ""; // 문서 오타 대비
                const region = a?.addressRegion ?? "";
                const detail = a?.addressDetail ?? "";
                const addressLine = [postal && `(${postal})`, region, detail].filter(Boolean).join(" ");

                return (
                  <SoftCard key={pk} className={isDefault ? "border-violet-200" : ""}>
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="truncate text-base font-extrabold text-zinc-900">
                              {a?.addressName ?? "배송지"}
                            </div>
                            {isDefault ? <Pill tone="violet">기본 배송지</Pill> : <Pill tone="zinc">일반</Pill>}
                          </div>

                          <div className="mt-2 text-sm text-zinc-700 leading-relaxed">{addressLine || "-"}</div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openDefaultConfirm(a)}
                            disabled={defaultDisabled}
                            className={[
                              "h-10 rounded-2xl px-4 text-sm font-extrabold",
                              defaultDisabled
                                ? "cursor-not-allowed border bg-zinc-50 text-zinc-400"
                                : "border bg-white text-zinc-800 hover:border-zinc-300",
                            ].join(" ")}
                            title={isDefault ? "이미 기본 배송지입니다." : "기본 배송지로 설정"}
                          >
                            기본으로
                          </button>

                          <button
                            onClick={() => openDeleteConfirm(a)}
                            disabled={deleteDisabled}
                            className={[
                              "h-10 rounded-2xl px-4 text-sm font-extrabold",
                              deleteDisabled
                                ? "cursor-not-allowed border bg-zinc-50 text-zinc-400"
                                : "border border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300",
                            ].join(" ")}
                            title={
                              deleteGloballyDisabled
                                ? "배송지가 1개 이하면 삭제할 수 없습니다."
                                : isDefault
                                ? "기본 배송지는 삭제할 수 없습니다."
                                : "배송지 삭제"
                            }
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                    </div>
                  </SoftCard>
                );
              })
            )}
          </div>

          {/* 하단 CTA */}
          <div className="mt-8">
            <SoftCard className="bg-zinc-50">
              <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm font-extrabold text-zinc-900">배송지 추가</div>
                  <div className="mt-1 text-xs text-zinc-600">
                    {canAddMore ? "최대 10개까지 등록할 수 있어요." : "배송지는 최대 10개까지 등록 가능합니다."}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={fetchAddresses}
                    className="h-11 rounded-2xl border bg-white px-5 text-sm font-extrabold text-zinc-800 hover:border-zinc-300"
                  >
                    새로고침
                  </button>

                  <button
                    onClick={() => navigate("/account/address/new")}
                    disabled={!canAddMore}
                    className={[
                      "h-11 rounded-2xl px-5 text-sm font-extrabold",
                      canAddMore
                        ? "bg-violet-600 text-white hover:bg-violet-700"
                        : "cursor-not-allowed bg-zinc-200 text-zinc-500",
                    ].join(" ")}
                    title={canAddMore ? "배송지 등록 페이지로 이동" : "배송지는 최대 10개까지 등록 가능합니다."}
                  >
                    배송지 등록하기
                  </button>
                </div>
              </div>
            </SoftCard>
          </div>
        </div>
      </Container>

      {/* Confirm Modal */}
      <Modal
        open={confirm.open}
        title={confirm.type === "delete" ? "배송지를 삭제할까요?" : "기본 배송지로 설정할까요?"}
        onClose={closeConfirm}
        actions={
          <>
            <button
              onClick={closeConfirm}
              className="h-10 rounded-2xl border bg-white px-4 text-sm font-extrabold text-zinc-800 hover:border-zinc-300"
            >
              취소
            </button>

            {confirm.type === "delete" ? (
              <button
                onClick={async () => {
                  const pk = confirm?.address?.addressPk;
                  closeConfirm();
                  await handleDelete(pk);
                }}
                className="h-10 rounded-2xl bg-rose-600 px-4 text-sm font-extrabold text-white hover:bg-rose-700"
              >
                삭제
              </button>
            ) : (
              <button
                onClick={async () => {
                  const pk = confirm?.address?.addressPk;
                  closeConfirm();
                  await handleSetDefault(pk);
                }}
                className="h-10 rounded-2xl bg-violet-600 px-4 text-sm font-extrabold text-white hover:bg-violet-700"
              >
                설정
              </button>
            )}
          </>
        }
      >
        <div className="mt-1">
          <div className="text-sm font-extrabold text-zinc-900">
            {confirm?.address?.addressName ?? "-"}
          </div>
          <div className="mt-1 text-sm text-zinc-600">
            {[
              confirm?.address?.addrssPostalCode && `(${confirm?.address?.addrssPostalCode})`,
              confirm?.address?.addressRegion,
              confirm?.address?.addressDetail,
            ]
              .filter(Boolean)
              .join(" ") || "-"}
          </div>

          {confirm.type === "delete" && (
            <div className="mt-3 text-xs text-zinc-500">
              기본 배송지이거나 배송지가 1개뿐이면 삭제할 수 없습니다.
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
