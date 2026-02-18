// src/components/common/Header.jsx
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { useMemo, useState } from "react";

// 아이콘: lucide-react 사용 (프로젝트에 있으면 그대로 OK)
// 없으면 아래 import 지우고, SVG로 바꿔줄게.
import { Search, Heart, ShoppingBag } from "lucide-react";

export default function Header() {
  const navigate = useNavigate();
  const { user, status } = useAuth();
  const isLogin = status === "ready" && !!user?.authenticated;

  const [q, setQ] = useState("");

  const menus = useMemo(
    () => [
      { label: "홈", to: "/" },
      { label: "둘러보기", to: "/items" },
      { label: "신상품", to: "/items/new" },
      { label: "인기", to: "/items/popular" },
      { label: "마이페이지", to: isLogin ? "/account" : "/login" },
    ],
    [isLogin]
  );

  const onSubmit = (e) => {
    e.preventDefault();
    const query = q.trim();
    if (!query) return;
    navigate(`/items?keyword=${encodeURIComponent(query)}`);
  };

  return (
    <header className="w-full bg-[#f6f4ff]">
      {/* 위아래 여백 + 스샷 같은 '큰 둥근 바' */}
      <div className="mx-auto max-w-7xl px-4 py-4">
        <div className="rounded-[28px] bg-white/60 backdrop-blur-md shadow-[0_6px_30px_rgba(17,24,39,0.08)]">
          <div className="flex items-center gap-4 px-6 py-4">
            {/* Left: avatar + brand */}
            <Link to="/" className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-[#7c3aed] text-white flex items-center justify-center font-semibold">
                O
              </div>
              <div className="font-extrabold tracking-tight text-gray-900">
                ORNABLY
              </div>
            </Link>

            {/* Center: nav */}
            <nav className="hidden md:flex flex-1 items-center justify-center gap-10 text-sm font-medium text-gray-500">
              {menus.map((m) => (
                <Link
                  key={m.label}
                  to={m.to}
                  className="hover:text-gray-900 transition-colors"
                >
                  {m.label}
                </Link>
              ))}
            </nav>

            {/* Right: search + icons */}
            <div className="ml-auto flex items-center gap-3">
              <form
                onSubmit={onSubmit}
                className="hidden sm:flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 shadow-sm"
              >
                <Search className="h-4 w-4 text-gray-400" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="오너먼트를 검색해봐 (ex. 트리, …)"
                  className="w-[260px] bg-transparent text-sm outline-none placeholder:text-gray-400"
                />
              </form>

              <Link
                to={isLogin ? "/account/wishlist" : "/login"}
                className="h-10 w-10 rounded-full border border-gray-200 bg-white shadow-sm flex items-center justify-center hover:bg-gray-50"
                aria-label="찜목록"
              >
                <Heart className="h-5 w-5 text-gray-700" />
              </Link>

              <Link
                to={isLogin ? "/account/cart" : "/login"}
                className="h-10 w-10 rounded-full border border-gray-200 bg-white shadow-sm flex items-center justify-center hover:bg-gray-50"
                aria-label="장바구니"
              >
                <ShoppingBag className="h-5 w-5 text-gray-700" />
              </Link>
            </div>
          </div>

          {/* Mobile nav + search (스샷은 PC지만 모바일도 예쁘게) */}
          <div className="block md:hidden px-6 pb-5">
            <form
              onSubmit={onSubmit}
              className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 shadow-sm"
            >
              <Search className="h-4 w-4 text-gray-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="검색어를 입력하세요"
                className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
              />
            </form>

            <div className="mt-3 flex items-center justify-between text-sm font-medium text-gray-500">
              {menus.map((m) => (
                <Link
                  key={m.label}
                  to={m.to}
                  className="hover:text-gray-900 transition-colors"
                >
                  {m.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
