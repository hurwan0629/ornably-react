
// src/pages/guest/LoginPage.jsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Container from "../../components/common/Container";
import { useAuth } from "../../auth/AuthContext";
import { getErrorInfo, getApiMessage } from "../../lib/error";
import axios from "axios";
import ornably from "../../../images/ornably.png";

export default function LoginPage() {
  const navigate = useNavigate();
  const { loadMe } = useAuth();

  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const onChange = (key) => (e) => {
    setForm((p) => ({ ...p, [key]: e.target.value }));
    setError("");
  };

  const handleLogin = async (e) => {
    e?.preventDefault?.();
    // 로그인 진행중이라면 일단 기다려!
    if (pending) return;

    const username = form.username.trim();
    const password = form.password;

    if (!username || !password) {
      setError("아이디와 비밀번호를 입력해 주세요.");
      return;
    }
    
    // 로그인 시작하겠습니다~ 라는 뜻
    setPending(true);
    setError("");

    try {
      const body = new URLSearchParams();
      body.append("username", username);
      body.append("password", password);

      await axios.post(`http://localhost:8088/login`, body, {
        withCredentials: true,
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      // 세션 로그인은 성공 후 /me 동기화가 안전
      await loadMe();

      // navigate("/", { replace: true });
    } catch (err) {
      const errInfo = getErrorInfo(err);
      if(errInfo.status===401) {
        setError("아이디 또는 비밀번호가 틀렸습니다.");
      }
      else{
        setError(err.message);
      }
    } finally {
      setPending(false);
    }
  };

  const startOAuth = (provider) => {
    // Spring Security 기본 OAuth2 시작 URL
    window.location.href = `http://localhost:8088/oauth2/authorization/${provider}`;
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#f6f4ff]">
      <Container>
        <div className="mx-auto max-w-md py-12">
          <div className="rounded-[28px] bg-white/60 backdrop-blur-md shadow-[0_10px_45px_rgba(17,24,39,0.10)] border border-white/50">
            <div className="px-7 py-8">
              {/* 타이틀 */}
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full text-white flex items-center justify-center font-semibold">
                  <img
                    src={ornably}
                    alt="ORNABLY"
                    className="h-10 w-auto object-contain"
                  />
                </div>
                {/*<div className="h-10 w-10 rounded-full bg-[#7c3aed] text-white flex items-center justify-center font-semibold">
                  O
                </div>*/}
                <div>
                  <h1 className="text-xl font-extrabold tracking-tight text-gray-900">
                    로그인
                  </h1>
                  <p className="mt-1 text-sm text-gray-500">
                    오너블리에 오신 걸 환영해요.
                  </p>
                </div>
              </div>

              {/* 폼 */}
              <form onSubmit={handleLogin} className="mt-7 space-y-3">
                <div>
                  <label className="sr-only" htmlFor="username">
                    아이디
                  </label>
                  <input
                    id="username"
                    value={form.username}
                    onChange={onChange("username")}
                    placeholder="아이디"
                    autoComplete="username"
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-gray-300 focus:ring-2 focus:ring-black/5"
                  />
                </div>

                <div>
                  <label className="sr-only" htmlFor="password">
                    비밀번호
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={form.password}
                    onChange={onChange("password")}
                    placeholder="비밀번호"
                    autoComplete="current-password"
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-gray-300 focus:ring-2 focus:ring-black/5"
                  />
                </div>

                {error && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={pending}
                  className="w-full rounded-2xl bg-black px-4 py-3 text-sm font-semibold text-white hover:bg-gray-900 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {pending ? "로그인 중..." : "로그인하기"}
                </button>

                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span />
                  <Link to="/signup" className="hover:text-gray-900">
                    회원가입
                  </Link>
                </div>
              </form>

              {/* 구분선 */}
              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-gray-200" />
                <span className="text-xs text-gray-400">또는</span>
                <div className="h-px flex-1 bg-gray-200" />
              </div>

              {/* 소셜 로그인 */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => startOAuth("kakao")}
                  className="w-full rounded-2xl bg-[#FEE500] px-4 py-3 text-sm font-semibold text-black hover:brightness-[0.98]"
                >
                  카카오 로그인하기
                </button>

                <button
                  type="button"
                  onClick={() => startOAuth("naver")}
                  className="w-full rounded-2xl bg-[#03C75A] px-4 py-3 text-sm font-semibold text-white hover:brightness-[0.98]"
                >
                  네이버 로그인하기
                </button>

                <button
                  type="button"
                  onClick={() => startOAuth("google")}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50"
                >
                  구글 로그인하기
                </button>
              </div>
              
              <p className="mt-6 text-xs text-gray-400 leading-relaxed">
                로그인 시 서비스 이용약관 및 개인정보처리방침에 동의한 것으로 간주합니다.
              </p>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}
