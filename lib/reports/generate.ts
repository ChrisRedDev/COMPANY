import type { WorkspaceData, Deal } from "../crm/model";
import { insights, pipelineStats } from "../crm/insights";
import {
  presetLabels,
  reportKindLabels,
  type ReportData,
  type ReportKind,
  type ReportKpi,
  type ReportPreset,
} from "../automation/model";

const DAY = 86400000;
const pln = (v: number) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "PLN",
    maximumFractionDigits: 0,
  }).format(v);
const num = (v: number) =>
  new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 }).format(v);
function shift(day: string, days: number) {
  return new Date(Date.parse(`${day}T12:00:00Z`) + days * DAY)
    .toISOString()
    .slice(0, 10);
}
function span(from: string, to: string) {
  return Math.round((Date.parse(to) - Date.parse(from)) / DAY) + 1;
}

export function periodRange(preset: ReportPreset, today: string) {
  const [y, m] = today.split("-").map(Number);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  switch (preset) {
    case "7d":
      return { from: shift(today, -6), to: today };
    case "30d":
      return { from: shift(today, -29), to: today };
    case "month":
      return { from: iso(new Date(Date.UTC(y, m - 1, 1))), to: today };
    case "prev_month":
      return {
        from: iso(new Date(Date.UTC(y, m - 2, 1))),
        to: iso(new Date(Date.UTC(y, m - 1, 0))),
      };
    case "quarter":
      return {
        from: iso(new Date(Date.UTC(y, Math.floor((m - 1) / 3) * 3, 1))),
        to: today,
      };
    case "ytd":
      return { from: `${y}-01-01`, to: today };
  }
}
export function previousRange(range: { from: string; to: string }) {
  const days = span(range.from, range.to);
  return { from: shift(range.from, -days), to: shift(range.from, -1) };
}
const within = (d: string, r: { from: string; to: string }) =>
  d.slice(0, 10) >= r.from && d.slice(0, 10) <= r.to;

function salesFigures(data: WorkspaceData, r: { from: string; to: string }) {
  const sales = data.deals.filter((d) => !d.service);
  const won = sales.filter(
    (d) => d.stage === "Wygrana" && within(d.closeDate, r),
  );
  const lost = sales.filter(
    (d) => d.stage === "Przegrana" && within(d.closeDate, r),
  );
  return {
    won,
    lost,
    wonValue: won.reduce((s, d) => s + d.value, 0),
    winRate:
      won.length + lost.length
        ? Math.round((won.length / (won.length + lost.length)) * 100)
        : null,
  };
}
function activityFigures(data: WorkspaceData, r: { from: string; to: string }) {
  const tasks = data.tasks.filter((t) => within(t.date, r));
  const mails = data.mails.filter(
    (m) =>
      ["accepted", "external"].includes(m.status) &&
      within(m.sentAt ?? m.created, r),
  );
  return {
    tasks,
    done: tasks.filter((t) => t.done).length,
    mails,
    firms: data.firms.filter((f) => within(f.created, r)),
  };
}
function serviceFigures(data: WorkspaceData, r: { from: string; to: string }) {
  const jobs = data.deals.filter(
    (d) => d.service && within(d.service.start, r),
  );
  const completed = jobs.filter((d) => d.service!.status === "completed");
  return {
    jobs,
    completed,
    cancelled: jobs.filter((d) => d.service!.status === "cancelled"),
    revenue: completed.reduce((s, d) => s + d.value, 0),
  };
}

