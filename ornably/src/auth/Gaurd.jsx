// src/auth/Guard.jsx
import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

function hasAny(authorities, roles = []) {
  if (!roles || roles.length === 0) return true;
  return roles.some((r) => authorities.includes(r));
}

function isBlocked(authorities, block = []) {
  if (!block || block.length === 0) return false;
  return block.some((r) => authorities.includes(r));
}

/**
 * policy 형태:
 * {
 *   mode: "public" | "guest" | "auth",
 *   allow?: string[],
 *   block?: string[],
 *   redirects?: { unauthed?: string, forbidden?: string, authed?: string }
 * }
 */
function decideAccess({ status, isAuthed, authorities }, policy, locationPath) {
  if (status === "loading") return { type: "loading" }; // 지금 상태 받아오는 중이면 기다려주기

  const redirects = policy.redirects ?? {};             // policy의 금지 처리 경로 { unauthed | forbidden } 저장 또는 없이 저장
  const unauthedTo = redirects.unauthed ?? "/login";    // redirects.unauthed가 없으면 기본으로 로그인화면
  const forbiddenTo = redirects.forbidden ?? "/403";    // redirects.forbidden이 없으면 기본으로 /403 화면
  const authedTo = redirects.authed ?? "/";             // 권한이 있어서 못가는 설정은 모두 홈페이지로 설정

  // 1) guest-only
  if (policy.mode === "guest") {                        // guest만 갈 수 있는 페이지 설정
    if (isAuthed) return { type: "redirect", to: authedTo }; // 로그인 되어있을 시 권한이 있어서 가야하는 페이지로 보내기
    return { type: "allow" };                           // 허용해주기
  }

  // 2) auth-required
  if (policy.mode === "auth") {                         // 로그인되어있으며 권한 검사를 해야하는 경우
    if (!isAuthed) {                                    // 로그인이 안되어있을 때에는 
      return { type: "redirect", to: unauthedTo, state: { from: locationPath } };
    }
    if (!hasAny(authorities, policy.allow)) {           // 페이지에 대해 필요한 권한이 없으면 /403으로 내보내기
      return { type: "redirect", to: forbiddenTo };
    }
    return { type: "allow" };
  }

  // 3) public (optional block)
  if (policy.mode === "public") {                       // 모두가 가능하지만 일부를 막아야하는 경우
    if (isAuthed && isBlocked(authorities, policy.block)) { // 인증은 되었지만 막혀있을때 
      return { type: "redirect", to: forbiddenTo };     // 403으로 보내기
    }
    return { type: "allow" };
  }

  // fallback
  return { type: "allow" };
}

export default function Guard({ policy, children }) {
  const auth = useAuth();
  const location = useLocation();

  const decision = decideAccess(auth, policy, location.pathname);

  if (decision.type === "loading") return null;

  if (decision.type === "redirect") {
    return (
      <Navigate
        to={decision.to}
        replace
        state={decision.state}
      />
    );
  }

  // children 있으면 Layout 감싸는 용도, 없으면 Outlet
  return children ?? <Outlet />;
}
