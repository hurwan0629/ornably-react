import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../auth/AuthContext";

const API_BASE = import.meta.env?.VITE_API_BASE_URL ?? "http://localhost:8088";

export default function AdminLoginPage() {
  const navigate = useNavigate();

  const { loadMe } = useAuth();

  const [form, setForm] = useState({
    accountId: "",
    accountPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  function validate() {
    if (!form.accountId.trim()) return "아이디를 입력해주세요.";
    if (!form.accountPassword.trim()) return "비밀번호를 입력해주세요.";
    return "";
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const msg = validate();
    if (msg) {
      setError(msg);
      return;
    }

    try {
      setLoading(true);

      await axios.post(
        `${API_BASE}/login`,
        new URLSearchParams({
          username: form.accountId,     // 🔥 Spring Security 기본 키
          password: form.accountPassword,
        }),
        {
          withCredentials: true,
        }
      );
      console.log("로그인 성공");
      loadMe();
      // 로그인 성공
      navigate("/admin");
    } catch (err) {
      const status = err?.response?.status;

      if (status === 400) {
        setError("요청 값이 올바르지 않습니다.");
      } else if (status === 401) {
        setError("아이디 또는 비밀번호가 올바르지 않습니다.");
      } else if (status === 403) {
        setError("사용할 수 없는 계정입니다.");
      } else {
        setError("로그인 처리 중 오류가 발생했습니다.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white rounded-xl shadow-md p-8"
      >
        <h1 className="text-2xl font-bold text-center mb-6">
          관리자 로그인
        </h1>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">아이디</label>
          <input
            name="accountId"
            value={form.accountId}
            onChange={handleChange}
            className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring"
            placeholder="admin"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">비밀번호</label>
          <input
            type="password"
            name="accountPassword"
            value={form.accountPassword}
            onChange={handleChange}
            className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring"
            placeholder="••••••••"
          />
        </div>

        {error && (
          <div className="mb-4 text-sm text-red-600">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white py-2 rounded-md hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? "로그인 중..." : "로그인"}
        </button>
      </form>
    </div>
  );
}
