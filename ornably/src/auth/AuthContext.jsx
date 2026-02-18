import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import axios from 'axios';

// 상태 저장 + /me 로드

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  console.log("AuthProvider 렌더링 시작...");
  // status: "loading" | "ready"
  const [status, setStatus] = useState("loading");
  const [user, setUser] = useState(null); // { role: "..." } 같은 형태로 저장

  
  const isAuthed = !!user?.authenticated; // ?. -> null 또는 undefined 을 무조건 undefined로 바꾸는 코드
  const role = user?.role ?? null;  // ?? -> 왼쪽이 null | undefined 이면 오른쪽 값 반환
  const authorities = user?.authorities ?? [];

  // 서버에게 내 권한 받아오는 기능 - /api/me
  const loadMe = async () => {
    console.log("loadMe() 호출");
    setStatus("loading");
    try {
      const res = await axios.get("http://localhost:8088/api/all/auth/info", {
        withCredentials: true,
      });
      // res.data 예: { authenticated: true, role: "USER", ... }
      console.log("/api/me 응답:");
      console.log(res);
      setUser(res.data);

      // setUser({authenticated: true, role: "ADMIN", authorities: ["ADMIN"]});
    } catch (e) {
      // 로그인 안 됐거나 세션 만료 등
      setUser(null);
      console.log("loadMe 에러 발생", e);
    } finally {
      setStatus("ready");
    }
  };

  // 앱 최초 접속/새로고침 때 1회 동기화
  useEffect(() => {
    loadMe();
  }, []);

  // 401/403 발생 시 상태 정리(선택)
  useEffect(() => {
    const id = axios.interceptors.response.use(
      (res) => res,
      async (err) => {
        const code = err?.response?.status;
        if (code === 401 || code === 403) { // 401 : unAthorized(로그인 안됨) | 403 : forbidden(권한없음)
          // 세션 만료/권한 변경 등 가능 → 상태 정리
          setUser(null);
          setStatus("ready");
        }
        return Promise.reject(err);
      }
    );

    return () => axios.interceptors.response.eject(id);
  }, []);
  
  const value = useMemo(
    () => ({
      status,      // loading/ready
      user,        // { isAuthed, role, authorities }
      authorities, // 권한 : USER/ADIMN/ONBOARD 또는 []
      role,        // ADMIN/LOCAL/GOOGLE/KAKAO/...
      isAuthed,    // 비회원 vs 회원(관리자 포함)
      loadMe,      // 로그인/온보딩 완료 후 등에 호출
      setUser,     // OAuth 콜백 등 특수 상황에서 사용 가능
    }),
    [status, user, role, isAuthed, authorities, loadMe]
  );
  return <AuthContext.Provider value={ value }>{children}</AuthContext.Provider>;
}

export function useAuth() {
  console.log("useAuth() 호출");
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth() - useContext(AuthContext)가 잘못된 위치에서 사용되었습니다.");
  console.log(ctx);
  return ctx;
}