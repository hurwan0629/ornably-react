// src/components/common/Header.jsx
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { useMemo } from "react";
import logo from "../../../images/logo.png";

import { Heart, ShoppingBag, LogOut } from "lucide-react";

export default function Header() {
  const navigate = useNavigate();
  const { user, status, role } = useAuth();

  const auths = user?.authorities ?? [];
  const isUserLogin =
    status === "ready" &&
    !!user?.authenticated &&
    (role === "USER" ||
      auths.includes("USER") ||
      auths.includes("ADMIN") ||
      auths.includes("ONBOARD"));

  const menus = useMemo(
    () => [
      { label: "홈", to: "/" },
      { label: "둘러보기", to: "/items" },
      { label: "신상품", to: "/items/new" },
      { label: "이벤트 상품", to: "/items/discount" },
      { label: "마이페이지", to: isUserLogin ? "/account" : "/login" },
    ],
    [isUserLogin]
  );

  const onLogout = () => {
    window.location.href = "http://localhost:8088/logout";
  };

  return (
    <header className="w-full bg-[#f6f4ff]">
      <div className="mx-auto max-w-7xl px-4 py-4">
        <div className="rounded-[28px] bg-white/60 backdrop-blur-md shadow-[0_6px_30px_rgba(17,24,39,0.08)]">
          <div className="flex items-center gap-4 px-6 py-4">
            {/* Left: avatar + brand */}
            <Link to="/" className="flex items-center gap-3">
              <img
                src={logo}
                alt="ORNABLY"
                className="h-10 w-auto object-contain"
              />
              {/*
              <div className="font-extrabold tracking-tight text-gray-900">
                ORNABLY
              </div>
              */}
            </Link>

            {/* Center: nav */}
            <nav className="hidden md:flex flex-1 items-center justify-center gap-10 text-sm font-medium text-gray-500">
              {menus.map((m) => (
                <Link
                  key={m.label}
                  to={m.to}
                  className="hover:text-gray-900 transition-colors whitespace-nowrap"
                >
                  {m.label}
                </Link>
              ))}
            </nav>

            {/* ✅ Right: PC 전용 (md 이상에서만 표시) */}
            <div className="ml-auto hidden md:flex items-center gap-2">
              {isUserLogin ? (
                <>
                  <Link
                    to="/account/wishlist"
                    className="h-10 w-10 rounded-full border border-gray-200 bg-white shadow-sm flex items-center justify-center hover:bg-gray-50"
                    aria-label="찜목록"
                    title="찜목록"
                  >
                    <Heart className="h-5 w-5 text-gray-700" />
                  </Link>

                  <Link
                    to="/account/cart"
                    className="h-10 w-10 rounded-full border border-gray-200 bg-white shadow-sm flex items-center justify-center hover:bg-gray-50"
                    aria-label="장바구니"
                    title="장바구니"
                  >
                    <ShoppingBag className="h-5 w-5 text-gray-700" />
                  </Link>

                  <button
                    type="button"
                    onClick={onLogout}
                    className="h-10 w-10 rounded-full border border-gray-200 bg-white shadow-sm flex items-center justify-center hover:bg-gray-50"
                    aria-label="로그아웃"
                    title="로그아웃"
                  >
                    <LogOut className="h-5 w-5 text-gray-700" />
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/signup"
                    className="inline-flex items-center justify-center h-10 rounded-full border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 whitespace-nowrap min-w-[88px]"
                  >
                    회원가입
                  </Link>

                  <Link
                    to="/login"
                    className="inline-flex items-center justify-center h-10 rounded-full bg-[#7c3aed] px-4 text-sm font-semibold text-white shadow-sm hover:opacity-90 whitespace-nowrap min-w-[72px]"
                  >
                    로그인
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* ✅ Mobile nav + action (md 미만에서만 표시) */}
          <div className="block md:hidden px-6 pb-5">
            <div className="mt-1 flex items-center justify-between text-sm font-medium text-gray-500">
              {menus.map((m) => (
                <Link
                  key={m.label}
                  to={m.to}
                  className="hover:text-gray-900 transition-colors whitespace-nowrap"
                >
                  {m.label}
                </Link>
              ))}
            </div>

            <div className="mt-4 flex items-center gap-2">
              {isUserLogin ? (
                <>
                  <Link
                    to="/account/wishlist"
                    className="flex-1 h-10 rounded-full border border-gray-200 bg-white shadow-sm flex items-center justify-center hover:bg-gray-50 text-sm font-semibold text-gray-700 whitespace-nowrap"
                  >
                    찜목록
                  </Link>
                  <Link
                    to="/account/cart"
                    className="flex-1 h-10 rounded-full border border-gray-200 bg-white shadow-sm flex items-center justify-center hover:bg-gray-50 text-sm font-semibold text-gray-700 whitespace-nowrap"
                  >
                    장바구니
                  </Link>
                  <button
                    type="button"
                    onClick={onLogout}
                    className="h-10 w-10 rounded-full border border-gray-200 bg-white shadow-sm flex items-center justify-center hover:bg-gray-50"
                    aria-label="로그아웃"
                    title="로그아웃"
                  >
                    <LogOut className="h-5 w-5 text-gray-700" />
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/signup"
                    className="flex-1 h-10 rounded-full border border-gray-200 bg-white shadow-sm flex items-center justify-center hover:bg-gray-50 text-sm font-semibold text-gray-700 whitespace-nowrap"
                  >
                    회원가입
                  </Link>
                  <Link
                    to="/login"
                    className="flex-1 h-10 rounded-full bg-[#7c3aed] shadow-sm flex items-center justify-center hover:opacity-90 text-sm font-semibold text-white whitespace-nowrap"
                  >
                    로그인
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
