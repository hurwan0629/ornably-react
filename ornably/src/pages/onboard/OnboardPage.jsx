// src/pages/onboard/OnboardPage.jsx
import { useEffect, useMemo, useState } from "react";
import Container from "../../components/common/Container";
import { useAuth } from "../../auth/AuthContext"; // 프로젝트 경로에 맞게 유지
import ornablyAPI from "../../lib/api"

function normalizePhone11(v) {
  return String(v || "").replace(/[^\d]/g, "").slice(0, 11);
}

function apiErrorMessage(e, fallback = "요청 처리 중 오류가 발생했습니다.") {
  const msg = e?.response?.data?.message;
  return msg || fallback;
}

function loadDaumPostcodeScript() {
  return new Promise((resolve, reject) => {
    if (window?.daum?.Postcode) return resolve();

    const existing = document.querySelector('script[data-daum-postcode="true"]');
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Daum postcode script load failed")));
      return;
    }

    const script = document.createElement("script");
    script.src = "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
    script.async = true;
    script.dataset.daumPostcode = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Daum postcode script load failed"));
    document.head.appendChild(script);
  });
}


export default function OnboardPage() {
  
  const [successOpen, setSuccessOpen] = useState(false);

  const { role } = useAuth();

  // role 기반: GOOGLE은 이름/이메일 잠금
  const isGoogle = role === "GOOGLE";
  const isKakao = role === "KAKAO";
  const isNaver = role === "NAVER";

  const providerLabel = useMemo(() => {
    if (isGoogle) return "구글";
    if (isKakao) return "카카오";
    if (isNaver) return "네이버";
    return "소셜";
  }, [isGoogle, isKakao, isNaver]);

  // 서버에서 받은 소셜 기본 정보(ONBOARD)
  const [base, setBase] = useState({
    accountId: "",
    accountName: "",
    accountEmail: "",
  });

  const lockName = !!String(base.accountName ?? "").trim();
  const lockEmail = !!String(base.accountEmail ?? "").trim();

  // 입력 폼
  const [form, setForm] = useState({
    accountName: "",
    accountEmail: "",
    accountPhone: "",
    accountEventOptIn: false,
    addressName: "",
    addressPostalCode: "",
    addressRegion: "",
    addressDetail: "",
  });

  // 전화 인증
  const [phoneStep, setPhoneStep] = useState({
    sent: false,
    verified: false,
  });
  const [verificationCode, setVerificationCode] = useState("");
  const [accountKey, setAccountKey] = useState(null);

  // UI 상태
  const [loading, setLoading] = useState(true);
  const [pendingSend, setPendingSend] = useState(false);
  const [pendingCheck, setPendingCheck] = useState(false);
  const [pendingSignup, setPendingSignup] = useState(false);
  const [error, setError] = useState("");

  // ====== handlers ======
  const openDaumAddress = async () => {
    setError("");
    try {
      await loadDaumPostcodeScript();

      new window.daum.Postcode({
        oncomplete: (data) => {
          // 기본주소: 도로명 우선, 없으면 지번
          const address = data.roadAddress || data.jibunAddress || "";

          setForm((prev) => ({
            ...prev,
            addressPostalCode: data.zonecode || "",
            addressRegion: address,
            // 상세주소는 사용자가 입력하는 게 안전해서 비우거나 유지
            addressDetail: prev.addressDetail || "",
          }));

          // 상세주소 입력을 유도하려면 여기서 포커스 주는 것도 가능
          // detailRef.current?.focus();
        },
      }).open();
    } catch (e) {
      setError("주소 검색 로딩에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    }
  };

  
  const setField = (key) => (e) => {
    const value =
      e?.target?.type === "checkbox" ? e.target.checked : e.target.value;

    // 전화번호는 숫자 11자리로 정규화
    if (key === "accountPhone") {
      const p = normalizePhone11(value);
      setForm((prev) => ({ ...prev, accountPhone: p }));
      setError("");
      // 전화번호가 바뀌면 인증 상태는 리셋하는게 안전
      setPhoneStep({ sent: false, verified: false });
      return;
    }

    setForm((prev) => ({ ...prev, [key]: value }));
    setError("");
  };

  const handleCancelSocial = () => {
    // 요구사항 그대로: 소셜 로그인 그만두기
    window.location.href = `http://localhost:8088/logout`;
  };

  const loadOnboardBase = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await ornablyAPI.get(`/onboard/account/onboard`);

      const nextBase = {
        accountId: res?.data?.accountId ?? "",
        accountName: res?.data?.accountName ?? "",
        accountEmail: res?.data?.accountEmail ?? "",
      };
      setBase(nextBase);

      // GOOGLE이면 서버값을 기본으로 채우고 잠금(수정 불가)
      // KAKAO/NAVER는 서버가 null일 수 있으니 빈값 허용(사용자 입력)
      setForm((prev) => ({
        ...prev,
        accountName: nextBase.accountName || prev.accountName,
        accountEmail: nextBase.accountEmail || prev.accountEmail,
      }));
    } catch (e) {
      setError(apiErrorMessage(e, "회원 정보를 불러오지 못했습니다."));
    } finally {
      setLoading(false);
    }
  };

  const sendPhoneCode = async () => {
    if (pendingSend) return;

    const phone = normalizePhone11(form.accountPhone);
    if (phone.length !== 11) {
      setError("전화번호 11자리를 입력해 주세요. (예: 01012345678)");
      return;
    }

    setPendingSend(true);
    setError("");
    try {
      const res = await ornablyAPI.post(
        `/onboard/phone-verifications/send-code`,
        { accountPhone: phone }
      );

      if (res?.data?.success) {
        setPhoneStep({ sent: true, verified: false });
        setAccountKey(res?.data?.accountKey);
      } else {
        setError("인증번호 발송에 실패했습니다.");
      }
    } catch (e) {
      setError(apiErrorMessage(e, "인증번호 발송에 실패했습니다."));
    } finally {
      setPendingSend(false);
    }
  };

  const checkPhoneCode = async () => {
    if (pendingCheck) return;

    const code = String(verificationCode || "").trim();
    if (!code) {
      setError("인증번호를 입력해 주세요.");
      return;
    }

    setPendingCheck(true);
    setError("");
    try {
      const res = await ornablyAPI.post(
        `/onboard/phone-verifications/check-code`,
        { accountVerificationCode: code, accountKey: accountKey },
      );

      if (res?.data?.success) {
        setPhoneStep({ sent: true, verified: true });
      } else {
        setError("인증번호 확인에 실패했습니다.");
      }
    } catch (e) {
      setError(apiErrorMessage(e, "인증번호 확인에 실패했습니다."));
    } finally {
      setPendingCheck(false);
    }
  };

  const signup = async () => {
    if (pendingSignup) return;

    // 기본 검증
    const payload = {
      account: {
        accountId: base.accountId,
        accountName: String(form.accountName || "").trim(),
        accountEmail: String(form.accountEmail || "").trim(),
        accountPhone: normalizePhone11(form.accountPhone),
        accountEventOptIn: !!form.accountEventOptIn,
      },
      address: {
        addressName: String(form.addressName || "").trim(),
        addressPostalCode: String(form.addressPostalCode || "").trim(),
        addressRegion: String(form.addressRegion || "").trim(),
        addressDetail: String(form.addressDetail || "").trim(),
      },
    };

    if (!payload.account.accountId) {
      setError("소셜 계정 정보를 불러오지 못했습니다. 다시 로그인 해주세요.");
      return;
    }

    // GOOGLE은 이름/이메일이 기본으로 들어오지만, 혹시 비어있으면 막기
    // KAKAO/NAVER도 필수 입력
    if (!payload.account.accountName) return setError("이름을 입력해 주세요.");
    if (!payload.account.accountEmail) return setError("이메일을 입력해 주세요.");
    if (payload.account.accountPhone.length !== 11)
      return setError("전화번호 11자리를 입력해 주세요.");
    /*
    if (!phoneStep.verified)
      return setError("전화번호 인증을 완료해 주세요.");
    */
    if (!payload.address.addressName) return setError("배송지 이름을 입력해 주세요.");
    if (!payload.address.addressPostalCode)
      return setError("우편번호를 입력해 주세요.");
    if (!payload.address.addressRegion) return setError("주소(지역)를 입력해 주세요.");
    if (!payload.address.addressDetail) return setError("상세주소를 입력해 주세요.");

    setPendingSignup(true);
    setError("");

    try {
      await ornablyAPI.post(`/onboard/account/onboard/signup`, payload);

      // ✅ 성공 모달 오픈 (확인 누르면 로그아웃 → 다시 로그인)
      setSuccessOpen(true);
    } catch (e) {
      // fieldErrors가 있으면 콘솔에서라도 확인 가능하게
      const fieldErrors = e?.response?.data?.fieldErrors;
      if (fieldErrors) console.log("fieldErrors:", fieldErrors);
      setError(apiErrorMessage(e, "회원가입에 실패했습니다."));
    } finally {
      setPendingSignup(false);
    }
  };

  // ====== effects ======
  useEffect(() => {
    loadOnboardBase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // GOOGLE이면 name/email은 서버 기본값을 “항상” 따르도록(원하면 이 블록 삭제 가능)
  useEffect(() => {
    if (!isGoogle) return;
    setForm((prev) => ({
      ...prev,
      accountName: base.accountName ?? "",
      accountEmail: base.accountEmail ?? "",
    }));
  }, [isGoogle, base.accountName, base.accountEmail]);

  // ====== UI ======
  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#f6f4ff]">
      <Container>
        <div className="mx-auto max-w-2xl py-10">
          <div className="rounded-[28px] bg-white/60 backdrop-blur-md shadow-[0_10px_45px_rgba(17,24,39,0.10)] border border-white/50">
            <div className="px-7 py-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-xl font-extrabold tracking-tight text-gray-900">
                    {providerLabel} 회원가입
                  </h1>
                  <p className="mt-1 text-sm text-gray-500">
                    추가 정보를 입력하고 가입을 완료해 주세요.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCancelSocial}
                  className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  소셜 로그인 그만두기
                </button>
              </div>

              {loading ? (
                <div className="mt-8 rounded-2xl border border-gray-200 bg-white px-4 py-4 text-sm text-gray-600">
                  정보를 불러오는 중...
                </div>
              ) : (
                <>
                  {error && (
                    <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {error}
                    </div>
                  )}

                  {/* ===== 기본 정보 ===== */}
                  <section className="mt-6">
                    <h2 className="text-sm font-semibold text-gray-900">
                      기본 정보
                    </h2>

                    <div className="mt-3 grid grid-cols-1 gap-3">
                      <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
                        <div className="text-xs text-gray-500">계정 ID</div>
                        <div className="mt-1 text-sm font-medium text-gray-900">
                          {base.accountId || "-"}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-600">
                            이름
                          </label>
                          <input
                            value={form.accountName}
                            onChange={setField("accountName")}
                            disabled={lockName}
                            placeholder="이름"
                            className={[
                              "mt-1 w-full rounded-2xl border px-4 py-3 text-sm outline-none",
                              "border-gray-200 bg-white focus:border-gray-300 focus:ring-2 focus:ring-black/5",
                              lockName ? "opacity-70 cursor-not-allowed" : ""
                            ].join(" ")}
                          />
                        </div>

                        <div>
                          <label className="text-xs text-gray-600">
                            이메일
                          </label>
                          <input
                            value={form.accountEmail}
                            onChange={setField("accountEmail")}
                            disabled={lockEmail} // GOOGLE은 기본값 잠금
                            placeholder="이메일"
                            className={[
                              "mt-1 w-full rounded-2xl border px-4 py-3 text-sm outline-none",
                              "border-gray-200 bg-white focus:border-gray-300 focus:ring-2 focus:ring-black/5",
                              lockEmail ? "opacity-70 cursor-not-allowed" : ""
                            ].join(" ")}
                          />
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* ===== 전화번호 인증 ===== */}
                  <section className="mt-8">
                    <h2 className="text-sm font-semibold text-gray-900">
                      전화번호 인증
                    </h2>

                    <div className="mt-3 grid grid-cols-1 gap-3">
                      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
                        <div>
                          <label className="text-xs text-gray-600">
                            전화번호(11자리)
                          </label>
                          <input
                            value={form.accountPhone}
                            onChange={setField("accountPhone")}
                            placeholder="01012345678"
                            inputMode="numeric"
                            className="mt-1 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-gray-300 focus:ring-2 focus:ring-black/5"
                          />
                          <p className="mt-1 text-xs text-gray-400">
                            숫자만 입력해 주세요. 하이픈(-) 없이 11자리
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={sendPhoneCode}
                          disabled={pendingSend}
                          className="mt-5 md:mt-6 h-[46px] rounded-2xl bg-black px-4 text-sm font-semibold text-white hover:bg-gray-900 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {pendingSend ? "전송 중..." : "인증번호 받기"}
                        </button>
                      </div>

                      {phoneStep.sent && (
                        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
                          <div>
                            <label className="text-xs text-gray-600">
                              인증번호
                            </label>
                            <input
                              value={verificationCode}
                              onChange={(e) => {
                                setVerificationCode(e.target.value);
                                setError("");
                              }}
                              placeholder="인증번호 입력"
                              className="mt-1 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-gray-300 focus:ring-2 focus:ring-black/5"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={checkPhoneCode}
                            disabled={pendingCheck || phoneStep.verified}
                            className="mt-5 md:mt-6 h-[46px] rounded-2xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-900 hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {phoneStep.verified
                              ? "인증 완료"
                              : pendingCheck
                              ? "확인 중..."
                              : "인증 확인"}
                          </button>
                        </div>
                      )}
                    </div>
                  </section>

                  {/* ===== 주소/동의 ===== */}
                  <section className="mt-8">
                    <h2 className="text-sm font-semibold text-gray-900">
                      주소 정보
                    </h2>

                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-600">배송지 이름</label>
                        <input
                          value={form.addressName}
                          onChange={setField("addressName")}
                          placeholder="집 / 회사"
                          className="mt-1 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-gray-300 focus:ring-2 focus:ring-black/5"
                        />
                      </div>

                      {/* 우편번호 + 검색버튼 */}
                      <div>
                        <label className="text-xs text-gray-600">우편번호</label>
                        <div className="mt-1 grid grid-cols-[1fr_auto] gap-2">
                          <input
                            value={form.addressPostalCode}
                            readOnly
                            placeholder="주소 검색으로 입력"
                            className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none"
                          />
                          <button
                            type="button"
                            onClick={openDaumAddress}
                            className="h-[46px] rounded-2xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-900 hover:bg-gray-50"
                          >
                            주소 검색
                          </button>
                        </div>
                      </div>

                      {/* 주소(지역) - 검색 결과 */}
                      <div className="md:col-span-2">
                        <label className="text-xs text-gray-600">주소(지역)</label>
                        <input
                          value={form.addressRegion}
                          readOnly
                          placeholder="주소 검색을 눌러 선택해 주세요"
                          className="mt-1 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none"
                        />
                      </div>

                      {/* 상세주소 - 직접 입력 */}
                      <div className="md:col-span-2">
                        <label className="text-xs text-gray-600">상세주소</label>
                        <input
                          value={form.addressDetail}
                          onChange={setField("addressDetail")}
                          placeholder="101동 1001호"
                          className="mt-1 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-gray-300 focus:ring-2 focus:ring-black/5"
                        />
                      </div>
                    </div>


                    <label className="mt-5 flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={form.accountEventOptIn}
                        onChange={setField("accountEventOptIn")}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      이벤트/혜택 알림 수신에 동의합니다.
                    </label>
                  </section>

                  {/* ===== 가입 버튼 ===== */}
                  <div className="mt-8">
                    <button
                      type="button"
                      onClick={signup}
                      disabled={pendingSignup}
                      className="w-full rounded-2xl bg-black px-4 py-3 text-sm font-semibold text-white hover:bg-gray-900 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {pendingSignup ? "가입 처리 중..." : "회원가입 하기"}
                    </button>

                    <p className="mt-3 text-xs text-gray-400 leading-relaxed">
                      {isGoogle
                        ? "구글 계정의 기본 정보(이름/이메일)는 수정할 수 없습니다."
                        : "이름/이메일은 필수 입력입니다."}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      {/* ✅ 온보딩 회원가입 성공 모달 */}
      {successOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => {
              setSuccessOpen(false);
              window.location.href = `http://localhost:8088/logout`;
            }}
          />

          {/* modal */}
          <div className="relative mx-4 w-full max-w-sm rounded-3xl bg-white p-6 shadow-[0_15px_60px_rgba(0,0,0,0.25)]">
            <h3 className="text-lg font-semibold text-gray-900">가입 완료</h3>
            <p className="mt-2 text-sm text-gray-600 leading-relaxed">
              {providerLabel} 회원가입이 완료되었습니다.
              <br />
              다시 로그인 후 이용해주세요.
            </p>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setSuccessOpen(false);
                  window.location.href = `http://localhost:8088/logout`;
                }}
                className="h-11 w-full rounded-2xl bg-black px-4 text-sm font-semibold text-white hover:bg-gray-900"
              >
                다시 로그인하기
              </button>
            </div>
          </div>
        </div>
      )}

      </Container>
    </div>
  );
}
