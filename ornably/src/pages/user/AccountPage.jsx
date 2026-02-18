// src/pages/user/AccountPage.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiHeart, FiShoppingCart, FiStar, FiList, FiMapPin, FiLogOut} from "react-icons/fi";

import axios from "axios";
import Container from "../../components/common/Container";
import { useAuth } from "../../auth/AuthContext"

const API = "http://localhost:8088";

/* ===================== utils ===================== */
function formatDateYYYYMMDD(s) {
  if (!s) return "-";
  // 서버가 YYYY-MM-DD 주는 전제
  return String(s);
}

function formatMoneyKR(n) {
  const num = Number(n ?? 0);
  if (Number.isNaN(num)) return "-";
  return num.toLocaleString("ko-KR") + "원";
}

function formatPhoneKR(phone) {
  const p = String(phone ?? "").replace(/\D/g, "");
  if (p.length === 11) return `${p.slice(0, 3)}-${p.slice(3, 7)}-${p.slice(7)}`;
  if (p.length === 10) return `${p.slice(0, 3)}-${p.slice(3, 6)}-${p.slice(6)}`;
  return phone || "-";
}

function getApiErrorMessage(err) {
  const msg = err?.response?.data?.message;
  if (msg) return msg;
  const status = err?.response?.status;
  if (status === 401) return "로그인이 필요합니다.";
  if (status === 403) return "접근 권한이 없습니다.";
  if (status === 404) return "회원 정보를 찾을 수 없습니다.";
  if (status === 410) return "탈퇴한 회원의 정보입니다.";
  return "요청 중 오류가 발생했습니다.";
}

/* ===================== UI atoms ===================== */
function Card({ children, className = "" }) {
  return (
    <div className={["rounded-2xl border bg-white shadow-sm", className].join(" ")}>
      {children}
    </div>
  );
}

function CardHeader({ title, desc, right }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b px-5 py-4">
      <div>
        <div className="text-base font-semibold">{title}</div>
        {desc ? <div className="mt-0.5 text-sm text-gray-500">{desc}</div> : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-sm font-medium text-gray-900">{value}</div>
    </div>
  );
}

function ActionButton({ title, desc, onClick, tone = "default", icon }) {
  const toneCls =
    tone === "danger"
      ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
      : "border-gray-200 bg-gray-50 text-gray-900 hover:bg-gray-100";

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full rounded-2xl border px-4 py-4 text-left transition",
        "flex items-center gap-4",
        toneCls,
      ].join(" ")}
    >
      {/* 아이콘 영역 */}
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border">
        {icon}
      </div>

      {/* 텍스트 */}
      <div className="flex-1">
        <div className="text-sm font-semibold">{title}</div>
        {desc ? <div className="mt-1 text-xs text-gray-500">{desc}</div> : null}
      </div>

      {/* 화살표 */}
      <span className="text-gray-400">›</span>
    </button>
  );
}


function Skeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-4 w-40 rounded bg-gray-200" />
      <div className="h-4 w-56 rounded bg-gray-200" />
      <div className="h-4 w-48 rounded bg-gray-200" />
      <div className="h-4 w-52 rounded bg-gray-200" />
      <div className="h-4 w-44 rounded bg-gray-200" />
    </div>
  );
}

/* ===================== page ===================== */
export default function AccountPage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [account, setAccount] = useState(null);
  const { role } = useAuth();

  const loadMyPage = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await axios.get(`${API}/api/user/account/mypage`, {
        withCredentials: true,
      });
      setAccount(res?.data?.accountData ?? null);
    } catch (err) {
      setAccount(null);
      setErrorMsg(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMyPage();
  }, []);

  const info = useMemo(() => {
    const a = account ?? {};
    return [
      { label: "아이디", value: a.accountId ?? "-" },
      { label: "이름", value: a.accountName ?? "-" },
      { label: "이메일", value: a.accountEmail ?? "-" },
      { label: "전화번호", value: formatPhoneKR(a.accountPhone) },
      { label: "가입일", value: formatDateYYYYMMDD(a.accountDate) },
      { label: "총 구매금액", value: formatMoneyKR(a.accountTotalAmount) },
    ];
  }, [account]);

  return (
    <div className="bg-gray-50">
      <Container>
        <div className="py-6">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <div className="text-lg font-bold text-gray-900">마이페이지</div>
              <div className="mt-1 text-sm text-gray-500">내 정보와 활동 메뉴를 확인할 수 있어요.</div>
            </div>

            <button
              type="button"
              onClick={loadMyPage}
              className="rounded-full border bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              새로고침
            </button>
          </div>

          {errorMsg ? (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMsg}
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* 내 정보 카드 */}
            <Card>
              <CardHeader
                title="내 정보"
                desc="회원 정보를 확인합니다."
                right={
                  <span className="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium text-gray-600">
                    { role }
                  </span>
                }
              />
              <div className="px-5 py-4">
                {loading ? (
                  <Skeleton />
                ) : (
                  <div className="divide-y">
                    {info.map((row) => (
                      <InfoRow key={row.label} label={row.label} value={row.value} />
                    ))}
                  </div>
                )}
              </div>
            </Card>

            {/* 메뉴 */}
            <div className="space-y-3">
              <ActionButton
                title="내 찜목록"
                desc="좋아요 누른 상품을 확인해요"
                icon={<FiHeart className="text-lg" />}
                onClick={() => navigate("/account/wishlist")}
              />
              <ActionButton
                title="장바구니"
                desc="장바구니에 담긴 상품을 확인하세요"
                icon={<FiShoppingCart className="text-lg" />}
                onClick={() => navigate("/account/cart")}
              />
              <ActionButton
                title="내가 쓴 리뷰"
                desc="내 리뷰 목록을 확인해요"
                icon={<FiStar className="text-lg" />}
                onClick={() => navigate("/account/review")}
              />
              <ActionButton
                title="주문 내역 보기"
                desc="주문/결제 내역을 확인해요"
                icon={<FiList className="text-lg" />}
                onClick={() => navigate("/account/order")}
              />
              <ActionButton
                title="내 배송지 목록 보기"
                desc="배송지를 추가/관리해요"
                icon={<FiMapPin className="text-lg" />}
                onClick={() => navigate("/account/address")}
              />
              <ActionButton
                title="회원탈퇴"
                desc="진짜 나가진 않겠죠?"
                icon={<FiLogOut className="text-lg" />}
                tone="danger"
                onClick={() => navigate("/account/withdraw")}
              />
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}
