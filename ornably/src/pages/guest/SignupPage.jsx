// src/pages/guest/SignupPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import ornablyAPI from "../../lib/api";
import { useNavigate, Link } from "react-router-dom";
import ornably from "../../../images/ornably.png"

/* ===================== utils ===================== */
function formatMMSS(totalSec) {
  const m = String(Math.floor(totalSec / 60)).padStart(2, "0");
  const s = String(totalSec % 60).padStart(2, "0");
  return `${m}:${s}`;
}

function parseServerMessage(err) {
  const msg = err?.response?.data?.message;
  if (typeof msg === "string" && msg.trim()) return msg;
  return "요청 처리 중 오류가 발생했습니다.";
}

function normalizePhone11(v) {
  return String(v ?? "").replace(/\D/g, "").slice(0, 11);
}

/* ===================== regex rules ===================== */
const RE = {
  // 4~20자: 영문/숫자/_(언더스코어)만
  id: /^[a-zA-Z0-9_]{4,20}$/,

  // 8~20자: 영문 + 숫자 + 특수문자 각각 1개 이상
  password: /^(?=.*[A-Za-z])(?=.*\d)(?=.*[~!@#$%^&*()_\-+=\[\]{};:'",.<>/?\\|]).{8,20}$/,

  // 이메일 기본 형식
  email: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,

  // 전화번호: 010xxxxxxxx (총 11자리)
  phone010: /^010\d{8}$/,
};

/* ===================== validators ('' = OK) ===================== */
function validateId(v) {
  const x = String(v ?? "").trim();
  if (!x) return "아이디를 입력해 주세요.";
  if (!RE.id.test(x)) return "아이디는 4~20자, 영문/숫자/_(언더스코어)만 가능합니다.";
  return "";
}

function validatePassword(v) {
  const x = String(v ?? "");
  if (!x) return "비밀번호를 입력해 주세요.";
  if (!RE.password.test(x))
    return "비밀번호는 8~20자, 영문/숫자/특수문자를 각각 1개 이상 포함해야 합니다.";
  return "";
}

function validateEmail(v) {
  const x = String(v ?? "").trim();
  if (!x) return "이메일을 입력해 주세요.";
  if (!RE.email.test(x)) return "이메일 형식이 올바르지 않습니다.";
  return "";
}

function validatePhone010(v) {
  const phone = normalizePhone11(v);
  if (!phone) return ""; // 입력 전엔 경고 안 띄우는 UX를 위해 빈 값은 OK 취급(blur 로직에서 제어)
  if (!RE.phone010.test(phone)) return "전화번호는 010xxxxxxxx 형식(총 11자리)이어야 합니다.";
  return "";
}

export default function SignupPage() {
  const nav = useNavigate();

  // ====== form ======
  const [accountId, setAccountId] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountPassword, setAccountPassword] = useState("");
  const [accountPassword2, setAccountPassword2] = useState("");
  const [accountPhone, setAccountPhone] = useState("");
  const [accountEmail, setAccountEmail] = useState("");

  // address
  const [addressName, setAddressName] = useState("");
  const [addressPostalCode, setAddressPostalCode] = useState("");
  const [addressRegion, setAddressRegion] = useState("");
  const [addressDetail, setAddressDetail] = useState("");

  const [accountEventOptIn, setAccountEventOptIn] = useState(false);

  // ====== id duplicate check ======
  const [idChecked, setIdChecked] = useState(false);
  const [idDuplicated, setIdDuplicated] = useState(null); // true/false/null
  const [idCheckMsg, setIdCheckMsg] = useState("");

  // ====== phone verification ======
  const [verificationCode, setVerificationCode] = useState("");
  const [codeChecked, setCodeChecked] = useState(false);
  const [codeCheckMsg, setCodeCheckMsg] = useState("");
  const [accountKey, setAccountKey] = useState(null);

  const [codeSent, setCodeSent] = useState(false);
  const [codeSendMsg, setCodeSendMsg] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);

  const [cooldownSec, setCooldownSec] = useState(0);
  const timerRef = useRef(null);

  // ====== ui state ======
  const [submitting, setSubmitting] = useState(false);
  const [topMsg, setTopMsg] = useState("");
  const [successOpen, setSuccessOpen] = useState(false);

  // ====== blur(터치) 상태: blur 된 뒤에만 정규식 경고 노출 ======
  const [touched, setTouched] = useState({
    accountId: false,
    accountPassword: false,
    accountEmail: false,
    accountPhone: false,
  });

  const onBlurTouch = (key) => () => setTouched((p) => ({ ...p, [key]: true }));

  // ====== regex messages (blur 이후에만 노출) ======
  const idRuleMsg = useMemo(() => (touched.accountId ? validateId(accountId) : ""), [touched.accountId, accountId]);
  const pwRuleMsg = useMemo(
    () => (touched.accountPassword ? validatePassword(accountPassword) : ""),
    [touched.accountPassword, accountPassword]
  );
  const emailRuleMsg = useMemo(
    () => (touched.accountEmail ? validateEmail(accountEmail) : ""),
    [touched.accountEmail, accountEmail]
  );
  const phoneRuleMsg = useMemo(
    () => (touched.accountPhone ? validatePhone010(accountPhone) : ""),
    [touched.accountPhone, accountPhone]
  );

  const pwMatchMsg = useMemo(() => {
    if (!accountPassword2) return "";
    return accountPassword === accountPassword2 ? "비밀번호가 일치합니다." : "비밀번호가 일치하지 않습니다.";
  }, [accountPassword, accountPassword2]);

  // ====== daum postcode script ======
  const [daumReady, setDaumReady] = useState(false);

  useEffect(() => {
    const id = "daum-postcode-script";
    if (document.getElementById(id)) {
      setDaumReady(true);
      return;
    }
    const s = document.createElement("script");
    s.id = id;
    s.src = "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
    s.async = true;
    s.onload = () => setDaumReady(true);
    s.onerror = () => setTopMsg("주소 검색 스크립트를 불러오지 못했습니다.");
    document.body.appendChild(s);
  }, []);

  // ====== timer ======
  useEffect(() => {
    if (cooldownSec <= 0) {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    if (timerRef.current) return;

    timerRef.current = window.setInterval(() => {
      setCooldownSec((prev) => {
        if (prev <= 1) {
          if (timerRef.current) window.clearInterval(timerRef.current);
          timerRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [cooldownSec]);

  // ✅ 인증번호 받기 버튼 활성 조건: "정규식 통과"만(blur 여부랑 무관하게)
  const canSendCode = useMemo(() => {
    const phoneOk = !validatePhone010(accountPhone) && !!normalizePhone11(accountPhone);
    return !submitting && !phoneVerified && cooldownSec === 0 && phoneOk;
  }, [submitting, cooldownSec, accountPhone, phoneVerified]);

  // 아이디 바뀌면 중복확인 상태 자동 해제
  useEffect(() => {
    setIdChecked(false);
    setIdDuplicated(null);
    setIdCheckMsg("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId]);

  // 전화번호 바뀌면 인증 흐름 리셋 (인증 완료면 변경 불가라 사실상 작동 안 함)
  useEffect(() => {
    if (phoneVerified) return;

    setCodeChecked(false);
    setCodeCheckMsg("");
    setVerificationCode("");
    setAccountKey(null);
    setCodeSent(false);
    setCooldownSec(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountPhone]);

  const handleCheckId = async () => {
    setTopMsg("");
    setIdChecked(false);
    setIdDuplicated(null);
    setIdCheckMsg("");

    // 중복확인은 blur 경고와 별개로 "규칙 통과"가 필수
    const rule = validateId(accountId);
    if (rule) {
      // 클릭했으니 터치 처리해서 빨간 경고도 같이 보이게
      setTouched((p) => ({ ...p, accountId: true }));
      setIdCheckMsg(rule);
      return;
    }

    try {
      const res = await ornablyAPI.get("/guest/account/check-id", {
        params: { accountId: accountId.trim() },
      });

      const isDuplicated = !!res?.data?.isDuplicated;
      setIdChecked(true);
      setIdDuplicated(isDuplicated);
      setIdCheckMsg(isDuplicated ? "이미 사용 중인 아이디입니다." : "사용 가능한 아이디입니다.");
    } catch (e) {
      setIdChecked(false);
      setIdDuplicated(null);
      setIdCheckMsg(parseServerMessage(e));
    }
  };

  const handleSendCode = async () => {
    if (phoneVerified) return;

    setTopMsg("");
    setCodeChecked(false);
    setCodeCheckMsg("");
    setVerificationCode("");

    const phoneErr = validatePhone010(accountPhone);
    if (phoneErr || !normalizePhone11(accountPhone)) {
      setTouched((p) => ({ ...p, accountPhone: true }));
      setCodeCheckMsg(phoneErr || "전화번호를 입력해 주세요.");
      return;
    }

    const phone = normalizePhone11(accountPhone);

    try {
      const res = await ornablyAPI.post("/guest/phone-verifications/send-code", {
        accountPhone: phone,
      });

      const ok = !!res?.data?.success;

      if (ok) {
        setAccountKey(res?.data?.accountKey);
        setCooldownSec(180);
        setCodeSent(true);
        setCodeSendMsg("인증번호를 발송했습니다. 3분 안에 입력해 주세요.");
      } else {
        setCodeSent(false);
        setCodeSendMsg("인증번호 발송에 실패했습니다.");
      }
    } catch (e) {
      setCodeSent(false);
      setCodeSendMsg(parseServerMessage(e));
    }
  };

  const handleCheckCode = async () => {
    if (phoneVerified) return;

    setTopMsg("");
    setCodeChecked(false);
    setCodeCheckMsg("");

    const code = verificationCode.trim();
    if (!code) {
      setCodeCheckMsg("인증번호를 입력해 주세요.");
      return;
    }

    try {
      const res = await ornablyAPI.post("/guest/phone-verifications/check-code", {
        accountVerificationCode: code,
        accountKey: accountKey,
      });

      const ok = !!res?.data?.success;

      if (ok) {
        setCodeChecked(true);
        setCodeCheckMsg("인증이 완료되었습니다.");
        setPhoneVerified(true);
        setCooldownSec(0);
      } else {
        setCodeChecked(false);
        setCodeCheckMsg("인증에 실패했습니다. 인증번호를 확인해 주세요.");
      }
    } catch (e) {
      setCodeChecked(false);
      setCodeCheckMsg(parseServerMessage(e));
    }
  };

  const openDaumPostcode = () => {
    setTopMsg("");
    if (!daumReady || !window.daum?.Postcode) {
      setTopMsg("주소 검색을 준비 중입니다. 잠시 후 다시 시도해 주세요.");
      return;
    }

    new window.daum.Postcode({
      oncomplete: function (data) {
        const zonecode = data.zonecode || "";
        const addr = data.roadAddress || data.jibunAddress || "";
        setAddressPostalCode(zonecode);
        setAddressRegion(addr);
      },
    }).open();
  };

  // ✅ 회원가입 버튼 활성 조건(= canSubmit) : blur 여부와 무관하게 "실제 값 기준"으로만 판단
  const canSubmit = useMemo(() => {
    if (submitting) return false;

    if (validateId(accountId)) return false;
    if (!idChecked) return false;
    if (idDuplicated) return false;

    if (!accountName.trim()) return false;

    if (validatePassword(accountPassword)) return false;
    if (!accountPassword2) return false;
    if (accountPassword !== accountPassword2) return false;

    if (!normalizePhone11(accountPhone)) return false;
    if (validatePhone010(accountPhone)) return false;

    if (validateEmail(accountEmail)) return false;

    if (!addressName.trim()) return false;
    if (!addressPostalCode.trim() || !addressRegion.trim()) return false;
    if (!addressDetail.trim()) return false;

    // if (!phoneVerified) return false;

    return true;
  }, [
    submitting,
    accountId,
    idChecked,
    idDuplicated,
    accountName,
    accountPassword,
    accountPassword2,
    accountPhone,
    accountEmail,
    addressName,
    addressPostalCode,
    addressRegion,
    addressDetail,
  ]);

  const validateBeforeSubmit = () => {
    // 제출할 땐 경고가 보이도록 터치 처리
    setTouched({
      accountId: true,
      accountPassword: true,
      accountEmail: true,
      accountPhone: true,
    });

    const idErr = validateId(accountId);
    if (idErr) return idErr;
    if (!idChecked) return "아이디 중복 확인을 해주세요.";
    if (idDuplicated) return "이미 사용 중인 아이디입니다.";

    if (!accountName.trim()) return "이름을 입력해 주세요.";

    const pwErr = validatePassword(accountPassword);
    if (pwErr) return pwErr;
    if (accountPassword !== accountPassword2) return "비밀번호 확인이 일치하지 않습니다.";

    const phone = normalizePhone11(accountPhone);
    if (!phone) return "전화번호를 입력해 주세요.";
    const phoneErr = validatePhone010(accountPhone);
    if (phoneErr) return phoneErr;

    const emailErr = validateEmail(accountEmail);
    if (emailErr) return emailErr;

    if (!addressName.trim()) return "배송지명을 입력해 주세요.";
    if (!addressPostalCode.trim() || !addressRegion.trim()) return "주소 검색으로 주소/우편번호를 입력해 주세요.";
    if (!addressDetail.trim()) return "상세주소를 입력해 주세요.";

    // if (!phoneVerified) return "전화번호 인증을 완료해 주세요.";

    return null;
  };

  const handleSubmit = async () => {
    setTopMsg("");
    const msg = validateBeforeSubmit();
    if (msg) {
      setTopMsg(msg);
      return;
    }

    const body = {
      account: {
        accountId: accountId.trim(),
        accountName: accountName.trim(),
        accountPassword: accountPassword,
        accountPhone: normalizePhone11(accountPhone),
        accountEmail: accountEmail.trim(),
        accountEventOptIn: !!accountEventOptIn,
      },
      address: {
        addressName: addressName.trim(),
        addressPostalCode: addressPostalCode.trim(),
        addressRegion: addressRegion.trim(),
        addressDetail: addressDetail.trim(),
      },
    };

    try {
      setSubmitting(true);
      await ornablyAPI.post("/guest/account/signup", body);
      setSuccessOpen(true);   // ✅ 성공 모달 오픈

    } catch (e) {
      setTopMsg(parseServerMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  // ✅ 중복확인 메시지 색상: 사용 가능(초록), 중복(빨강), 기타(회색)
  const idCheckColorClass = useMemo(() => {
    if (!idCheckMsg) return "text-gray-500";
    if (idChecked && idDuplicated === false) return "text-emerald-600";
    if (idChecked && idDuplicated === true) return "text-red-600";
    return "text-gray-500";
  }, [idCheckMsg, idChecked, idDuplicated]);

  return (
    <div className="min-h-[calc(100vh-72px)] bg-[#f5f3ff]">
      <div className="mx-auto max-w-[980px] px-4 py-10">
        <div className="mx-auto w-full max-w-[620px] rounded-3xl bg-white/70 p-8 shadow-[0_10px_35px_rgba(17,24,39,0.10)] backdrop-blur">
          {/* 헤더 */}
          <div className="flex items-start gap-3">
            {/*<div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-white border border-violet-100">
              <img src={logo} alt="ORNABLY" className="h-full w-full object-contain" draggable={false} />
            </div>*/}
            <div className="h-10 w-10 rounded-full text-white flex items-center justify-center font-semibold">
              <img
                src={ornably}
                alt="ORNABLY"
                className="h-10 w-auto object-contain"
              />
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-semibold text-gray-900">회원가입</h1>
              <p className="mt-1 text-sm text-gray-500">로컬 계정을 생성하고 가입을 완료해 주세요.</p>
            </div>
            <Link
              to="/login"
              className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              로그인으로
            </Link>
          </div>

          {topMsg && (
            <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              {topMsg}
            </div>
          )}

          {/* 기본 정보 */}
          <section className="mt-6">
            <h2 className="text-sm font-semibold text-gray-800">기본 정보</h2>

            {/* 아이디 + 중복확인 */}
            <div className="mt-3">
              <label className="text-xs text-gray-500">아이디</label>
              <div className="mt-1 flex gap-2">
                <input
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  onBlur={onBlurTouch("accountId")}
                  placeholder="아이디 (4~20자, 영문/숫자/_)"
                  className="h-11 flex-1 rounded-2xl border border-gray-200 bg-white px-4 text-sm outline-none focus:border-violet-300"
                />
                <button
                  type="button"
                  onClick={handleCheckId}
                  disabled={submitting || !!validateId(accountId)}
                  className="h-11 shrink-0 rounded-2xl bg-black px-4 text-sm font-medium text-white disabled:opacity-50"
                >
                  중복 확인
                </button>
              </div>

              {/* 정규식 경고: blur 이후 + 실패일 때만 */}
              {!!idRuleMsg && <p className="mt-2 text-xs text-red-600">{idRuleMsg}</p>}

              {/* 중복확인 결과: 사용 가능(초록) / 중복(빨강) */}
              {idCheckMsg && <p className={`mt-2 text-xs ${idCheckColorClass}`}>{idCheckMsg}</p>}
            </div>

            {/* 이름 */}
            <div className="mt-4">
              <label className="text-xs text-gray-500">이름</label>
              <input
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="이름"
                className="mt-1 h-11 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm outline-none focus:border-violet-300"
              />
            </div>

            {/* 이메일 */}
            <div className="mt-4">
              <label className="text-xs text-gray-500">이메일</label>
              <input
                value={accountEmail}
                onChange={(e) => setAccountEmail(e.target.value)}
                onBlur={onBlurTouch("accountEmail")}
                placeholder="example@email.com"
                className="mt-1 h-11 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm outline-none focus:border-violet-300"
              />
              {!!emailRuleMsg && <p className="mt-2 text-xs text-red-600">{emailRuleMsg}</p>}
            </div>
          </section>

          {/* 비밀번호 */}
          <section className="mt-6">
            <h2 className="text-sm font-semibold text-gray-800">비밀번호</h2>

            <div className="mt-3">
              <label className="text-xs text-gray-500">비밀번호</label>
              <input
                type="password"
                value={accountPassword}
                onChange={(e) => setAccountPassword(e.target.value)}
                onBlur={onBlurTouch("accountPassword")}
                placeholder="8~20자, 영문/숫자/특수문자 포함"
                className="mt-1 h-11 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm outline-none focus:border-violet-300"
              />
              {!!pwRuleMsg && <p className="mt-2 text-xs text-red-600">{pwRuleMsg}</p>}
            </div>

            <div className="mt-4">
              <label className="text-xs text-gray-500">비밀번호 확인</label>
              <input
                type="password"
                value={accountPassword2}
                onChange={(e) => setAccountPassword2(e.target.value)}
                placeholder="비밀번호 확인"
                className="mt-1 h-11 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm outline-none focus:border-violet-300"
              />

              {!!accountPassword2 && (
                <p className={`mt-2 text-xs ${accountPassword === accountPassword2 ? "text-emerald-600" : "text-red-600"}`}>
                  {pwMatchMsg}
                </p>
              )}
            </div>
          </section>

          {/* 전화번호 인증 */}
          <section className="mt-6">
            <h2 className="text-sm font-semibold text-gray-800">전화번호 인증</h2>

            <div className="mt-3">
              <label className="text-xs text-gray-500">전화번호(11자리)</label>
              <div className="mt-1 flex gap-2">
                <input
                  value={accountPhone}
                  onChange={(e) => setAccountPhone(normalizePhone11(e.target.value))}
                  onBlur={onBlurTouch("accountPhone")}
                  placeholder="01012345678"
                  disabled={phoneVerified}
                  className="h-11 flex-1 rounded-2xl border border-gray-200 bg-white px-4 text-sm outline-none focus:border-violet-300 disabled:bg-gray-50 disabled:text-gray-500"
                />
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={!canSendCode}
                  className="h-11 shrink-0 rounded-2xl bg-black px-4 text-sm font-medium text-white disabled:opacity-50"
                >
                  {phoneVerified ? "인증완료" : cooldownSec > 0 ? `재인증 ${formatMMSS(cooldownSec)}` : "인증번호 받기"}
                </button>
              </div>

              {/* 정규식 경고: blur 이후 + 실패일 때만 */}
              {!!phoneRuleMsg && <p className="mt-2 text-xs text-red-600">{phoneRuleMsg}</p>}

              {codeSendMsg && (
                <p className={`mt-2 text-xs ${codeSent ? "text-emerald-600" : "text-gray-500"}`}>{codeSendMsg}</p>
              )}
            </div>

            {codeSent && (
              <div className="mt-4">
                <label className="text-xs text-gray-500">인증번호</label>
                <div className="mt-1 flex gap-2">
                  <input
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    placeholder="인증번호 입력"
                    disabled={phoneVerified}
                    className="h-11 flex-1 rounded-2xl border border-gray-200 bg-white px-4 text-sm outline-none focus:border-violet-300 disabled:bg-gray-50 disabled:text-gray-500"
                  />
                  <button
                    type="button"
                    onClick={handleCheckCode}
                    disabled={submitting || phoneVerified}
                    className="h-11 shrink-0 rounded-2xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
                  >
                    확인
                  </button>
                </div>

                {codeCheckMsg && (
                  <p className={`mt-2 text-xs ${codeChecked ? "text-emerald-600" : "text-gray-500"}`}>{codeCheckMsg}</p>
                )}
              </div>
            )}
          </section>

          {/* 주소 정보 */}
          <section className="mt-6">
            <h2 className="text-sm font-semibold text-gray-800">주소 정보</h2>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs text-gray-500">배송지명</label>
                <input
                  value={addressName}
                  onChange={(e) => setAddressName(e.target.value)}
                  placeholder="집 / 회사"
                  className="mt-1 h-11 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm outline-none focus:border-violet-300"
                />
              </div>

              <div>
                <label className="text-xs text-gray-500">우편번호</label>
                <div className="mt-1 flex gap-2">
                  <input
                    value={addressPostalCode}
                    readOnly
                    placeholder="우편번호"
                    className="h-11 flex-1 rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm text-gray-700 outline-none"
                  />
                  <button
                    type="button"
                    onClick={openDaumPostcode}
                    className="h-11 shrink-0 rounded-2xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-800 hover:bg-gray-50"
                  >
                    주소 검색
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-3">
              <label className="text-xs text-gray-500">주소(지역)</label>
              <input
                value={addressRegion}
                readOnly
                placeholder="주소 검색 버튼을 눌러 선택"
                className="mt-1 h-11 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm text-gray-700 outline-none"
              />
            </div>

            <div className="mt-3">
              <label className="text-xs text-gray-500">상세주소</label>
              <input
                value={addressDetail}
                onChange={(e) => setAddressDetail(e.target.value)}
                placeholder="상세주소"
                className="mt-1 h-11 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm outline-none focus:border-violet-300"
              />
            </div>

            <label className="mt-4 flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={accountEventOptIn}
                onChange={(e) => setAccountEventOptIn(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              이벤트/혜택 알림 수신에 동의합니다.
            </label>
          </section>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="mt-6 h-12 w-full rounded-2xl bg-black text-sm font-semibold text-white disabled:opacity-50"
          >
            {submitting ? "처리 중..." : "회원가입 하기"}
          </button>

          <p className="mt-3 text-center text-xs text-gray-400">
            가입 시 서비스 이용약관 및 개인정보처리방침에 동의한 것으로 간주합니다.
          </p>
        </div>
      </div>
      {/* ✅ 회원가입 성공 모달 */}
      {successOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => {
              setSuccessOpen(false);
              nav("/login");
            }}
          />

          {/* modal */}
          <div className="relative mx-4 w-full max-w-sm rounded-3xl bg-white p-6 shadow-[0_15px_60px_rgba(0,0,0,0.25)]">
            <h3 className="text-lg font-semibold text-gray-900">회원가입 완료</h3>
            <p className="mt-2 text-sm text-gray-600 leading-relaxed">
              회원가입이 성공적으로 완료되었습니다.
              <br />
              다시 로그인해 주세요.
            </p>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setSuccessOpen(false);
                  nav("/login");
                }}
                className="h-11 w-full rounded-2xl bg-black px-4 text-sm font-semibold text-white hover:bg-gray-900"
              >
                로그인하러 가기
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
