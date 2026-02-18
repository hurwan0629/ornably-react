// src/pages/admin/AdminAccountManagePage.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Container from "../../components/common/Container";
import ConfirmModal from "../../components/common/ConfirmModal";
import ornablyAPI from "../../lib/api";
import { getApiMessage } from "../../lib/error";

/* ===================== utils ===================== */
function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function formatMoneyKRW(n) {
  const num = Number(n ?? 0);
  if (Number.isNaN(num)) return "-";
  return num.toLocaleString("ko-KR") + "원";
}

function formatDateYYYYMMDD(s) {
  if (!s) return "-";
  return String(s);
}

function roleLabel(role) {
  const r = String(role ?? "").toUpperCase();
  if (!r) return "-";
  if (r === "ALL") return "전체";
  if (r === "ADMIN") return "관리자";
  if (r === "USER") return "일반회원";
  if (r === "LOCAL") return "로컬회원";
  if (r === "KAKAO") return "카카오";
  if (r === "NAVER") return "네이버";
  if (r === "GOOGLE") return "구글";
  return r;
}

function starText(star) {
  const s = Number(star ?? 0);
  if (Number.isNaN(s) || s <= 0) return "-";
  const clamped = Math.max(1, Math.min(5, s));
  // 서버가 2~10 이라는 전제가 섞여있어서 안전하게 표기만
  return `${clamped} / 5`;
}

