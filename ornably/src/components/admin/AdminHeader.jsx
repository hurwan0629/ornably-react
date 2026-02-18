import { Link, NavLink, useNavigate } from "react-router-dom";
import { LogOut, Shield, Home } from "lucide-react";

function cx(...c) {
  return c.filter(Boolean).join(" ");
}

export default function AdminHeader() {
  const navigate = useNavigate();

  const onLogout = () => {
    // 서버 로그아웃 엔드포인트를 쓰는 기존 패턴 유지
    window.location.href = "http://localhost:8088/logout";
  };

  return (
    <header className="w-full bg-[#f6f4ff]">
      <div className="mx-auto max-w-7xl px-4 py-4">
        <div className="rounded-[28px] bg-white/60 backdrop-blur-md shadow-[0_6px_30px_rgba(17,24,39,0.08)]">
          <div className="flex items-center gap-4 px-6 py-4">
            {/* Brand */}
            <Link to="/admin" className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-[#7c3aed] text-white flex items-center justify-center">
                <Shield className="h-5 w-5" />
              </div>
              <div className="leading-tight">
                <div className="font-extrabold tracking-tight text-gray-900">ORNABLY</div>
                <div className="text-xs font-semibold text-gray-500">Admin</div>
              </div>
            </Link>

            {/* Center Nav (md+) */}
            <nav className="hidden md:flex flex-1 items-center justify-center gap-8 text-sm font-semibold text-gray-500">
              <NavLink
                to="/admin"
                end
                className={({ isActive }) =>
                  cx("hover:text-gray-900 transition-colors", isActive && "text-gray-900")
                }
              >
                대시보드
              </NavLink>
              <NavLink
                to="/admin/item"
                className={({ isActive }) =>
                  cx("hover:text-gray-900 transition-colors", isActive && "text-gray-900")
                }
              >
                상품
              </NavLink>
              <NavLink
                to="/admin/account"
                className={({ isActive }) =>
                  cx("hover:text-gray-900 transition-colors", isActive && "text-gray-900")
                }
              >
                회원
              </NavLink>
              <NavLink
                to="/admin/event"
                className={({ isActive }) =>
                  cx("hover:text-gray-900 transition-colors", isActive && "text-gray-900")
                }
              >
                이벤트
              </NavLink>
            </nav>

            {/* Right Actions */}
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate("/")}
                className="h-10 w-10 rounded-full border border-gray-200 bg-white shadow-sm flex items-center justify-center hover:bg-gray-50"
                aria-label="쇼핑몰로"
                title="쇼핑몰로"
              >
                <Home className="h-5 w-5 text-gray-700" />
              </button>

              <button
                type="button"
                onClick={onLogout}
                className="h-10 w-10 rounded-full border border-gray-200 bg-white shadow-sm flex items-center justify-center hover:bg-gray-50"
                aria-label="로그아웃"
                title="로그아웃"
              >
                <LogOut className="h-5 w-5 text-gray-700" />
              </button>
            </div>
          </div>

          {/* Mobile Nav (md-) */}
          <div className="block md:hidden px-6 pb-5">
            <div className="mt-1 flex items-center justify-between text-sm font-semibold text-gray-500">
              <NavLink to="/admin" end className={({ isActive }) => cx(isActive && "text-gray-900")}>
                대시보드
              </NavLink>
              <NavLink to="/admin/item" className={({ isActive }) => cx(isActive && "text-gray-900")}>
                상품
              </NavLink>
              <NavLink to="/admin/account" className={({ isActive }) => cx(isActive && "text-gray-900")}>
                회원
              </NavLink>
              <NavLink to="/admin/event" className={({ isActive }) => cx(isActive && "text-gray-900")}>
                이벤트
              </NavLink>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
