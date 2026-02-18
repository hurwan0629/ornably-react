// utils/dashboardAgg.js
export function groupByNDayDailySales(dailySales = [], n = 1) {
  const N = Math.max(1, Number(n || 1));

  // dailySales: [{ date: "2026-02-01", salesAmount: 12345, salesCount: 10 }, ...]
  // date는 YYYY-MM-DD 권장
  const sorted = [...dailySales].sort((a, b) => String(a.date).localeCompare(String(b.date)));

  const out = [];
  for (let i = 0; i < sorted.length; i += N) {
    const chunk = sorted.slice(i, i + N);
    if (chunk.length === 0) continue;

    const start = chunk[0]?.date;
    const end = chunk[chunk.length - 1]?.date;

    const sumAmount = chunk.reduce((acc, cur) => acc + Number(cur?.salesAmount ?? 0), 0);
    const sumCount = chunk.reduce((acc, cur) => acc + Number(cur?.salesCount ?? 0), 0);

    out.push({
      // 라벨은 "02-01 ~ 02-07" 같은 형태로 쓰기 좋음
      rangeLabel: formatRangeLabel(start, end),
      startDate: start,
      endDate: end,
      salesAmount: sumAmount,
      salesCount: sumCount,
    });
  }
  return out;
}

function formatRangeLabel(start, end) {
  const s = shortMD(start);
  const e = shortMD(end);
  return s === e ? s : `${s} ~ ${e}`;
}

function shortMD(dateStr) {
  // "2026-02-01" -> "02-01"
  const d = String(dateStr || "");
  const m = d.slice(5, 7);
  const day = d.slice(8, 10);
  if (!m || !day) return d;
  return `${m}-${day}`;
}
