import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Boxes, Users, Calendar, MessageSquareText } from "lucide-react";
import AdminDashboardView from "../../components/admin/dashboard/AdminDashboardView";
import ornablyAPI from "../../lib/api";

function ActionCard({ title, subtitle, disabled=false, icon: Icon, onClick, accent = false }) {
  return (
    <button
      disabled={disabled}
      type="button"
      onClick={onClick}
      className={[
        "w-full text-left rounded-2xl border bg-white/60 backdrop-blur-md",
        "shadow-[0_6px_30px_rgba(17,24,39,0.06)]",
        "px-5 py-5 hover:bg-white/70 transition",
        accent ? "border-[#f4c97a] bg-[#fff2cf]" : "border-white/50",
      ].join(" ")}
    >
      <div className="flex items-start gap-4">
        <div
          className={[
            "h-11 w-11 rounded-2xl flex items-center justify-center border shadow-sm",
            accent ? "bg-white border-[#f4c97a]" : "bg-white border-gray-200",
          ].join(" ")}
        >
          <Icon className="h-5 w-5 text-gray-800" />
        </div>
        <div className="min-w-0">
          <div className="font-extrabold text-gray-900">{title}</div>
          {subtitle ? <div className="mt-1 text-sm text-gray-600">{subtitle}</div> : null}
        </div>
      </div>
    </button>
  );
}

export default function AdminHomePage() {
  const navigate = useNavigate();
  
  const [categorySales, setCategorySales] = useState();
  const [dailySales, setDailySales] = useState();
  const [onlineUsers, setOnlineUsers] = useState();

  // 카테고리별 총 판매량 집계
  useEffect(() => {
  (async () => {
      try {
        const categoryRes = await ornablyAPI.get(`/admin/dashboard/category`);
        // GET 요청에 FormData 넣는 건 보통 안 먹음. query param으로 보내는 게 정석
        const dailyRes = await ornablyAPI.get(`/admin/dashboard/daily`, {
          params: { days: 7 },
        });

        setCategorySales(categoryRes.data.categorySales);
        const fixedDaily = (dailyRes.data.dailySales ?? []).map(ds => ({
          ...ds,
          salesAmount: (ds?.salesAmount ?? 0) / 10000,
        }));

        setDailySales(fixedDaily);

        console.log("categoryRes", categoryRes.data.categorySales);
        console.log("fixedDaily", fixedDaily);
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const fetchOnlineUsers = async () => {
      try {
        const res = await ornablyAPI.get(
          "/admin/dashboard/online-users",
        );

        setOnlineUsers(res?.data?.onlineUsers);
      } catch (e) {
        if (e?.code === "ERR_CANCELED") return; // 언마운트 취소
        console.error(e);
      }
    };

    // 처음 1번 실행
    fetchOnlineUsers();

    // 5초마다 반복
    const intervalId = setInterval(fetchOnlineUsers, 5000);

    // 언마운트 시 정리
    return () => {
      clearInterval(intervalId);
      controller.abort();
    };
  }, []);

  return (
    <div className="min-w-0">
      {/* 페이지 타이틀 */}
      <div className="mb-4">
        <h2 className="text-xl font-extrabold tracking-tight text-gray-900">관리자 메인페이지</h2>
        <p className="text-sm text-gray-500 mt-1">운영 메뉴로 빠르게 이동하세요.</p>
      </div>

      {/* 전체 래퍼(와이어프레임 큰 박스 느낌) */}
      <div className="rounded-[28px] bg-white/45 border border-white/50 backdrop-blur-md shadow-[0_6px_30px_rgba(17,24,39,0.06)] p-4 sm:p-6">
        {/* 1) 대시보드(빈칸) */}
        <div className="rounded-2xl bg-white/60 border border-gray-200/70 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-200/60">
            <div className="font-extrabold text-gray-900">
              <AdminDashboardView
                onlineUsers={onlineUsers}
                categorySales={categorySales}
                categoryColorMap={{
                  ETC:      "#9CA3AF",  // 중립 회색
                  BALL:     "#F97316",  // 오렌지 (장식, 포인트 느낌)
                  FIGURE:   "#8B5CF6",  // 보라 (피규어 = 개성, 캐릭터성)
                  LIGHT:    "#FACC15",  // 밝은 옐로우 (조명 느낌)
                  WREATHS:  "#10B981",  // 그린 (리스 = 자연/식물)
                  TREE:     "#047857",  // 딥그린 (트리 = 진한 초록)
                }}
                dailySales={dailySales}
              />
            </div>
            <div className="text-xs text-gray-500 mt-1">
              
            </div>
          </div>

        </div>

        {/* 2) 버튼 2개 행 */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ActionCard
            title="상품관리"
            subtitle="상품 검색 / 등록 / 수정"
            icon={Boxes}
            onClick={() => navigate("/admin/item")}
          />
          <ActionCard
            title="회원관리"
            subtitle="회원 검색 / 관리"
            icon={Users}
            onClick={() => navigate("/admin/account")}
          />
        </div>

        {/* 3) 버튼 2개 행 */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ActionCard
            title="이벤트 관리하기"
            subtitle="이벤트 등록 / 편집"
            icon={Calendar}
            onClick={() => navigate("/admin/event")}
          />
          <ActionCard
            title="AI가 검열한 댓글 확인 (후순위)"
            subtitle="검열 대기 댓글 확인"
            disabled={true}
            icon={MessageSquareText}
            accent
            onClick={() => (console.log("구현되지 않은 기능"))}
          />
        </div>

        {/* 4) 관리자 접속 이력 */}
        <div className="mt-5 rounded-2xl bg-white/60 border border-gray-200/70 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-200/60">
            <div className="font-extrabold text-gray-900">관리자 접속 이력</div>
          </div>

          {/* 임시 빈 영역 */}
          <div className="p-5">
            <div className="rounded-2xl bg-white/50 border border-white/50 p-5 text-sm text-gray-600">
              아직 표시할 데이터가 없습니다.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
