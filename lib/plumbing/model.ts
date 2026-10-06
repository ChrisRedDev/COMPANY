import { leadName, type LeadBundle, type LeadStatus } from "../leads/model";
import type { CampaignDay } from "../integrations/marketing";

export const BRAND = {
  name: "Local Plumbing Services",
  website: "https://local-plumbing-services.co.uk/",
  phone: "07392 234913",
  maidstonePhone: "07900 049749",
  currency: "GBP",
  locale: "en-GB",
  timezone: "Europe/London",
  blue: "#1169B3",
} as const;
export const SERVICES = [
  "Emergency plumbing",
  "Blocked drains",
  "Leak detection",
  "General plumbing",
  "Toilet repairs",
  "Taps & sinks",
  "Bathrooms",
  "Heating & radiators",
  "Boiler enquiry",
];
export const sourceKey = (source: string) => {
  const s = source.toLowerCase().replace(/[\s-]/g, "_");
  return /google_ads|google_cpc/.test(s)
    ? "google_ads"
    : /microsoft|bing/.test(s)
      ? "microsoft_ads"
      : /business_profile|gbp|google_maps/.test(s)
        ? "gbp"
        : /organic|seo/.test(s)
          ? "organic"
          : "direct";
};
export const ukDay = (timestamp = new Date().toISOString()) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: BRAND.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(timestamp));
export const gbp = (value: number | null) =>
  value === null
    ? "—"
    : new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency: "GBP",
        maximumFractionDigits: 2,
      }).format(value);
export const ratio = (a: number, b: number) => (b > 0 ? a / b : null);
export const QUALIFIED: LeadStatus[] = [
  "qualified",
  "quote",
  "booked",
  "in_progress",
  "completed",
  "paid",
  "won",
];
const hasQualified=(b:LeadBundle)=>QUALIFIED.includes(b.lead.status)||b.events.some(e=>e.event_type==="status_change"&&QUALIFIED.includes(String(e.metadata.status) as LeadStatus));
export type AdTerm = {
  date: string;
  source: "google_ads" | "microsoft_ads";
  campaign: string;
  keyword: string;
  search_term: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  currency: "GBP";
};
export type TrackingRow = {
  date: string;
  source: string;
  channel: "call" | "form" | "whatsapp" | "website";
  system: "ga4" | "gtm" | "google_ads" | "microsoft_ads";
  conversions: number;
  definition: string;
  timezone: "Europe/London";
  currency: "GBP";
};
export type LocalRow = {
  date: string;
  location: string;
  service: string;
  keyword: string;
  rank: number | null;
  competitor: string;
  competitor_rank: number | null;
  calls: number;
  reviews: number;
  rating: number | null;
  landing_page: string;
};
export type CallRow = {
  id: string;
  timestamp: string;
  phone: string;
  name: string;
  called_number: string;
  outcome: "answered" | "missed";
  duration: number;
  source: string;
  campaign: string;
  landing_page: string;
  keyword: string;
  postcode: string;
  service: string;
  problem: string;
};
export type PlumbingInputs = {
  ads: AdTerm[];
  tracking: TrackingRow[];
  localSeo: LocalRow[];
  importedAt: Partial<
    Record<"ads" | "tracking" | "localSeo" | "calls", string>
  >;
  demo: boolean;
};
export type BriefingItem = {
  id: string;
  kind: "budget" | "scale" | "keyword" | "followup" | "tracking";
  severity: "high" | "medium" | "info";
  title: string;
  detail: string;
  leadId?: string;
  campaign?: string;
  keyword?: string;
};
export type PlumbingReport = ReturnType<typeof plumbingReport>;