/* ===================== page ===================== */
export default function AdminAccountManagePage() {
  const navigate = useNavigate();
  const params = useParams();
  const accountPk = Number(params.accountPk);

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const [account, setAccount] = useState(null);
  const [reviews, setReviews] = useState([]);

  const [deleteTarget, setDeleteTarget] = useState(null); // review object
  const [deleting, setDeleting] = useState(false);

  const safeAccountName = useMemo(() => {
    if (!account) return "-";
    return account?.accountName ?? "-";
  }, [account]);

  const safeAccountId = useMemo(() => {
    if (!account) return "-";
    // null이면 탈퇴회원
    return account?.accountId ?? "(탈퇴한 회원)";
  }, [account]);

  async function fetchAccount() {
    if (!Number.isFinite(accountPk) || accountPk <= 0) {
      setErrorMsg("회원 PK가 올바르지 않습니다.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMsg("");
    try {
      const res = await ornablyAPI.get(`/admin/account/${accountPk}`);
      const data = res?.data ?? {};
      setAccount({
        accountPk: data.accountPk,
        accountId: data.accountId,
        accountName: data.accountName,
        accountDate: data.accountDate,
        accountRole: data.accountRole,
        accountEventOptIn: data.accountEventOptIn,
        accountTotalAmount: data.accountTotalAmount,
      });
      setReviews(Array.isArray(data.reviewDatas) ? data.reviewDatas : []);
    } catch (e) {
      setErrorMsg(getApiMessage(e, "회원 상세 조회 중 오류가 발생했습니다."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAccount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountPk]);

  async function handleDeleteReview() {
    if (!deleteTarget?.reviewPk) return;
    setDeleting(true);
    try {
      await ornablyAPI.delete(`/admin/review/${deleteTarget.reviewPk}`);
      // 낙관적 업데이트(리스트에서 제거)
      setReviews((prev) => prev.filter((r) => r.reviewPk !== deleteTarget.reviewPk));
      setDeleteTarget(null);
    } catch (e) {
      alert(getApiMessage(e, "리뷰 삭제 중 오류가 발생했습니다."));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Container>
      <div className="py-6">
        {/* 상단 바 */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="h-10 px-4 rounded-full border border-gray-200 bg-white hover:bg-gray-50 text-sm font-semibold"
            >
              ← 뒤로
            </button>
            <div className="text-lg font-extrabold text-gray-900">
              회원 관리
            </div>
          </div>

          <button
            type="button"
            onClick={fetchAccount}
            className="h-10 px-4 rounded-full bg-black text-white text-sm font-semibold hover:opacity-90"
          >
            새로고침
          </button>
        </div>

        {/* 로딩/에러 */}
        {loading && (
          <div className="mt-6 rounded-[24px] bg-white border border-gray-200 p-6">
            <div className="text-sm text-gray-600">불러오는 중…</div>
          </div>
        )}

        {!loading && errorMsg && (
          <div className="mt-6 rounded-[24px] bg-white border border-red-200 p-6">
            <div className="text-sm font-semibold text-red-600">오류</div>
            <div className="mt-1 text-sm text-gray-700 whitespace-pre-line">{errorMsg}</div>
          </div>
        )}

        {!loading && !errorMsg && account && (
          <div className="mt-6 space-y-6">
            {/* 상단 2칸 (이름 / PK) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-[24px] bg-white border border-gray-200 p-6">
                <div className="text-xs text-gray-500 font-semibold">회원 이름</div>
                <div className="mt-2 text-2xl font-extrabold text-gray-900">
                  {safeAccountName}
                </div>
              </div>

              <div className="rounded-[24px] bg-white border border-gray-200 p-6">
                <div className="text-xs text-gray-500 font-semibold">회원 PK</div>
                <div className="mt-2 text-2xl font-extrabold text-gray-900">
                  {account.accountPk}
                </div>
              </div>
            </div>

            {/* 메타 정보 박스 */}
            <div className="rounded-[24px] bg-white border border-gray-200 p-6">
              <div className="flex items-center justify-between gap-3">
                <div className="text-base font-extrabold text-gray-900">
                  {safeAccountName} 메타정보
                </div>
                <div
                  className={cx(
                    "text-xs px-3 py-1 rounded-full font-bold border",
                    account.accountId
                      ? "border-gray-200 text-gray-700 bg-gray-50"
                      : "border-orange-200 text-orange-700 bg-orange-50"
                  )}
                  title={account.accountId ? "활성 회원" : "탈퇴 회원"}
                >
                  {account.accountId ? "활성" : "탈퇴"}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <MetaRow label="아이디" value={safeAccountId} />
                <MetaRow label="총 구매 금액" value={formatMoneyKRW(account.accountTotalAmount)} />
                <MetaRow label="가입일" value={formatDateYYYYMMDD(account.accountDate)} />
                <MetaRow label="회원유형" value={roleLabel(account.accountRole)} />
              </div>

              <div className="mt-4 text-xs text-gray-500">
                이벤트 수신 동의:{" "}
                <span className="font-semibold text-gray-800">
                  {account.accountEventOptIn ? "동의" : "미동의"}
                </span>
              </div>
            </div>

            {/* 리뷰 목록 */}
            <div className="rounded-[24px] bg-white border border-gray-200 p-6">
              <div className="flex items-center justify-between gap-3">
                <div className="text-base font-extrabold text-gray-900">
                  {safeAccountName}이 쓴 리뷰 목록
                </div>
                <div className="text-xs text-gray-500">
                  총 {reviews.length}개
                </div>
              </div>

              <div className="mt-4 rounded-[20px] border border-gray-200 bg-gray-50 p-4">
                <div className="max-h-[360px] overflow-y-auto pr-2">
                  {reviews.length === 0 ? (
                    <div className="py-10 text-center text-sm text-gray-600">
                      작성된 리뷰가 없습니다.
                    </div>
                  ) : (
                    <ul className="space-y-3">
                      {reviews.map((r) => (
                        <li
                          key={r.reviewPk}
                          className="rounded-[18px] bg-white border border-gray-200 p-4"
                        >
                          <div className="flex items-start gap-4">
                            {/* 이미지 (있으면) */}
                            <div className="shrink-0">
                              <div className="w-16 h-16 rounded-[14px] bg-gray-100 border border-gray-200 overflow-hidden">
                                {r.reviewImageUrl ? (
                                  <img
                                    src={r.reviewImageUrl}
                                    alt=""
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                  />
                                ) : null}
                              </div>
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                <div className="text-sm font-extrabold text-gray-900 truncate">
                                  {r.reviewTitle || "(제목 없음)"}
                                </div>
                                <span className="text-xs text-gray-500">
                                  #{r.reviewPk}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {formatDateYYYYMMDD(r.reviewDate)}
                                </span>
                                <span className="text-xs px-2 py-0.5 rounded-full border border-gray-200 bg-gray-50 text-gray-700 font-semibold">
                                  별점 {starText(r.reviewStar)}
                                </span>
                              </div>

                              {r.reviewContent ? (
                                <p className="mt-2 text-sm text-gray-700 line-clamp-2 whitespace-pre-line">
                                  {r.reviewContent}
                                </p>
                              ) : (
                                <p className="mt-2 text-sm text-gray-400">
                                  (내용 없음)
                                </p>
                              )}
                            </div>

                            <div className="shrink-0 flex flex-col items-end gap-2">
                              <button
                                type="button"
                                onClick={() => setDeleteTarget(r)}
                                className="h-10 px-4 rounded-full bg-orange-500 text-white font-extrabold text-sm hover:opacity-90"
                              >
                                리뷰 삭제
                              </button>

                              {/* 필요하면 “리뷰 상세로 이동” 같은 버튼으로 바꿀 수 있음 */}
                              {/* <button ...>리뷰 보기</button> */}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <ConfirmModal
        open={!!deleteTarget}
        title="리뷰를 삭제할까요?"
        message={
          deleteTarget
            ? `리뷰PK: ${deleteTarget.reviewPk}\n제목: ${deleteTarget.reviewTitle || "(제목 없음)"}\n삭제하면 복구할 수 없습니다.`
            : ""
        }
        confirmText={deleting ? "삭제 중..." : "삭제"}
        cancelText="취소"
        danger
        disabled={deleting}
        onCancel={() => !deleting && setDeleteTarget(null)}
        onConfirm={handleDeleteReview}
      />
    </Container>
  );
}

function MetaRow({ label, value }) {
  return (
    <div className="rounded-[18px] bg-white border border-gray-200 p-4">
      <div className="text-xs text-gray-500 font-semibold">{label}</div>
      <div className="mt-1 text-sm font-extrabold text-gray-900 break-words">
        {value}
      </div>
    </div>
  );
}
