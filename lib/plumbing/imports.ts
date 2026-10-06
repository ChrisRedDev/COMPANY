import type { AdTerm, TrackingRow, LocalRow, CallRow } from "./model";
import { parseLead, phoneKey, timestamp, object } from "../leads/model";
export type ImportKind = "ads" | "tracking" | "localSeo" | "calls";
const number = (v: unknown, name: string, integer = false) => {
  const n =
    typeof v === "number"
      ? v
      : typeof v === "string" && /^\d+(?:\.\d+)?$/.test(v)
        ? Number(v)
        : NaN;
  if (
    !Number.isFinite(n) ||
    n < 0 ||
    n > 1e12 ||
    (integer && !Number.isInteger(n))
  )
    throw Error(
      `Invalid ${name}. Use a non-negative ${integer ? "integer" : "number"}.`,
    );
  return n;
};
const date = (v: unknown) => {
  if (
    typeof v !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(v) ||
    new Date(`${v}T12:00:00Z`).toISOString().slice(0, 10) !== v
  )
    throw Error("Invalid date. Use YYYY-MM-DD.");
  return v;
};
const string = (v: unknown, name: string, max = 500) => {
  if (v === undefined || v === null) return "";
  if (typeof v !== "string" || v.length > max)
    throw Error(`Invalid ${name}. Maximum ${max} characters.`);
  return v.trim();
};
export function csvTable(input: string): Record<string, string>[] {
  if (input.length > 2_000_000) throw Error("File limit: 2 MB.");
  const separator = input.split(/\r?\n/)[0].includes(";") ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false;
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (c === '"') {
      if (quoted && input[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === separator && !quoted) {
      row.push(cell);
      cell = "";
    } else if (c === "\n" && !quoted) {
      row.push(cell.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (quoted) throw Error("Unclosed CSV quote.");
  if (cell || row.length) {
    row.push(cell.replace(/\r$/, ""));
    rows.push(row);
  }
  const headers = (rows.shift() ?? []).map((h) =>
    h.replace(/^\uFEFF/, "").trim(),
  );
  if (new Set(headers).size !== headers.length || headers.some((h) => !h))
    throw Error("CSV headers must be unique and non-empty.");
  return rows
    .filter((r) => r.some((v) => v.trim()))
    .map((r, i) => {
      if (r.length !== headers.length)
        throw Error(`Row ${i + 2}: unexpected number of columns.`);
      return Object.fromEntries(headers.map((h, j) => [h, r[j].trim()]));
    });
}
export function validateImport(
  kind: ImportKind,
  input: unknown,
): (AdTerm | TrackingRow | LocalRow | CallRow)[] {
  if (!["ads", "tracking", "localSeo", "calls"].includes(kind))
    throw Error("Unknown import type.");
  if (!Array.isArray(input) || !input.length || input.length > 10000)
    throw Error("Import 1–10,000 rows.");
  const result = input.map((raw) => {
    const r = object(raw);
    if (kind === "calls") {
      const lead = parseLead({
        first_name: r.name,
        phone: r.phone,
        postcode: r.postcode,
        service: r.service,
        problem: r.problem,
      });
      const called = string(r.called_number, "called_number", 50);
      if (called) phoneKey(called);
      if (!lead.phone) throw Error("Call imports need a caller phone number.");
      if (!["answered", "missed"].includes(String(r.outcome)))
        throw Error("Call outcome must be answered or missed.");
      const id = string(r.id, "id", 150);
      if (!id) throw Error("A stable provider call id is required.");
      const duration = number(r.duration, "duration", true);
      if (duration > 86400 || (r.outcome === "missed" && duration !== 0))
        throw Error("Invalid call duration.");
      return {
        id,
        timestamp: timestamp(r.timestamp),
        phone: lead.phone,
        name: string(r.name, "name", 100),
        called_number: called,
        outcome: r.outcome,
        duration,
        source: string(r.source, "source", 100),
        campaign: string(r.campaign, "campaign", 200),
        landing_page: string(r.landing_page, "landing_page", 1000),
        keyword: string(r.keyword, "keyword", 500),
        postcode: lead.postcode ?? "",
        service: lead.service ?? "",
        problem: lead.problem ?? "",
      } as CallRow;
    }
    const d = date(r.date);
    if (kind === "localSeo") {
      const rank =
          r.rank === "" || r.rank === null
            ? null
            : number(r.rank, "rank", true),
        competitorRank =
          r.competitor_rank === "" || r.competitor_rank === null
            ? null
            : number(r.competitor_rank, "competitor_rank", true),
        rating =
          r.rating === "" || r.rating === null
            ? null
            : number(r.rating, "rating");
      if (
        (rank !== null && rank < 1) ||
        (competitorRank !== null && competitorRank < 1) ||
        (rating !== null && rating > 5)
      )
        throw Error("Ranks start at 1; ratings are 0–5.");
      const location = string(r.location, "location", 100),
        keyword = string(r.keyword, "keyword", 500);
      if (!location || !keyword)
        throw Error("Location and keyword are required.");
      return {
        date: d,
        location,
        service: string(r.service, "service", 100),
        keyword,
        rank,
        competitor: string(r.competitor, "competitor", 200),
        competitor_rank: competitorRank,
        calls: number(r.calls, "calls", true),
        reviews: number(r.reviews, "reviews", true),
        rating,
        landing_page: string(r.landing_page, "landing_page", 1000),
      } as LocalRow;
    }
    if (r.currency !== "GBP")
      throw Error(
        "Only GBP imports can be combined with this UK dashboard. No currency conversion is performed.",
      );
    const source = string(r.source, "source", 100);
    if (kind === "ads") {
      if (!["google_ads", "microsoft_ads"].includes(source))
        throw Error("Ads source must be google_ads or microsoft_ads.");
      const campaign = string(r.campaign, "campaign", 200);
      if (!campaign) throw Error("Campaign is required.");
      return {
        date: d,
        source,
        campaign,
        keyword: string(r.keyword, "keyword", 500),
        search_term: string(r.search_term, "search_term", 500),
        spend: number(r.spend, "spend"),
        impressions: number(r.impressions, "impressions", true),
        clicks: number(r.clicks, "clicks", true),
        conversions: number(r.conversions, "conversions"),
        currency: "GBP",
      } as AdTerm;
    }
    if (
      !["google_ads", "microsoft_ads", "organic", "gbp", "direct"].includes(
        source,
      ) ||
      !["call", "form", "whatsapp", "website"].includes(String(r.channel)) ||
      !["ga4", "gtm", "google_ads", "microsoft_ads"].includes(
        String(r.system),
      ) ||
      r.timezone !== "Europe/London"
    )
      throw Error("Check source, channel, system and Europe/London timezone.");
    if (!["unique_leads", "events", "clicks"].includes(String(r.definition)))
      throw Error(
        "Tracking definition must be unique_leads, events or clicks.",
      );
    return {
      date: d,
      source,
      channel: r.channel,
      system: r.system,
      conversions: number(r.conversions, "conversions", true),
      definition: r.definition,
      timezone: "Europe/London",
      currency: "GBP",
    } as TrackingRow;
  });
  const keys = result.map((r) => importKey(kind, r));
  if (new Set(keys).size !== keys.length)
    throw Error(
      "Duplicate rows in import. Use one observation per record key.",
    );
  return result;
}
export function importKey(
  kind: ImportKind,
  row: AdTerm | TrackingRow | LocalRow | CallRow,
) {
  const r = row as unknown as Record<string, unknown>;
  return JSON.stringify(
    kind === "calls"
      ? [r.id]
      : kind === "ads"
        ? [r.date, r.source, r.campaign, r.keyword, r.search_term]
        : kind === "tracking"
          ? [r.date, r.source, r.channel, r.system]
          : [r.date, r.location, r.service, r.keyword, r.competitor],
  );
}
