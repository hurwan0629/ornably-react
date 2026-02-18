import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function RouteLogger() {
  const location = useLocation();
  const { status, user } = useAuth();

  useEffect(() => {
    console.log("🔁 route:", location.pathname);
    console.log("🧠 auth status:", status);
    console.log("👤 auth user:", user);
  }, [location.pathname]); // URL 바뀔 때마다 1번

  return null; // UI 없음(로그만)
}