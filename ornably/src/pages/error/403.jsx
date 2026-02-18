// src/pages/403.jsx
import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext"; // ✅ 너 프로젝트 경로에 맞게 조정

export default function Forbidden403() {
  const navigate = useNavigate();
  const { isAuthed, role, authorities } = useAuth();

  const { targetPath, targetLabel, hint } = useMemo(() => {
    if (!isAuthed || !role) {
      return {
        targetPath: "/login",
        targetLabel: "로그인 페이지로 이동",
        hint: "로그인이 필요하거나 세션이 만료되었을 수 있어요.",
      };
    }

    switch (authorities[0]) {
      case "USER":
        return {
          targetPath: "/",
          targetLabel: "메인으로 이동",
          hint: "현재 페이지는 접근 권한이 없어요.",
        };
      case "ONBOARD":
        return {
          targetPath: "/onboard",
          targetLabel: "온보딩으로 이동",
          hint: "온보딩 상태에서는 온보딩 페이지에서 먼저 진행해 주세요.",
        };
      case "ADMIN":
        return {
          targetPath: "/admin",
          targetLabel: "관리자 페이지로 이동",
          hint: "관리자 권한 흐름으로 이동할게요.",
        };
      default:
        return {
          targetPath: "/",
          targetLabel: "홈으로 이동",
          hint: "알 수 없는 권한 상태라 홈으로 안내할게요.",
        };
    }
  }, [isAuthed, role]);

  const authorityText = authorities[0];

  return (
    <main className="min-h-[calc(100vh-0px)] flex items-center justify-center p-6 bg-gray-50">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-sm border border-gray-200 p-6">
        <div className="flex items-start gap-4">
          <div className="shrink-0 rounded-xl bg-gray-100 border border-gray-200 w-12 h-12 flex items-center justify-center">
            <span className="text-lg font-bold text-gray-700">403</span>
          </div>

          <div className="flex-1">
            <h1 className="text-xl font-semibold text-gray-900">
              접근 권한이 없어요
            </h1>
            <p className="mt-2 text-sm text-gray-600">{hint}</p>

            <div className="mt-4 rounded-xl bg-gray-50 border border-gray-200 p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-gray-700">
                  현재 상태:{" "}
                  <span className="font-semibold text-gray-900">
                    {isAuthed ? "로그인됨" : "로그인 안됨"}
                  </span>
                </span>
                <span className="text-sm text-gray-700">
                  권한:{" "}
                  <span className="font-semibold text-gray-900">
                    {authorityText}
                  </span>
                </span>
              </div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => navigate(targetPath, { replace: true })}
                className="inline-flex items-center justify-center rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 active:bg-gray-900"
              >
                {targetLabel}
              </button>

              <button
                onClick={() => navigate(-1)}
                className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50"
              >
                이전 페이지로
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