function weekly(
  r: { from: string; to: string },
  items: { date: string; value: number }[],
) {
  const days = span(r.from, r.to);
  const monthLabel = (key: string) =>
    new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" })
      .format(new Date(`${key}-15T12:00:00Z`))
      .replace(".", "");
  if (days > 70) {
    const buckets = new Map<string, number>();
    for (
      let key = r.from.slice(0, 7);
      key <= r.to.slice(0, 7);
      key = new Date(Date.parse(`${key}-15T12:00:00Z`) + 31 * DAY)
        .toISOString()
        .slice(0, 7)
    )
      buckets.set(key, 0);
    for (const item of items)
      if (within(item.date, r)) {
        const key = item.date.slice(0, 7);
        buckets.set(key, (buckets.get(key) ?? 0) + item.value);
      }
    return [...buckets.entries()].map(([key, value]) => ({
      label: monthLabel(key),
      value,
    }));
  }
  const bucketDays = days <= 14 ? 1 : 7;
  const buckets: { label: string; value: number }[] = [];
  for (let start = r.from; start <= r.to; start = shift(start, bucketDays))
    buckets.push({
      value: 0,
      label: new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
        timeZone: "UTC",
      }).format(new Date(`${start}T12:00:00Z`)),
    });
  for (const item of items) {
    if (!within(item.date, r)) continue;
    const index = Math.min(
      buckets.length - 1,
      Math.floor((span(r.from, item.date.slice(0, 10)) - 1) / bucketDays),
    );
    if (buckets[index]) buckets[index].value += item.value;
  }
  return buckets;
}

function dealRow(d: Deal, firm: (id: string) => string) {
  return [d.name, firm(d.companyId), d.stage, pln(d.value), d.closeDate];
}