export function plumbingReport(
  bundles: LeadBundle[],
  campaigns: CampaignDay[],
  inputs: PlumbingInputs,
  from: string,
  to: string,
) {
  const inside = (date: string) => date >= from && date <= to;
  const inTime = (time: string) => inside(ukDay(time));
  const scoped = bundles.filter((b) => b.lead.is_demo === inputs.demo);
  const cohort = scoped.filter((b) => inTime(b.lead.created_at));
  const events = scoped
    .flatMap((b) => b.events.map((event) => ({ event, lead: b.lead })))
    .filter((r) => inTime(r.event.timestamp));
  const qualified = cohort.filter(
    (b) =>
      QUALIFIED.includes(b.lead.status) ||
      b.events.some(
        (e) =>
          e.event_type === "status_change" &&
          QUALIFIED.includes(String(e.metadata.status) as LeadStatus),
      ),
  ).length;
  const bookings = events.filter(
    (r) => r.event.event_type === "booking_created",
  );
  const completed = events.filter(
    (r) => r.event.event_type === "job_completed",
  );
  const payments = events.filter(
    (r) =>
      r.event.event_type === "payment_received" &&
      (r.lead.currency ?? "PLN") === "GBP",
  );
  const paid = payments.reduce(
    (s, r) => s + Number(r.event.metadata.amount),
    0,
  );
  const days = campaigns.filter(
    (r) => inside(r.date) && ["google_ads", "microsoft_ads"].includes(r.source),
  );
  const spend = days.reduce((s, r) => s + r.spend, 0);
  const attributedRevenue = payments
    .filter((r) =>
      ["google_ads", "microsoft_ads"].includes(sourceKey(r.lead.source)),
    )
    .reduce((s, r) => s + Number(r.event.metadata.amount), 0);
  const paidBookings = bookings.filter((r) =>
    ["google_ads", "microsoft_ads"].includes(sourceKey(r.lead.source)),
  ).length;
  const calls = events
    .filter((r) => r.event.event_type === "phone_call")
    .map(({ event, lead }) => ({
      id: event.id,
      leadId: lead.id,
      name: leadName(lead),
      phone: lead.phone,
      calledNumber: String(event.metadata.called_number ?? "Not recorded"),
      outcome: String(event.metadata.call_outcome ?? "unknown"),
      duration:
        typeof event.metadata.call_duration === "number"
          ? event.metadata.call_duration
          : null,
      source: lead.source,
      campaign: String(event.metadata.campaign ?? lead.campaign),
      landingPage: String(event.metadata.landing_page ?? lead.landing_page),
      timestamp: event.timestamp,
      demo: lead.is_demo,
    }));
  const ads = Array.from(
    new Set([
      ...days.map((d) => `${d.source}\0${d.campaign}`),
      ...inputs.ads
        .filter((r) => inside(r.date))
        .map((d) => `${d.source}\0${d.campaign}`),
    ]),
  ).map((key) => {
    const [source, campaign] = key.split("\0"),
      rows = days.filter((r) => r.source === source && r.campaign === campaign);
    const leads = cohort.filter(
      (b) =>
        sourceKey(b.lead.source) === source && b.lead.campaign === campaign,
    );
    const revenue = payments
      .filter(
        (r) =>
          sourceKey(r.lead.source) === source && r.lead.campaign === campaign,
      )
      .reduce((s, r) => s + Number(r.event.metadata.amount), 0);
    const booked = bookings.filter(
      (r) =>
        sourceKey(r.lead.source) === source && r.lead.campaign === campaign,
    ).length;
    const spend = rows.reduce((s, r) => s + r.spend, 0),
      clicks = rows.reduce((s, r) => s + r.clicks, 0),
      conversions = rows.reduce((s, r) => s + r.leads, 0);
    return {
      source,
      campaign,
      spend,
      clicks,
      conversions,
      leads: leads.length,
      qualified: leads.filter(hasQualified).length,
      booked,
      revenue,
      cpc: ratio(spend, clicks),
      cpa: ratio(spend, conversions),
      costPerBooked: ratio(spend, booked),
      roas: ratio(revenue, spend),
    };
  });
  const terms = Array.from(
    new Set(
      inputs.ads
        .filter((r) => inside(r.date))
        .map(
          (r) => `${r.source}\0${r.campaign}\0${r.keyword}\0${r.search_term}`,
        ),
    ),
  ).map((key) => {
    const [source, campaign, keyword, searchTerm] = key.split("\0"),
      rows = inputs.ads.filter(
        (r) =>
          inside(r.date) &&
          r.source === source &&
          r.campaign === campaign &&
          r.keyword === keyword &&
          r.search_term === searchTerm,
      );
    // CRM attribution is at keyword level, not at search-term level. Never allocate
    // all keyword revenue to each search term, or claim an unobserved exact match.
    const leads = cohort.filter(
      (b) =>
        sourceKey(b.lead.source) === source &&
        b.lead.campaign === campaign &&
        b.lead.keyword === keyword,
    );
    const spend = rows.reduce((s, r) => s + r.spend, 0),
      clicks = rows.reduce((s, r) => s + r.clicks, 0),
      conversions = rows.reduce((s, r) => s + r.conversions, 0);
    const keywordRevenue = payments
      .filter(
        (r) =>
          sourceKey(r.lead.source) === source &&
          r.lead.campaign === campaign &&
          r.lead.keyword === keyword,
      )
      .reduce((s, r) => s + Number(r.event.metadata.amount), 0);
    return {
      source,
      campaign,
      keyword,
      searchTerm,
      spend,
      clicks,
      conversions,
      cpc: ratio(spend, clicks),
      cpa: ratio(spend, conversions),
      qualified: leads.filter(hasQualified).length,
      keywordRevenue,
    };
  });
  const tracking = inputs.tracking
    .filter((r) => inside(r.date))
    .map((r) => {
      const contacts = new Set(
        events
          .filter(
            ({ event, lead }) =>
              ukDay(event.timestamp) === r.date &&
              sourceKey(lead.source) === r.source &&
              {
                call: "phone_call",
                form: "form_submit",
                whatsapp: "whatsapp",
                website: "form_submit",
              }[r.channel] === event.event_type &&
              (event.event_type !== "phone_call" ||
                event.metadata.call_outcome !== "missed"),
          )
          .map((e) => e.lead.id),
      );
      const crm = contacts.size,
        comparable = r.definition === "unique_leads",
        delta = r.conversions - crm;
      return {
        ...r,
        crm,
        delta: comparable ? delta : null,
        status: !comparable
          ? "not_comparable"
          : delta === 0
            ? "matched"
            : Math.abs(delta) >= 2
              ? "investigate"
              : "review",
      };
    });
  const briefing: BriefingItem[] = [];
  ads.forEach((a) => {
    if (a.spend >= 50 && a.qualified === 0 && !a.campaign.includes("account total (live connector)"))
      briefing.push({
        id: `budget-${a.source}-${a.campaign}`,
        kind: "budget",
        severity: "high",
        campaign: a.campaign,
        title: `Review ${a.campaign}`,
        detail: `${gbp(a.spend)} spent; no qualified CRM leads in this intake cohort. Check intent, enquiries and tracking before changing budget.`,
      });
    if (a.booked >= 2 && a.roas !== null && a.roas >= 3)
      briefing.push({
        id: `scale-${a.source}-${a.campaign}`,
        kind: "scale",
        severity: "info",
        campaign: a.campaign,
        title: `Consider scaling ${a.campaign}`,
        detail: `${a.booked} bookings and ${a.roas.toFixed(2)}× payment ROAS in this period. Review capacity and margins before any increase.`,
      });
  });
  terms
    .filter((t) => t.spend >= 30 && t.conversions === 0 && t.qualified === 0)
    .forEach((t) =>
      briefing.push({
        id: `keyword-${t.source}-${t.campaign}-${t.keyword}-${t.searchTerm}`,
        kind: "keyword",
        severity: "medium",
        keyword: t.keyword,
        campaign: t.campaign,
        title: `Review search term: ${t.searchTerm}`,
        detail: `${gbp(t.spend)}, ${t.clicks} clicks, no reported conversions or qualified keyword leads. Review as a negative-keyword candidate; no change has been made.`,
      }),
    );
  scoped
    .filter((b) =>
      ["new", "contacted", "qualified", "quote"].includes(b.lead.status),
    )
    .forEach((b) => {
      const missed = [...b.events]
        .reverse()
        .find((e) => e.event_type === "phone_call");
      const age =
        (new Date(`${to}T23:59:59Z`).getTime() -
          Date.parse(b.lead.updated_at)) /
        3600000;
      if (missed?.metadata.call_outcome === "missed" || age >= 24)
        briefing.push({
          id: `followup-${b.lead.id}`,
          kind: "followup",
          severity:
            missed?.metadata.call_outcome === "missed" ? "high" : "medium",
          leadId: b.lead.id,
          title: `Follow up ${leadName(b.lead)}`,
          detail:
            missed?.metadata.call_outcome === "missed"
              ? `Missed call · ${b.lead.phone} · ${b.lead.postcode || "postcode needed"}. Confirm availability before offering attendance.`
              : `${b.lead.status === "quote" ? "Quote awaiting a decision" : "Open enquiry"} · ${b.lead.service || "service not recorded"} · ${b.lead.postcode || "postcode needed"}. Last updated ${ukDay(b.lead.updated_at)}.`,
        });
    });
  tracking
    .filter((t) => t.status !== "matched")
    .forEach((t) =>
      briefing.push({
        id: `tracking-${t.date}-${t.system}-${t.source}-${t.channel}`,
        kind: "tracking",
        severity: t.status === "investigate" ? "high" : "medium",
        title: `Check ${t.system.toUpperCase()} ${t.channel} tracking`,
        detail:
          t.delta === null
            ? `${t.definition} is not comparable to unique CRM contacts. Align the conversion definition first.`
            : `${t.date}: ${t.conversions} reported vs ${t.crm} unique CRM contacts (${t.delta > 0 ? "+" : ""}${t.delta}). Check duplicates, consent and attribution windows.`,
      }),
    );
  if (!tracking.length)
    briefing.push({
      id: "tracking-unknown",
      kind: "tracking",
      severity: "medium",
      title: "Tracking health is unknown",
      detail:
        "Import dated conversion observations with the same timezone and unique-lead definition. No live tracking verification has been performed.",
    });
  const trend = Array.from(
    {
      length: Math.min(
        31,
        Math.round((Date.parse(to) - Date.parse(from)) / 86400000) + 1,
      ),
    },
    (_, i) => {
      const date = new Date(Date.parse(`${from}T12:00:00Z`) + i * 86400000)
        .toISOString()
        .slice(0, 10);
      return {
        date,
        leads: cohort.filter((b) => ukDay(b.lead.created_at) === date).length,
        revenue: payments
          .filter((r) => ukDay(r.event.timestamp) === date)
          .reduce((s, r) => s + Number(r.event.metadata.amount), 0),
        spend: days
          .filter((r) => r.date === date)
          .reduce((s, r) => s + r.spend, 0),
      };
    },
  );
  const sources = [
    "google_ads",
    "microsoft_ads",
    "organic",
    "gbp",
    "direct",
  ].map((source) => ({
    source,
    leads: cohort.filter((b) => sourceKey(b.lead.source) === source).length,
    qualified: cohort.filter(
      (b) =>
        sourceKey(b.lead.source) === source &&
        hasQualified(b),
    ).length,
    booked: bookings.filter((r) => sourceKey(r.lead.source) === source).length,
    revenue: payments
      .filter((r) => sourceKey(r.lead.source) === source)
      .reduce((s, r) => s + Number(r.event.metadata.amount), 0),
  }));
  return {
    sources,
    from,
    to,
    demo: inputs.demo,
    importedAt: inputs.importedAt,
    kpis: {
      leads: cohort.length,
      leadsToday: scoped.filter((b) => ukDay(b.lead.created_at) === ukDay())
        .length,
      qualified,
      booked: bookings.length,
      paidBookings,
      completed: completed.length,
      spend,
      revenue: paid,
      attributedRevenue,
      costPerBooked: ratio(spend, paidBookings),
      roas: ratio(attributedRevenue, spend),
    },
    funnel: [
      { label: "Ad clicks", count: days.reduce((s, r) => s + r.clicks, 0) },
      {
        label: "Landing visits",
        count: events.filter((r) => r.event.event_type === "page_view").length,
      },
      { label: "Leads", count: cohort.length },
      { label: "Qualified", count: qualified },
      {
        label: "Quotes",
        count: events.filter((r) => r.event.event_type === "quote_sent").length,
      },
      { label: "Booked", count: bookings.length },
      { label: "Completed", count: completed.length },
      { label: "Payments", count: payments.length },
    ],
    leads: scoped.map((b) => ({ ...b.lead, name: leadName(b.lead) })),
    ads,
    terms,
    calls,
    tracking,
    localSeo: inputs.localSeo.filter((r) => inside(r.date)),
    briefing: briefing.sort(
      (a, b) =>
        ({ high: 0, medium: 1, info: 2 })[a.severity] -
        { high: 0, medium: 1, info: 2 }[b.severity],
    ),
    trend,
    legacyCurrencyRecords: scoped.filter(
      (b) => (b.lead.currency ?? "PLN") !== "GBP",
    ).length,
  };
}
