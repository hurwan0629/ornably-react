// src/auth/routeAccess.js
export const ACCESS = {
  // 공개 (단, ONBOARD는 차단)
  PUBLIC_BLOCK_ONBOARD: {
    mode: "public",
    block: ["ONBOARD"],
    redirects: { forbidden: "/onboard" },
  },

  // 비로그인 전용
  GUEST_ONLY: {
    mode: "guest",
    redirects: { authed: "/" },
  },

  // 온보딩 전용
  ONBOARD_ONLY: {
    mode: "auth",
    allow: ["ONBOARD"],
    redirects: { unauthed: "/login", forbidden: "/403" },
  },

  // 유저 전용
  USER_ONLY: {
    mode: "auth",
    allow: ["USER"],
    redirects: { unauthed: "/login", forbidden: "/403" },
  },

  // 관리자 전용
  ADMIN_ONLY: {
    mode: "auth",
    allow: ["ADMIN"], 
    redirects: { unauthed: "/admin/login", forbidden: "/403" },
  },
};