export function generateReport(
  data: WorkspaceData,
  kind: ReportKind,
  preset: ReportPreset,
  today: string,
  range = periodRange(preset, today),
): ReportData {
  const prev = previousRange(range);
  const firm = (id: string) => data.firms.find((f) => f.id === id)?.name ?? "—";
  const stats = pipelineStats(data);
  const s = salesFigures(data, range),
    sp = salesFigures(data, prev),
    a = activityFigures(data, range),
    ap = activityFigures(data, prev),
    v = serviceFigures(data, range),
    vp = serviceFigures(data, prev);
  const open = data.deals.filter(
    (d) => !d.service && !["Wygrana", "Przegrana"].includes(d.stage),
  );
  const overdue = data.tasks.filter((t) => !t.done && t.date < today);
  const kpis: ReportKpi[] = [];
  const charts: ReportData["charts"] = [];
  const tables: ReportData["tables"] = [];
  const highlights: string[] = [];
  const salesKpis: ReportKpi[] = [
    {
      label: "Wygrana sprzedaż",
      value: s.wonValue,
      previous: sp.wonValue,
      format: "money",
    },
    {
      label: "Wygrane szanse",
      value: s.won.length,
      previous: sp.won.length,
      format: "number",
    },
    {
      label: "Skuteczność",
      value: s.winRate ?? 0,
      previous: sp.winRate,
      format: "percent",
      hint: s.winRate === null ? "Brak zamkniętych szans" : undefined,
    },
    { label: "Prognoza ważona", value: stats.forecast, format: "money" },
  ];
  const activityKpis: ReportKpi[] = [
    {
      label: "Zadania w okresie",
      value: a.tasks.length,
      previous: ap.tasks.length,
      format: "number",
    },
    {
      label: "Wykonane zadania",
      value: a.tasks.length ? Math.round((a.done / a.tasks.length) * 100) : 0,
      previous: ap.tasks.length
        ? Math.round((ap.done / ap.tasks.length) * 100)
        : null,
      format: "percent",
    },
    {
      label: "Wysłane wiadomości",
      value: a.mails.length,
      previous: ap.mails.length,
      format: "number",
    },
    {
      label: "Nowe firmy",
      value: a.firms.length,
      previous: ap.firms.length,
      format: "number",
    },
  ];
  const serviceKpis: ReportKpi[] = [
    {
      label: "Przychód z realizacji",
      value: v.revenue,
      previous: vp.revenue,
      format: "money",
    },
    {
      label: "Zlecenia w okresie",
      value: v.jobs.length,
      previous: vp.jobs.length,
      format: "number",
    },
    {
      label: "Zakończone",
      value: v.completed.length,
      previous: vp.completed.length,
      format: "number",
    },
    {
      label: "Anulowane",
      value: v.cancelled.length,
      previous: vp.cancelled.length,
      format: "number",
    },
  ];
  const stageChart = {
    title: "Otwarty lejek według etapu",
    format: "money" as const,
    items: ["Nowa", "Rozmowa", "Oferta"].map((stage) => ({
      label: stage,
      value: open
        .filter((d) => d.stage === stage)
        .reduce((x, d) => x + d.value, 0),
    })),
  };
  const wonChart = {
    title: "Wygrana sprzedaż w czasie",
    format: "money" as const,
    items: weekly(
      range,
      s.won.map((d) => ({ date: d.closeDate, value: d.value })),
    ),
  };
  const taskChart = {
    title: "Zadania w czasie",
    format: "number" as const,
    items: weekly(
      range,
      a.tasks.map((t) => ({ date: t.date, value: 1 })),
    ),
  };
  if (kind === "sales" || kind === "executive") {
    kpis.push(...salesKpis);
    charts.push(wonChart, stageChart);
    if (s.won.length)
      tables.push({
        title: "Wygrane w okresie",
        columns: ["Szansa", "Firma", "Etap", "Wartość", "Data"],
        rows: [...s.won]
          .sort((x, y) => y.value - x.value)
          .slice(0, 10)
          .map((d) => dealRow(d, firm)),
      });
    const upcoming = open
      .filter((d) => d.closeDate >= today && d.closeDate <= shift(today, 30))
      .sort((x, y) => x.closeDate.localeCompare(y.closeDate));
    if (upcoming.length)
      tables.push({
        title: "Do zamknięcia w 30 dni",
        columns: ["Szansa", "Firma", "Etap", "Wartość", "Termin"],
        rows: upcoming.slice(0, 10).map((d) => dealRow(d, firm)),
      });
    highlights.push(
      `Otwarty lejek: ${open.length} szans o wartości ${pln(stats.openValue)}, prognoza ważona ${pln(stats.forecast)}.`,
      s.won.length
        ? `W okresie wygrano ${s.won.length} szans na ${pln(s.wonValue)}${sp.wonValue ? ` (poprzednio ${pln(sp.wonValue)})` : ""}.`
        : "W okresie nie zamknięto żadnej wygranej szansy.",
    );
  }
  if (kind === "activity" || kind === "executive") {
    kpis.push(
      ...(kind === "executive" ? activityKpis.slice(0, 2) : activityKpis),
    );
    charts.push(taskChart);
    highlights.push(
      `Zadania w okresie: ${a.tasks.length}, wykonane: ${a.done}. Zaległe na dziś: ${overdue.length}.`,
    );
    if (kind === "activity" && overdue.length)
      tables.push({
        title: "Zaległe zadania",
        columns: ["Zadanie", "Firma", "Termin"],
        rows: overdue
          .sort((x, y) => x.date.localeCompare(y.date))
          .slice(0, 15)
          .map((t) => [t.title, firm(t.companyId), t.date]),
      });
  }
  if (kind === "services" || (kind === "executive" && v.jobs.length)) {
    kpis.push(
      ...(kind === "executive" ? serviceKpis.slice(0, 2) : serviceKpis),
    );
    const resources = new Map<string, number>();
    for (const d of v.jobs)
      resources.set(
        d.service!.resource,
        (resources.get(d.service!.resource) ?? 0) + 1,
      );
    charts.push({
      title: "Zlecenia według zasobu",
      format: "number",
      items: [...resources.entries()]
        .sort((x, y) => y[1] - x[1])
        .slice(0, 8)
        .map(([label, value]) => ({ label, value })),
    });
    if (kind === "services")
      tables.push({
        title: "Zlecenia w okresie",
        columns: ["Zlecenie", "Klient", "Status", "Wartość", "Start"],
        rows: v.jobs
          .slice(0, 20)
          .map((d) => [
            d.name,
            firm(d.companyId),
            d.service!.status,
            pln(d.value),
            d.service!.start.replace("T", " "),
          ]),
      });
    highlights.push(
      `Zlecenia: ${v.jobs.length}, zakończone ${v.completed.length}, przychód ${pln(v.revenue)}.`,
    );
  }
  const recommendations = insights(data, today)
    .filter((i) => i.tone !== "green")
    .slice(0, 5)
    .map((i) => `${i.title} — ${i.detail}`);
  if (!recommendations.length)
    recommendations.push(
      "Brak ryzyk w danych. Skup się na pozyskaniu nowych szans i follow-upach.",
    );
  const label = `${presetLabels[preset]} · ${range.from} – ${range.to}`;
  return {
    kind,
    title: reportKindLabels[kind],
    period: { ...range, label },
    kpis,
    charts: charts.filter((c) => c.items.length),
    tables,
    highlights,
    recommendations,
  };
}

