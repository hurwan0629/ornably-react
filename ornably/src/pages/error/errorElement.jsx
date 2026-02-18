// src/pages/error/RootError.jsx
import { useRouteError, isRouteErrorResponse, useNavigate } from "react-router-dom";

export default function RootError() {
  const error = useRouteError();
  const navigate = useNavigate();

  let title = "문제가 발생했어요";
  let message = "잠시 후 다시 시도해주세요.";
  let status = 500;

  // React Router가 던진 에러(404, 403 등)
  if (isRouteErrorResponse(error)) {
    status = error.status;

    if (status === 404) {
      title = "페이지를 찾을 수 없어요";
      message = "주소가 잘못되었거나 페이지가 이동되었어요.";
    } else if (status === 403) {
      title = "접근 권한이 없어요";
      message = "이 페이지에 접근할 수 있는 권한이 없어요.";
    } else {
      message = error.statusText || message;
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f8f9fa",
        padding: "24px",
      }}
    >
      <div
        style={{
          maxWidth: "480px",
          width: "100%",
          background: "#fff",
          borderRadius: "12px",
          padding: "32px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: "48px", marginBottom: "12px" }}>
          {status}
        </h1>

        <h2 style={{ marginBottom: "12px" }}>
          {title}
        </h2>

        <p style={{ color: "#666", marginBottom: "24px" }}>
          {message}
        </p>

        <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
          <button
            onClick={() => navigate(-1)}
            style={btnStyle}
          >
            이전 페이지
          </button>

          <button
            onClick={() => navigate("/")}
            style={{ ...btnStyle, background: "#222", color: "#fff" }}
          >
            홈으로
          </button>
        </div>

        {/* 개발 환경에서만 디버그 정보 */}
        {import.meta.env.DEV && error && (
          <pre
            style={{
              marginTop: "24px",
              padding: "12px",
              background: "#f1f3f5",
              color: "#333",
              textAlign: "left",
              fontSize: "12px",
              overflow: "auto",
              borderRadius: "6px",
            }}
          >
            {JSON.stringify(error, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}

const btnStyle = {
  padding: "10px 16px",
  borderRadius: "8px",
  border: "none",
  background: "#e9ecef",
  cursor: "pointer",
};
