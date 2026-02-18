// src/layouts/GuestLayout.jsx
import { Outlet } from "react-router-dom";
import Header from "../components/common/Header";

export default function GuestLayout() {
  return (
    <div className="min-h-screen bg-[#f6f4ff]">
      <Header />
      <Outlet />
    </div>
  );
}