export function formatKpi(k: Pick<ReportKpi, "value" | "format">) {
  return k.format === "money"
    ? pln(k.value)
    : k.format === "percent"
      ? `${num(k.value)}%`
      : num(k.value);
}
export function kpiDelta(k: ReportKpi) {
  if (k.previous === undefined || k.previous === null) return null;
  if (k.format === "percent") return k.value - k.previous;
  if (!k.previous) return k.value ? 100 : 0;
  return Math.round(((k.value - k.previous) / Math.abs(k.previous)) * 100);
}

export function reportMarkdown(r: ReportData, summary?: string) {
  const lines = [
    `# ${r.title}`,
    "",
    `**Okres:** ${r.period.label}`,
    "",
    "## Kluczowe wskaźniki",
    "",
    "| Wskaźnik | Wartość | Zmiana |",
    "| --- | --- | --- |",
    ...r.kpis.map((k) => {
      const d = kpiDelta(k);
      return `| ${k.label} | ${formatKpi(k)} | ${d === null ? "—" : `${d > 0 ? "+" : ""}${d}${k.format === "percent" ? " pp" : "%"}`} |`;
    }),
  ];
  if (summary) lines.push("", "## Podsumowanie AI", "", summary);
  lines.push(
    "",
    "## Najważniejsze fakty",
    "",
    ...r.highlights.map((h) => `- ${h}`),
  );
  for (const c of r.charts)
    lines.push(
      "",
      `## ${c.title}`,
      "",
      ...c.items.map(
        (i) =>
          `- ${i.label}: ${c.format === "money" ? pln(i.value) : num(i.value)}`,
      ),
    );
  for (const t of r.tables)
    lines.push(
      "",
      `## ${t.title}`,
      "",
      `| ${t.columns.join(" | ")} |`,
      `| ${t.columns.map(() => "---").join(" | ")} |`,
      ...t.rows.map(
        (row) => `| ${row.map((c) => c.replace(/\|/g, "/")).join(" | ")} |`,
      ),
    );
  lines.push(
    "",
    "## Rekomendacje",
    "",
    ...r.recommendations.map((x) => `- ${x}`),
    "",
    "_Wygenerowano w Evolution Growth OS._",
  );
  return lines.join("\n");
}

export function reportCsv(r: ReportData) {
  const esc = (v: string) =>
    /[";\n]/.test(v) || /^[=+\-@]/.test(v)
      ? `"${(/^[=+\-@]/.test(v) ? "'" : "") + v.replace(/"/g, '""')}"`
      : v;
  const rows: string[][] = [
    ["Raport", r.title],
    ["Okres", r.period.label],
    [],
    ["Wskaźnik", "Wartość", "Poprzedni okres"],
    ...r.kpis.map((k) => [
      k.label,
      String(Math.round(k.value * 100) / 100),
      k.previous === undefined || k.previous === null
        ? ""
        : String(Math.round(k.previous * 100) / 100),
    ]),
  ];
  for (const t of r.tables) rows.push([], [t.title], t.columns, ...t.rows);
  return "﻿" + rows.map((row) => row.map(esc).join(";")).join("\n");
}
