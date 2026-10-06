import "server-only";
import { apiJson, IntegrationError } from "./http";
import { googleToken } from "./google-auth";
import {
  validateResource,
  type Resource,
  type IntegrationResult,
  type GoogleReport,
} from "./model";
export function adsVersion() {
  const version = process.env.GOOGLE_ADS_API_VERSION || "v25";
  if (!/^v[1-9][0-9]{0,2}$/.test(version))
    throw new IntegrationError("Nieprawidłowa GOOGLE_ADS_API_VERSION.", 400);
  return version;
}
export function adsHeaders(token: string, manager?: string) {
  const developer = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  if (!developer || developer.length > 10000 || /[\r\n]/.test(developer))
    throw new IntegrationError(
      "Skonfiguruj GOOGLE_ADS_DEVELOPER_TOKEN z dostępem do właściwego rodzaju kont.",
      400,
    );
  return {
    Authorization: `Bearer ${token}`,
    "developer-token": developer,
    "Content-Type": "application/json",
    ...(manager ? { "login-customer-id": manager } : {}),
  };
}
export async function adsSearch(
  token: string,
  customerId: string,
  query: string,
  manager?: string,
) {
  if (
    !/^[1-9][0-9]{9}$/.test(customerId) ||
    (manager && !/^[1-9][0-9]{9}$/.test(manager))
  )
    throw new IntegrationError("Nieprawidłowy numer konta Google Ads.", 400);
  const result: Record<string, unknown>[] = [];
  let next = "";
  const seen = new Set<string>();
  for (let page = 0; page < 20; page++) {
    const response = (await apiJson(
      `https://googleads.googleapis.com/${adsVersion()}/customers/${customerId}/googleAds:search`,
      {
        method: "POST",
        headers: adsHeaders(token, manager),
        body: JSON.stringify({ query, ...(next ? { pageToken: next } : {}) }),
      },
      true,
    )) as Record<string, unknown>;
    if (
      !response ||
      typeof response !== "object" ||
      (response.results !== undefined && !Array.isArray(response.results))
    )
      throw new IntegrationError("Nieprawidłowy raport Google Ads.");
    for (const row of (response.results || []) as unknown[]) {
      if (!row || typeof row !== "object" || Array.isArray(row))
        throw new IntegrationError("Nieprawidłowy wiersz Google Ads.");
      result.push(row as Record<string, unknown>);
    }
    if (result.length > 10000)
      throw new IntegrationError(
        "Raport Google Ads przekracza limit 10 000 wierszy. Nie zapisano częściowego raportu.",
      );
    if (!response.nextPageToken) return result;
    if (
      typeof response.nextPageToken !== "string" ||
      response.nextPageToken.length > 10000 ||
      seen.has(response.nextPageToken)
    )
      throw new IntegrationError("Nieprawidłowa paginacja Google Ads.");
    next = response.nextPageToken;
    seen.add(next);
  }
  throw new IntegrationError(
    "Raport Google Ads przekracza limit stron. Nie zapisano częściowych wyników.",
  );
}
function numeric(value: unknown, negative = false) {
  if (value === undefined) return 0; // Google protobuf JSON omits default zero fields.
  if (
    (typeof value !== "string" && typeof value !== "number") ||
    String(value).trim() === "" ||
    !Number.isFinite(Number(value)) ||
    (!negative && Number(value) < 0) ||
    Math.abs(Number(value)) > Number.MAX_SAFE_INTEGER
  )
    throw new IntegrationError("Nieprawidłowa metryka Google Ads.");
  return Number(value);
}
function metrics(row: Record<string, unknown>) {
  const m = row.metrics as Record<string, unknown> | undefined;
  if (!m || typeof m !== "object" || Array.isArray(m))
    throw new IntegrationError("Brak metryk Google Ads.");
  const clicks = numeric(m.clicks),
    impressions = numeric(m.impressions),
    micros = numeric(m.costMicros);
  if (
    !Number.isSafeInteger(clicks) ||
    !Number.isSafeInteger(impressions) ||
    !Number.isSafeInteger(micros) ||
    clicks > impressions
  )
    throw new IntegrationError("Niespójne metryki Google Ads.");
  return {
    clicks,
    impressions,
    cost: micros / 1000000,
    conversions: numeric(m.conversions),
    conversionValue: numeric(m.conversionsValue, true),
  };
}
export async function readGoogleAds(
  settings: Resource,
  wid?: string,
): Promise<IntegrationResult> {
  const resource = validateResource("google_ads", settings),
    token = await googleToken(wid, "google_ads");
  const customerRows = await adsSearch(
    token,
    resource.customerId!,
    "SELECT customer.id, customer.descriptive_name, customer.currency_code, customer.time_zone, customer.manager FROM customer",
    resource.loginCustomerId,
  );
  const customer = customerRows[0]?.customer as
    | Record<string, unknown>
    | undefined;
  if (
    customerRows.length !== 1 ||
    !customer ||
    customer.manager === true ||
    !/^[A-Z]{3}$/.test(String(customer.currencyCode))
  )
    throw new IntegrationError(
      "Wybierz konto reklamowe, nie konto menedżera MCC. Konto musi zwrócić walutę raportu.",
      400,
    );
  const zone = String(customer.timeZone || "");
  let today: string;
  try {
    today = new Date().toLocaleDateString("en-CA", { timeZone: zone });
  } catch {
    throw new IntegrationError(
      "Nieprawidłowa strefa czasowa konta reklamowego.",
    );
  }
  if (!zone)
    throw new IntegrationError("Brak strefy czasowej konta reklamowego.");
  const end = new Date(`${today}T12:00:00Z`);
  end.setUTCDate(end.getUTCDate() - 1);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 29);
  const from = start.toISOString().slice(0, 10),
    to = end.toISOString().slice(0, 10);
  const fields =
    "metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions, metrics.conversions_value";
  const range = `WHERE segments.date BETWEEN '${from}' AND '${to}'`;
  const [days, campaigns] = await Promise.all([
    adsSearch(
      token,
      resource.customerId!,
      `SELECT segments.date, ${fields} FROM customer ${range} ORDER BY segments.date`,
      resource.loginCustomerId,
    ),
    adsSearch(
      token,
      resource.customerId!,
      `SELECT campaign.id, campaign.name, ${fields} FROM campaign ${range}`,
      resource.loginCustomerId,
    ),
  ]);
  const dates = new Set<string>();
  const daily = days.map((r) => {
    const date = (r.segments as Record<string, unknown> | undefined)?.date;
    if (
      typeof date !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !Number.isFinite(Date.parse(date)) ||
      new Date(date).toISOString().slice(0, 10) !== date ||
      date < from ||
      date > to ||
      dates.has(date)
    )
      throw new IntegrationError("Nieprawidłowa data Google Ads.");
    dates.add(date);
    return { date, ...metrics(r) };
  });
  const totals = {
    clicks: 0,
    impressions: 0,
    cost: 0,
    conversions: 0,
    conversionValue: 0,
  };
  for (const row of daily)
    for (const k of Object.keys(totals) as (keyof typeof totals)[])
      totals[k] += row[k];
  const breakdown = campaigns
    .map((r) => {
      const c = r.campaign as Record<string, unknown> | undefined;
      if (
        !c ||
        typeof c.name !== "string" ||
        c.name.length > 1000 ||
        !/^\d+$/.test(String(c.id))
      )
        throw new IntegrationError("Nieprawidłowa kampania Google Ads.");
      return { label: `${c.name} · ${c.id}`, values: metrics(r) };
    })
    .sort((a, b) => b.values.cost - a.values.cost)
    .slice(0, 20);
  const report: GoogleReport = {
    provider: "google_ads",
    resource: `${customer.descriptiveName || "Google Ads"} · ${resource.customerId}`,
    from,
    to,
    fetched_at: new Date().toISOString(),
    currency: String(customer.currencyCode),
    daily,
    breakdown,
    totals: {
      ...totals,
      ctr: totals.impressions ? totals.clicks / totals.impressions : 0,
      cpc: totals.clicks ? totals.cost / totals.clicks : 0,
      cpa: totals.conversions ? totals.cost / totals.conversions : 0,
      roas: totals.cost ? totals.conversionValue / totals.cost : 0,
    },
    warnings: [
      `Ostatnie 30 zakończonych dni w strefie konta ${zone}. Kwoty w walucie konta, bez przeliczania na PLN. Konwersje i ich wartość mogą zmieniać się z opóźnieniem.`,
      "Konwersje są liczone według konfiguracji Google Ads; mogą być ułamkowe. Wartość konwersji nie potwierdza wpłaty w CRM. ROAS = wartość konwersji / koszt, CPA = koszt / konwersje. Brak mianownika oznaczamy kreską.",
      "Do 20 kampanii o największym koszcie. Raport obejmuje całe konto; nie sumuje go z importem CSV. Odczyt ręczny, bez zmian kampanii.",
    ],
  };
  return {
    summary: `Pobrano Google Ads: ${totals.clicks} kliknięć, ${totals.cost.toFixed(2)} ${report.currency} kosztu.`,
    report,
  };
}
