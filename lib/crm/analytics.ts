export type ChartPoint = { label: string; value: number | null };
export function dailySeries(
  rows: { date: string; [key: string]: unknown }[],
  from: string,
  to: string,
  metric: string,
): ChartPoint[] {
  const first = Date.parse(from),
    last = Date.parse(to),
    count = Math.floor((last - first) / 86400000) + 1;
  if (!Number.isFinite(count) || count < 1 || count > 3660) return [];
  const step = Math.ceil(count / 30),
    buckets: ChartPoint[] = [];
  for (let i = 0; i < count; i += step) {
    const start = new Date(first + i * 86400000).toISOString().slice(0, 10),
      end = new Date(Math.min(last, first + (i + step - 1) * 86400000))
        .toISOString()
        .slice(0, 10);
    buckets.push({
      label: start === end ? start : `${start} → ${end}`,
      value: null,
    });
  }
  for (const row of rows) {
    const day = Math.floor((Date.parse(row.date) - first) / 86400000),
      value = row[metric];
    if (
      day >= 0 &&
      day < count &&
      typeof value === "number" &&
      Number.isFinite(value)
    ) {
      const index = Math.floor(day / step);
      buckets[index].value = (buckets[index].value ?? 0) + value;
    }
  }
  return buckets;
}
