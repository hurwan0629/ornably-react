// Guard.jsx
import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

/**
 * 사용법 예시:
 * 1) 로그인 필요 + 역할 제한:
 *    <Guard auth allow={["USER"]}><UserLayout/></Guard>
 *
 * 2) 게스트 전용(로그인하면 리다이렉트):
 *    <Guard guest redirectAuthedTo="/"><PublicLayout/></Guard>
 *
 * 3) 로그인 했는데 특정 권한이면 막기(= 기존 RedirectOnboard 역할)
 *    <Guard block={["ONBOARD"]}><UserLayout/></Guard>
 *
 * 4) Outlet 기반으로 쓰고 싶으면 children 없이:
 *    element: <Guard auth allow={["ADMIN"]} outlet />
 */
export default function Guard({
  // 공통
  outlet = false,

  // auth 가드 (기존 RequireAuth)
  auth = false,
  allow = [], // 허용 권한 배열 (authorities 기준)

  // guest 가드 (기존 RequireGuest)
  guest = false,
  redirectAuthedTo = "/",

  // block 가드 (기존 RedirectOnboard 느낌)
  block = [], // 차단 권한 배열(해당 authorities 포함 시 막힘)

  // 리다이렉트 커스터마이즈
  redirectUnauthedTo = "/login",
  redirectForbiddenTo = "/403",

  children,
}) {
  const { status, isAuthed, authorities } = useAuth();
  const location = useLocation();

  // 로딩 중 깜빡임 방지 (기존 3개 모두에서 하던 패턴) 
  if (status === "loading") return null;

  // 1) guest 전용: 로그인 상태면 튕김
  if (guest) {
    if (isAuthed) return <Navigate to={redirectAuthedTo} replace />;
    return outlet ? <Outlet /> : children;
  }

  // 2) auth 필요: 비로그인이면 로그인으로
  if (auth) {
    if (!isAuthed) {
      return (
        <Navigate
          to={redirectUnauthedTo}
          replace
          state={{ from: location.pathname }}
        />
      );
    }
  }

  // 3) block: 로그인 상태에서 특정 권한이면 금지 페이지로
  if (isAuthed && block.length > 0) {
    const blocked = block.some((r) => authorities.includes(r));
    if (blocked) return <Navigate to={redirectForbiddenTo} replace />;
  }

  // 4) allow: 허용 권한 체크 (auth=true일 때 주로 사용)
  if (allow.length > 0) {
    const ok = allow.some((r) => authorities.includes(r));
    if (!ok) return <Navigate to={redirectForbiddenTo} replace />;
  }

  return outlet ? <Outlet /> : children;
}
