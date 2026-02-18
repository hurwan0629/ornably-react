// components/admin/dashboard/CategorySalesPie.jsx
import {
  PieChart,
  Pie,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from "recharts";

function safeNum(x) {
  const n = Number(x ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export default function CategorySalesPie({
  data = [],
  title = "카테고리별 판매 비율",
  valueKey = "salesAmount", // "salesCount" 로 바꿔도 됨
  height = 260,
}) {
  const CATEGORY_COLOR_MAP = {
    WREATHS: "#6d5efc",
    CANDLES: "#f4c97a",
    DIFFUSER: "#34d399",
  };
  const COLORS = ["#6d5efc", "#f4c97a", "#34d399", "#f87171", "#60a5fa"];

  const rows = (Array.isArray(data) ? data : []).map((r) => ({
    category: String(r?.category ?? "-"),
    salesAmount: safeNum(r?.salesAmount),
    salesCount: safeNum(r?.salesCount),
  }));

  const total = rows.reduce((acc, r) => acc + safeNum(r[valueKey]), 0);

  const chartData = rows.map((r) => ({
    name: r.category,
    value: safeNum(r[valueKey]),
    salesAmount: r.salesAmount,
    salesCount: r.salesCount,
    ratio: total <= 0 ? 0 : (safeNum(r[valueKey]) / total) * 100,
  }));

  return (
    <div className="rounded-2xl bg-white/60 border border-gray-200/70 shadow-sm">
      <div className="px-5 py-4 border-b border-gray-200/60">
        <div className="font-extrabold text-gray-900">{title}</div>
        <div className="text-xs text-gray-500 mt-1">
          기준: {valueKey === "salesCount" ? "판매건수" : "매출액"}
        </div>
      </div>

      <div className="p-5 grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">
        {/* 차트 */}
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={70} outerRadius={105}>
                {chartData.map((entry, idx) => (
                  <Cell
                    key={entry.name}
                    fill={CATEGORY_COLOR_MAP[entry.name] ?? COLORS[idx % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip formatter={(v) => [`${(Number(v)/10000).toLocaleString("ko-KR")} 만원`, "판매액"]} />

              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* 표 */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="py-2 pr-3">카테고리</th>
                <th className="py-2 pr-3">매출액</th>
                <th className="py-2 pr-3">판매건수</th>
                <th className="py-2 pr-3">비율</th>
              </tr>
            </thead>
            <tbody>
              {chartData.map((r) => (
                <tr key={r.name} className="border-t border-gray-200/60">
                  <td className="py-2 pr-3 font-bold text-gray-900">{r.name}</td>
                  <td className="py-2 pr-3 text-gray-700">{r.salesAmount/10000 } 만원</td>
                  <td className="py-2 pr-3 text-gray-700">{r.salesCount.toLocaleString("ko-KR")}</td>
                  <td className="py-2 pr-3 text-gray-700">{r.ratio.toFixed(1)}%</td>
                </tr>
              ))}
              <tr className="border-t border-gray-200/60">
                <td className="py-2 pr-3 font-extrabold text-gray-900">합계</td>
                <td className="py-2 pr-3 font-extrabold text-gray-900">
                  {(rows.reduce((a, r) => a + r.salesAmount, 0) / 10000).toLocaleString("ko-KR")} 만원
                </td>
                <td className="py-2 pr-3 font-extrabold text-gray-900">
                  {rows.reduce((a, r) => a + r.salesCount, 0).toLocaleString("ko-KR")}
                </td>
                <td className="py-2 pr-3 text-gray-500">-</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
