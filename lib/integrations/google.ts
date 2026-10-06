import "server-only";
import { apiJson, IntegrationError } from "./http";
import { googleToken } from "./google-auth";
import {
  validateResource,
  type GoogleProvider,
  type Resource,
  type IntegrationResult,
  type GoogleReport,
} from "./model";
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new IntegrationError(
      "Google zwróciło nieprawidłową strukturę raportu.",
    );
  return value as Record<string, unknown>;
}
function number(value: unknown, negative = false) {
  if (
    (typeof value !== "string" && typeof value !== "number") ||
    value === "" ||
    !Number.isFinite(Number(value)) ||
    (!negative && Number(value) < 0) ||
    Math.abs(Number(value)) > 1e15
  )
    throw new IntegrationError(
      "Google zwróciło nieprawidłową wartość metryki.",
    );
  return Number(value);
}
function period(lag: number) {
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Europe/Warsaw",
  });
  const end = new Date(`${today}T12:00:00Z`);
  end.setUTCDate(end.getUTCDate() - lag);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 29);
  return {
    from: start.toISOString().slice(0, 10),
    to: end.toISOString().slice(0, 10),
  };
}
function validDate(value: unknown, from: string, to: string) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    !Number.isFinite(Date.parse(value)) ||
    new Date(value).toISOString().slice(0, 10) !== value ||
    value < from ||
    value > to
  )
    throw new IntegrationError("Nieprawidłowa data w raporcie Google.");
  return value;
}
function rows(value: unknown, max: number): Record<string, unknown>[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > max)
    throw new IntegrationError("Raport Google przekracza limit wierszy.");
  return value.map(record);
}
const gaMetrics = [
  "sessions",
  "totalUsers",
  "screenPageViews",
  "keyEvents",
  "totalRevenue",
];
function gaRows(
  report: Record<string, unknown>,
  metrics: string[],
  dimensions: string[],
  max: number,
) {
  const mh = rows(report.metricHeaders, 10),
    dh = rows(report.dimensionHeaders, 10);
  if (
    mh.map((h) => h.name).join() !== metrics.join() ||
    dh.map((h) => h.name).join() !== dimensions.join()
  )
    throw new IntegrationError(
      "Google zwróciło inne kolumny niż zamówione w raporcie GA4.",
    );
  return rows(report.rows, max).map((row) => {
    const mv = rows(row.metricValues, 10),
      dv = rows(row.dimensionValues, 10);
    if (mv.length !== metrics.length || dv.length !== dimensions.length)
      throw new IntegrationError("Niekompletny wiersz GA4.");
    const values: Record<string, number> = {};
    metrics.forEach(
      (name, i) =>
        (values[name] = number(mv[i].value, name === "totalRevenue")),
    );
    if (
      dv.some(
        (v) => typeof v.value !== "string" || String(v.value).length > 1000,
      )
    )
      throw new IntegrationError("Nieprawidłowy wymiar GA4.");
    return { dimensions: dv.map((v) => String(v.value)), values };
  });
}
export async function readGoogle(
  provider: GoogleProvider,
  settings: Resource,
  wid?: string,
): Promise<IntegrationResult> {
  const resource = validateResource(provider, settings),
    token = await googleToken(wid, provider);
  const post = (url: string, body: unknown) =>
    apiJson(
      url,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
      true,
    );
  if (provider === "ga4") {
    const { from, to } = period(1),
      property = `properties/${resource.propertyId}`;
    const base = {
      property,
      dateRanges: [{ startDate: from, endDate: to }],
      metrics: gaMetrics.map((name) => ({ name })),
      limit: "100",
    };
    const result = record(
      await post(
        `https://analyticsdata.googleapis.com/v1beta/${property}:batchRunReports`,
        {
          requests: [
            {
              ...base,
              dimensions: [{ name: "date" }],
              orderBys: [{ dimension: { dimensionName: "date" } }],
            },
            {
              ...base,
              dimensions: [{ name: "sessionDefaultChannelGroup" }],
              orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
              limit: "20",
            },
            { ...base, limit: "1" },
          ],
        },
      ),
    );
    const reports = rows(result.reports, 3);
    if (reports.length !== 3)
      throw new IntegrationError("Brakuje części raportu GA4.");
    const totals =
      gaRows(reports[2], gaMetrics, [], 1)[0]?.values ??
      Object.fromEntries(gaMetrics.map((m) => [m, 0]));
    const daily = gaRows(reports[0], gaMetrics, ["date"], 31).map((r) => ({
      date: validDate(
        r.dimensions[0].replace(/^(\d{4})(\d{2})(\d{2})$/, "$1-$2-$3"),
        from,
        to,
      ),
      ...r.values,
    }));
    const breakdown = gaRows(
      reports[1],
      gaMetrics,
      ["sessionDefaultChannelGroup"],
      20,
    ).map((r) => ({ label: r.dimensions[0], values: r.values }));
    const metadata = reports.map((r) => record(r.metadata ?? {}));
    const currency = metadata.find(
      (m) => typeof m.currencyCode === "string",
    )?.currencyCode;
    const warnings = [
      "Użytkownicy za cały okres pochodzą z osobnego raportu; nie są sumą użytkowników dziennych. Daty raportu stosują strefę usługi GA4. Dane mogą być jeszcze przetwarzane przez Google.",
    ];
    if (
      metadata.some(
        (m) =>
          m.subjectToThresholding ||
          m.dataLossFromOtherRow ||
          (Array.isArray(m.samplingMetadatas) && m.samplingMetadatas.length),
      )
    )
      warnings.push(
        "Google wskazuje progowanie, próbkowanie lub pominięcie części danych. Wyniki mogą być niepełne.",
      );
    const report: GoogleReport = {
      provider,
      resource: property,
      from,
      to,
      fetched_at: new Date().toISOString(),
      totals,
      daily,
      breakdown,
      currency:
        typeof currency === "string" && /^[A-Z]{3}$/.test(currency)
          ? currency
          : undefined,
      warnings,
    };
    return {
      summary: `Odczytano GA4: ${totals.sessions} sesji w okresie ${from}–${to}.`,
      report,
    };
  }
  const { from, to } = period(3);
  const base = {
    startDate: from,
    endDate: to,
    type: "web",
    dataState: "final",
    aggregationType: "byProperty",
  };
  const url = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(resource.siteUrl!)}/searchAnalytics/query`;
  const [day, query, total] = await Promise.all([
    post(url, { ...base, dimensions: ["date"], rowLimit: 31 }),
    post(url, { ...base, dimensions: ["query"], rowLimit: 20 }),
    post(url, { ...base, rowLimit: 1 }),
  ]);
  function parsed(value: unknown, dimension: boolean, max: number) {
    return rows(record(value).rows, max).map((row) => {
      if (
        dimension &&
        (!Array.isArray(row.keys) ||
          row.keys.length !== 1 ||
          typeof row.keys[0] !== "string" ||
          row.keys[0].length > 1000)
      )
        throw new IntegrationError("Nieprawidłowy wymiar Search Console.");
      const values = {
        clicks: number(row.clicks),
        impressions: number(row.impressions),
        ctr: number(row.ctr),
        position: number(row.position),
      };
      if (values.ctr > 1 || values.clicks > values.impressions)
        throw new IntegrationError("Niespójne metryki Search Console.");
      return {
        label: dimension ? String((row.keys as string[])[0]) : "",
        values,
      };
    });
  }
  const totals = parsed(total, false, 1)[0]?.values ?? {
    clicks: 0,
    impressions: 0,
    ctr: 0,
    position: 0,
  };
  const report: GoogleReport = {
    provider,
    resource: resource.siteUrl!,
    from,
    to,
    fetched_at: new Date().toISOString(),
    totals,
    daily: parsed(day, true, 31)
      .map((r) => ({ date: validDate(r.label, from, to), ...r.values }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    breakdown: parsed(query, true, 20),
    warnings: [
      "Wyszukiwanie typu Web, dane końcowe; zakres kończy się 3 dni temu ze względu na opóźnienie Search Console. Google stosuje własną strefę raportową.",
      "Lista pokazuje do 20 najważniejszych zapytań. Zapytania anonimizowane nie są widoczne; sumy zapytań mogą różnić się od wyniku witryny.",
    ],
  };
  return {
    summary: `Odczytano Search Console: ${totals.clicks} kliknięć w okresie ${from}–${to}.`,
    report,
  };
}
