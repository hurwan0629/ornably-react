// components/admin/dashboard/AdminDashboardView.jsx
import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  PieChart, Pie, Cell,
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";

function formatMoney(n) {
  const num = Number(n ?? 0);
  return num.toLocaleString("ko-KR", { maximumFractionDigits: 3 });
}
function formatMoneyTenThousand(n) {
  const num = (Number(n ?? 0)/10000).toFixed(1);
  return num.toLocaleString("ko-KR", { maximumFractionDigits: 3 });
}

function clampInt(n, min, max) {
  const x = Number(n);
  if (Number.isNaN(x)) return min;
  return Math.max(min, Math.min(max, Math.trunc(x)));
}

// n일 단위로 묶기: date(YYYY-MM-DD) 기준으로 앞에서부터 n개씩 묶는 단순 버전
function bucketDailySales(dailySales = [], bucketDays = 1) {
  const n = Math.max(1, bucketDays);
  const arr = [...dailySales];

  // 날짜 오름차순 정렬(백에서 이미 정렬해주면 없어도 됨)
  arr.sort((a, b) => String(a.date).localeCompare(String(b.date)));

  const out = [];
  for (let i = 0; i < arr.length; i += n) {
    const chunk = arr.slice(i, i + n);
    if (chunk.length === 0) continue;

    const start = chunk[0].date;
    const end = chunk[chunk.length - 1].date;

    const sumAmount = chunk.reduce((s, x) => s + Number(x.salesAmount ?? 0), 0);
    const sumCount = chunk.reduce((s, x) => s + Number(x.salesCount ?? 0), 0);

    out.push({
      key: `${start}~${end}`,
      label: start === end ? start.slice(5) : `${start.slice(5)} ~ ${end.slice(5)}`,
      salesAmount: sumAmount,
      salesCount: sumCount,
    });
  }
  return out;
}

export default function AdminDashboardView({
  onlineUsers = 0,
  categorySales = [],
  dailySales = [],
  categoryColorMap,
  pieColors,
  defaultBucketDays = 1,
  minBucketDays = 1,
  maxBucketDays = 30,
}) {
  const [bucketDays, setBucketDays] = useState(clampInt(defaultBucketDays, minBucketDays, maxBucketDays));

  const CATEGORIES = [
    { key: "all", label: "전체" },
    { key: "tree", label: "트리" },
    { key: "light", label: "전구" },
    { key: "ball", label: "볼" },
    { key: "figure", label: "피규어" },
    { key: "wreaths", label: "리스" },
    { key: "etc", label: "기타" },
  ];

  const CATEGORY_MAP = Object.fromEntries(
    CATEGORIES.map(c => [c.key, c.label])
  );

  const getCategoryLabel = (key) => CATEGORY_MAP[key.toLowerCase()] ?? key;

  const categoryRows = useMemo(() => {
    const rows = (categorySales ?? []).map((x) => ({
      category: getCategoryLabel(String(x.category ?? "-")),
      salesAmount: Number(x.salesAmount ?? 0),
      salesCount: Number(x.salesCount ?? 0),
    }));
    const totalAmount = rows.reduce((s, r) => s + r.salesAmount, 0);
    const totalCount = rows.reduce((s, r) => s + r.salesCount, 0);
    return { rows, totalAmount, totalCount };
  }, [categorySales]);

  const lineData = useMemo(() => bucketDailySales(dailySales, bucketDays), [dailySales, bucketDays]);

  const defaultPiePalette = [
    "#4F46E5", "#06B6D4", "#F59E0B", "#EF4444",
    "#22C55E", "#A855F7", "#64748B", "#F97316",
  ];

  const getCategoryColor = (row, idx) => {
    if (row?.fill) return row.fill;
    if (categoryColorMap && categoryColorMap[row?.category]) return categoryColorMap[row.category];
    if (Array.isArray(pieColors) && pieColors.length) return pieColors[idx % pieColors.length];
    return defaultPiePalette[idx % defaultPiePalette.length];
  };

  return (
    <div className="space-y-5">
      {/* 1) 현재 접속자 수 (한 행) */}
      <div className="w-full">
        <div className="rounded-2xl border bg-white shadow-sm p-5">
          <div className="text-sm font-semibold text-gray-600">현재 접속자 수</div>
          <div className="mt-2 text-4xl font-extrabold text-gray-900">{Number(onlineUsers ?? 0)}</div>
        </div>
      </div>

      {/* 2) 카테고리별 판매 비율 (한 행: 카드 자체는 full, 내부만 좌/우) */}
      <div className="w-full">
        <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b">
            <div className="font-extrabold text-gray-900">카테고리별 판매 비율</div>
            <div className="text-xs text-gray-500 mt-1">기준: 매출액</div>
          </div>

          <div className="p-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
              {/* 도넛 */}
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryRows.rows}
                      dataKey="salesAmount"
                      nameKey="category"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                    >
                      {categoryRows.rows.map((row, idx) => (
                        <Cell key={idx} fill={getCategoryColor(row, idx)} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => `${formatMoneyTenThousand(v)} 만원`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* 표 */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-gray-500">
                    <tr className="text-left">
                      <th className="py-2 pr-3">카테고리</th>
                      <th className="py-2 pr-3 text-right">매출액 (만원)</th>
                      <th className="py-2 text-right">판매량</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-900">
                    {categoryRows.rows.map((r) => (
                      <tr key={r.category} className="border-t">
                        <td className="py-3 pr-3 font-semibold">{r.category}</td>
                        <td className="py-3 pr-3 text-right">{formatMoneyTenThousand(r.salesAmount)}</td>
                        <td className="py-3 text-right">{r.salesCount}</td>
                      </tr>
                    ))}
                    <tr className="border-t font-extrabold">
                      <td className="py-3 pr-3">합계</td>
                      <td className="py-3 pr-3 text-right">{formatMoneyTenThousand(categoryRows.totalAmount)}</td>
                      <td className="py-3 text-right">{formatMoney(categoryRows.totalCount)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3) n일 단위 입력 (한 행) */}
      <div className="w-full flex items-center gap-3">
        <div className="text-sm font-semibold text-gray-700">n일 단위</div>
        <input
          type="number"
          min={minBucketDays}
          max={maxBucketDays}
          value={bucketDays}
          onChange={(e) => setBucketDays(clampInt(e.target.value, minBucketDays, maxBucketDays))}
          className="w-28 rounded-xl border px-3 py-2 bg-white"
        />
      </div>

      {/* 4) 일별 판매량 (한 행: full width) */}
      <div className="w-full">
        <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b">
            <div className="font-extrabold text-gray-900">일별 판매량</div>
            <div className="text-xs text-gray-500 mt-1">구간: {bucketDays}일 단위 / 기준: 매출액 (만원)</div>
          </div>

          <div className="p-5">
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip formatter={(v) => `${formatMoney(v)}만원`} />
                  <Line type="monotone" dataKey="salesAmount" dot />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
