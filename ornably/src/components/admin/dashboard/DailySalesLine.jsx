// components/admin/dashboard/DailySalesLine.jsx
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { groupByNDayDailySales } from "../../../lib/dashboardAgg";

export default function DailySalesLine({
  dailySales = [],
  title = "일별 판매량",
  bucketDays = 1,          // ✅ n일 단위 (원하는 값 넣기)
  valueKey = "salesAmount", // "salesCount"도 가능
  height = 280,
}) {
  const grouped = groupByNDayDailySales(dailySales, bucketDays);

  const chartData = grouped.map((g) => ({
    name: g.rangeLabel,
    salesAmount: g.salesAmount,
    salesCount: g.salesCount,
  }));

  return (
    <div className="rounded-2xl bg-white/60 border border-gray-200/70 shadow-sm">
      <div className="px-5 py-4 border-b border-gray-200/60">
        <div className="font-extrabold text-gray-900">{title}</div>
        <div className="text-xs text-gray-500 mt-1">
          구간: {Number(bucketDays)}일 단위 / 기준: {valueKey === "salesCount" ? "판매건수" : "매출액 (만원)"}
        </div>
      </div>

      <div className="p-5" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tickMargin={8} />
            <YAxis tickMargin={8} />
            <Tooltip
              formatter={(v, name) => {
                const label = name === "salesAmount" ? "판매액" : (name === "salesCount" ? "판매건수" : name);
                return [Number(v).toLocaleString("ko-KR"), label];
              }}
              labelFormatter={(label) => `기간: ${label}`}
            />

            <Line type="monotone" dataKey={valueKey} strokeWidth={3} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
