// src/pages/user/WithdrawPage.jsx
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext"; // 프로젝트 경로에 맞게 수정
import ConfirmModal from "../../components/common/ConfirmModal";
import ornablyAPI from "../../lib/api";
import axios from "axios";


function getApiErrorMessage(e, fallback) {
  return (
    e?.response?.data?.message ||
    e?.message ||
    fallback ||
    "요청 처리 중 오류가 발생했습니다."
  );
}

export default function WithdrawPage() {
  const navigate = useNavigate();
  const { role, loadMe } = useAuth(); // { role } 가정 (LOCAL / GOOGLE / KAKAO / NAVER 등)
  const isLocal = role === "LOCAL";


  const [form, setForm] = useState({
    pw: "",
    pw2: "",
    socialPhrase: "",
    agree1: false, // 개인정보 파기/복구불가
    agree2: false, // 게시물 유지 여부 안내 동의
    agree3: false, // 최종 탈퇴 동의
  });

  const [pwCheckStatus, setPwCheckStatus] = useState("idle"); // idle | checking | ok | fail
  const [pwCorrect, setPwCorrect] = useState(false);
  
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [doneOpen, setDoneOpen] = useState(false);

  const REQUIRED_PHRASE = "탈퇴 동의합니다";

  const pwMismatch = isLocal && form.pw && form.pw2 && form.pw !== form.pw2;

  const socialPhraseOk = !isLocal
    ? form.socialPhrase.trim() === REQUIRED_PHRASE
    : true;

  const agreementsOk = form.agree1 && form.agree2 && form.agree3;

  const localPwOk = isLocal ? !pwMismatch && form.pw.length > 0 && pwCorrect : true;

  const canOpenConfirm = useMemo(() => {
    if (!agreementsOk) return false;
    if (!socialPhraseOk) return false;
    if (isLocal && !localPwOk) return false;
    if (busy) return false;
    return true;
  }, [agreementsOk, socialPhraseOk, isLocal, localPwOk, busy]);

  const checkPassword = async () => {
    if (!isLocal) return;
    if (!form.pw || pwMismatch) return;

    try {
      setPwCheckStatus("checking");
      setErrorMsg("");

      const res = await ornablyAPI.post(
        "/user/account/check-password",
        { accountPassword: form.pw }
      );

      const correct = !!res?.data?.correct;
      setPwCorrect(correct);
      setPwCheckStatus(correct ? "ok" : "fail");
      if (!correct) setErrorMsg("비밀번호가 일치하지 않습니다.");
    } catch (e) {
      setPwCorrect(false);
      setPwCheckStatus("fail");
      setErrorMsg(getApiErrorMessage(e, "비밀번호 확인 중 오류가 발생했습니다."));
    }
  };

  const requestWithdraw = async () => {
    try {
      setBusy(true);
      setErrorMsg("");

      await ornablyAPI.delete("/user/account/withdraw", {
        withCredentials: true,
      });

      // ✅ 최종확인 모달은 닫고, 완료 모달 오픈
      setConfirmOpen(false);
      setDoneOpen(true);

    } catch (e) {
      setErrorMsg(getApiErrorMessage(e, "회원 탈퇴 처리 중 오류가 발생했습니다."));
    } finally {
      setBusy(false);
      setConfirmOpen(false);
    }
  };

  return (
    <div className="w-full bg-[#f6f4ff] min-h-[calc(100vh-80px)]">
      <div className="mx-auto max-w-3xl px-4 py-6">
        <div className="rounded-[28px] bg-white/60 backdrop-blur-md shadow-[0_6px_30px_rgba(17,24,39,0.08)] p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900">회원 탈퇴</h1>
              <p className="mt-1 text-sm text-gray-500">
                탈퇴 전 안내를 확인하고 동의가 필요합니다.
              </p>
            </div>
            <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700">
              {isLocal ? "로컬 회원" : "소셜 회원"}
            </span>
          </div>

          {/* 안내 */}
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <div className="font-semibold">탈퇴 시 유의사항</div>
            <ul className="mt-2 list-disc pl-5 space-y-1 text-amber-900/90">
              <li>개인정보는 파기되며, 탈퇴 후 복구할 수 없습니다.</li>
              <li>주문/결제 내역 등 일부 정보는 관련 법령에 따라 보관될 수 있습니다.</li>
              <li>작성한 게시물/리뷰는 서비스 정책에 따라 유지될 수 있습니다.</li>
            </ul>
          </div>

          {errorMsg && (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMsg}
            </div>
          )}

          <div className="mt-6 space-y-4">
            {/* LOCAL: 비밀번호 확인 */}
            {isLocal && (
              <section className="rounded-2xl bg-white shadow-sm border border-gray-100 p-5">
                <h2 className="text-base font-bold text-gray-900">비밀번호 확인</h2>

                <div className="mt-3 grid grid-cols-1 gap-3">
                  <div>
                    <label className="text-sm font-semibold text-gray-800">
                      비밀번호
                    </label>
                    <input
                      type="password"
                      value={form.pw}
                      onChange={(e) => {
                        setForm((p) => ({ ...p, pw: e.target.value }));
                        setPwCorrect(false);
                        setPwCheckStatus("idle");
                      }}
                      className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#7c3aed]"
                      placeholder="비밀번호 입력"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-gray-800">
                      비밀번호 확인
                    </label>
                    <input
                      type="password"
                      value={form.pw2}
                      onChange={(e) => {
                        setForm((p) => ({ ...p, pw2: e.target.value }));
                        setPwCorrect(false);
                        setPwCheckStatus("idle");
                      }}
                      className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#7c3aed]"
                      placeholder="비밀번호 다시 입력"
                    />
                    {pwMismatch && (
                      <div className="mt-2 text-xs text-red-600">
                        비밀번호가 일치하지 않습니다.
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={checkPassword}
                      disabled={!form.pw || pwMismatch || pwCheckStatus === "checking"}
                      className={[
                        "h-11 px-5 rounded-full font-semibold shadow-sm transition",
                        !form.pw || pwMismatch || pwCheckStatus === "checking"
                          ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                          : "bg-[#7c3aed] text-white hover:opacity-90",
                      ].join(" ")}
                    >
                      {pwCheckStatus === "checking" ? "확인 중..." : "비밀번호 확인"}
                    </button>

                    {pwCheckStatus === "ok" && (
                      <span className="text-sm font-semibold text-green-600">
                        확인 완료
                      </span>
                    )}
                    {pwCheckStatus === "fail" && (
                      <span className="text-sm font-semibold text-red-600">
                        확인 실패
                      </span>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* SOCIAL: 문구 따라쓰기 */}
            {!isLocal && (
              <section className="rounded-2xl bg-white shadow-sm border border-gray-100 p-5">
                <h2 className="text-base font-bold text-gray-900">탈퇴 확인 문구</h2>
                <p className="mt-2 text-sm text-gray-600">
                  아래 문구를 정확히 입력해주세요.
                </p>

                <div className="mt-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-800">
                  {REQUIRED_PHRASE}
                </div>

                <input
                  value={form.socialPhrase}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, socialPhrase: e.target.value }))
                  }
                  className="mt-3 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#7c3aed]"
                  placeholder="문구를 따라 입력하세요"
                />

                {!socialPhraseOk && form.socialPhrase.length > 0 && (
                  <div className="mt-2 text-xs text-red-600">
                    문구가 정확하지 않습니다.
                  </div>
                )}
              </section>
            )}

            {/* 동의 체크박스 */}
            <section className="rounded-2xl bg-white shadow-sm border border-gray-100 p-5">
              <h2 className="text-base font-bold text-gray-900">탈퇴 동의</h2>

              <div className="mt-3 space-y-3 text-sm text-gray-800">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.agree1}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, agree1: e.target.checked }))
                    }
                    className="mt-1"
                  />
                  <span>
                    개인정보 파기 및 <b>복구 불가</b> 안내를 확인했고 동의합니다.
                  </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.agree2}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, agree2: e.target.checked }))
                    }
                    className="mt-1"
                  />
                  <span>
                    탈퇴 후에도 게시물/리뷰가 <b>유지될 수 있음</b>을 확인했고
                    동의합니다.
                  </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.agree3}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, agree3: e.target.checked }))
                    }
                    className="mt-1"
                  />
                  <span>
                    위 내용을 모두 확인했으며 <b>회원 탈퇴</b>에 동의합니다.
                  </span>
                </label>
              </div>

              <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={() => setConfirmOpen(true)}
                  disabled={!canOpenConfirm}
                  className={[
                    "h-12 w-full sm:w-auto px-6 rounded-full font-semibold shadow-sm transition",
                    canOpenConfirm
                      ? "bg-red-600 text-white hover:opacity-90"
                      : "bg-gray-200 text-gray-500 cursor-not-allowed",
                  ].join(" ")}
                >
                  {busy ? "처리 중..." : "탈퇴하기"}
                </button>

                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="h-12 w-full sm:w-auto px-6 rounded-full font-semibold border border-gray-200 bg-white text-gray-800 hover:bg-gray-50"
                >
                  취소
                </button>
              </div>

              {!agreementsOk && (
                <div className="mt-3 text-xs text-gray-500">
                  * 탈퇴를 진행하려면 위 동의 항목을 모두 체크해야 합니다.
                </div>
              )}
            </section>
          </div>
        </div>
      </div>

      {/* 최종 확인 모달 */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => !busy && setConfirmOpen(false)}
          />
          <div className="relative w-full max-w-md rounded-[24px] bg-white p-6 shadow-xl">
            <h3 className="text-lg font-extrabold text-gray-900">정말 탈퇴할까요?</h3>
            <p className="mt-2 text-sm text-gray-600 leading-relaxed">
              탈퇴 후에는 계정을 복구할 수 없습니다. <br />
              진행하시려면 아래 버튼을 눌러주세요.
            </p>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => !busy && setConfirmOpen(false)}
                disabled={busy}
                className={[
                  "flex-1 h-12 rounded-full font-semibold border transition",
                  busy
                    ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                    : "bg-white text-gray-800 border-gray-200 hover:bg-gray-50",
                ].join(" ")}
              >
                취소
              </button>

              <button
                type="button"
                onClick={requestWithdraw}
                disabled={busy}
                className={[
                  "flex-1 h-12 rounded-full font-semibold shadow-sm transition",
                  busy
                    ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                    : "bg-red-600 text-white hover:opacity-90",
                ].join(" ")}
              >
                {busy ? "탈퇴 처리 중..." : "탈퇴 확정"}
              </button>
            </div>

            <div className="mt-3 text-xs text-gray-400">
              * 탈퇴 확정 시 즉시 처리됩니다.
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={doneOpen}
        title="회원 탈퇴 완료"
        message={"계정이 정상적으로 삭제되었습니다.\n메인페이지로 이동합니다."}
        cancelText={null}
        confirmText="확인"
        onConfirm={() => {
          setDoneOpen(false);
        
          // ✅ 1) 먼저 Public(메인)으로 이동해서 Guard 403을 피함
          navigate("/", { replace: true });
        
          // ✅ 2) 그 다음 auth 상태 갱신 (세션 만료/삭제 반영)
          setTimeout(() => {
            axios.post("http://localhost:8088/logout", {}, { withCredentials: true })
            .finally(() => {
              loadMe(); // 로컬 auth 상태 정리
            });
          }, 0);
        }}
      />
    </div>
  );
}
