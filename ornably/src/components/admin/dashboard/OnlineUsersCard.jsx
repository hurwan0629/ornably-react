// components/admin/dashboard/OnlineUsersCard.jsx
export default function OnlineUsersCard({ value, label = "현재 접속자 수" }) {
  const v = Number(value ?? 0);

  return (
    <div className="rounded-2xl bg-white/60 border border-gray-200/70 shadow-sm px-5 py-4">
      <div className="text-xs font-bold text-gray-500">{label}</div>
      <div className="mt-2 text-3xl font-extrabold text-gray-900">{v.toLocaleString("ko-KR")}</div>
    </div>
  );
}
