import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Container from "../../components/common/Container";
import { Home, TriangleAlert } from "lucide-react";

export default function NotFound404() {
  const navigate = useNavigate();
  const timerRef = useRef(null);
  const [seconds, setSeconds] = useState(3);
  const [canceled, setCanceled] = useState(false);

  useEffect(() => {
    if (canceled) return;

    // 카운트다운 표시
    const tick = setInterval(() => {
      setSeconds((s) => Math.max(0, s - 1));
    }, 1000);

    // 자동 이동
    timerRef.current = setTimeout(() => {
      navigate("/", { replace: true });
    }, 3000);

    return () => {
      clearInterval(tick);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [canceled, navigate]);

  const onCancel = () => {
    setCanceled(true);
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  return (
    <div className="min-h-[calc(100vh-120px)] bg-[#f6f4ff] py-10">
      <Container>
        <div className="mx-auto max-w-2xl rounded-[28px] bg-white/70 backdrop-blur-md shadow-[0_10px_40px_rgba(17,24,39,0.10)] border border-white/60">
          <div className="p-8 sm:p-10 text-center">
            <div className="mx-auto h-14 w-14 rounded-2xl bg-white shadow-sm border border-gray-200 flex items-center justify-center">
              <TriangleAlert className="h-7 w-7 text-gray-800" />
            </div>

            <div className="mt-5 text-3xl font-extrabold tracking-tight text-gray-900">
              404
            </div>
            <div className="mt-2 text-base text-gray-600">
              요청한 페이지를 찾을 수 없어요.
            </div>

            {!canceled ? (
              <div className="mt-3 text-sm text-gray-500">
                <span className="font-semibold text-gray-800">{seconds}</span>초
                후 홈으로 이동합니다.
              </div>
            ) : (
              <div className="mt-3 text-sm text-gray-500">
                자동 이동이 취소됐어요.
              </div>
            )}

            <div className="mt-7 flex flex-col sm:flex-row gap-2 justify-center">
              <Link
                to="/"
                className="inline-flex items-center justify-center gap-2 h-11 rounded-full bg-[#7c3aed] px-5 text-sm font-semibold text-white shadow-sm hover:opacity-90"
              >
                <Home className="h-4 w-4" />
                홈으로 가기
              </Link>

              {!canceled ? (
                <button
                  type="button"
                  onClick={onCancel}
                  className="inline-flex items-center justify-center h-11 rounded-full border border-gray-200 bg-white px-5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
                >
                  자동 이동 취소
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="inline-flex items-center justify-center h-11 rounded-full border border-gray-200 bg-white px-5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
                >
                  뒤로 가기
                </button>
              )}
            </div>

            <div className="mt-6 text-xs text-gray-400">
              주소가 잘못되었거나, 페이지가 이동/삭제되었을 수 있어요.
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}
