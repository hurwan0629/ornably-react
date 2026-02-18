import { Outlet, NavLink } from "react-router-dom";
import AdminHeader from "../components/admin/AdminHeader";
import AdminFooter from "../components/admin/AdminFooter";
import Container from "../components/common/Container";

function cx(...c) {
  return c.filter(Boolean).join(" ");
}

const SIDE = [
  { label: "대시보드", to: "/admin", end: true },
  { label: "상품 검색", to: "/admin/item" },
  { label: "상품 등록", to: "/admin/item/new" },
  { label: "회원 검색", to: "/admin/account" },
  { label: "이벤트 관리", to: "/admin/event" },
  { label: "이벤트 등록", to: "/admin/event/new" },
];

export default function AdminLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-[#f6f4ff]">
      <AdminHeader />

      <main className="flex-1 pb-10">
        <Container>
          <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6 mt-4">
            {/* Sidebar */}
            <aside className="lg:sticky lg:top-6 h-fit">
              <div className="rounded-[24px] bg-white/60 backdrop-blur-md shadow-[0_6px_30px_rgba(17,24,39,0.08)] border border-white/50">
                <div className="px-5 py-4">
                  <div className="text-xs font-bold text-gray-500 mb-3">관리자 메뉴</div>

                  <nav className="flex flex-col gap-1">
                    {SIDE.map((m) => (
                      <NavLink
                        key={m.label}
                        to={m.to}
                        end={m.end}
                        className={({ isActive }) =>
                          cx(
                            "px-4 py-2 rounded-xl text-sm font-semibold transition",
                            isActive
                              ? "bg-white text-gray-900 shadow-sm border border-gray-200"
                              : "text-gray-600 hover:text-gray-900 hover:bg-white/60"
                          )
                        }
                      >
                        {m.label}
                      </NavLink>
                    ))}
                  </nav>
                </div>
              </div>
            </aside>

            {/* Content */}
            <section className="min-w-0">
              <div className="rounded-[28px] bg-white/60 backdrop-blur-md shadow-[0_6px_30px_rgba(17,24,39,0.08)] border border-white/50 p-4 sm:p-6">
                <Outlet />
              </div>
            </section>
          </div>
        </Container>
      </main>

      <AdminFooter />
    </div>
  );
}
