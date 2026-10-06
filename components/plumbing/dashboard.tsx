"use client";
import { useEffect, useState, type ReactNode } from "react";
import { gbp, ukDay, BRAND, type PlumbingReport } from "@/lib/plumbing/model";
import type { Section } from "@/lib/crm/model";
import { downloadFile } from "@/lib/crm/backup";
import { Icon } from "../crm/ui";
import SeoAudit from "./seo-audit";
type View = "dashboard" | "ads" | "tracking" | "calls" | "localSeo";
const labels = {
  dashboard: "Owner overview",
  ads: "Paid search",
  tracking: "Tracking health",
  calls: "Call tracking",
  localSeo: "Local SEO & search audit",
};
const sourceLabel = (s: string) =>
  ({
    google_ads: "Google Ads",
    microsoft_ads: "Microsoft Ads",
    organic: "Organic search",
    gbp: "Google Business Profile",
    direct: "Direct",
  })[s] ?? s;
const multiplier = (n: number | null) =>
  n === null ? "—" : `${n.toFixed(2)}×`;
function Card({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="plumbing-card">
      <div className="plumbing-card-heading">
        <span className="sr-only">{title}</span>
        {action}
      </div>
      {children}
    </section>
  );
}
function Table({ headers, rows }: { headers: string[]; rows: ReactNode[][] }) {
  return (
    <div className="plumbing-table-scroll">
      <table className="plumbing-table">
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h} scope="col">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && (
        <p className="plumbing-empty">
          No observations in this period. Import a report or load the separate
          DEMO workspace.
        </p>
      )}
    </div>
  );
}
export default function PlumbingDashboard({
  wid,
  view = "dashboard",
  navigate,
  openLead,
  askAgent,
  notify,
  readOnly,
}: {
  wid: string;
  view?: View;
  navigate: (s: Section) => void;
  openLead: (id: string) => void;
  askAgent: (prompt: string) => void;
  notify: (message: string) => void;
  readOnly: boolean;
}) {
  const [days, setDays] = useState(30),
    [data, setData] = useState<PlumbingReport | null>(null),
    [error, setError] = useState(""),
    [refresh, setRefresh] = useState(0),
    [busy, setBusy] = useState(false),
    [importKind, setImportKind] = useState("ads"),
    [source, setSource] = useState("all");
  useEffect(() => {
    let active = true;
    const to = ukDay(),
      from = new Date(Date.parse(`${to}T12:00:00Z`) - (days - 1) * 86400000)
        .toISOString()
        .slice(0, 10);
    fetch(`/api/plumbing/${wid}/report?from=${from}&to=${to}`, {
      cache: "no-store",
    })
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw Error(json.error);
        if (active) {
          setData(json);
          setError("");
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [wid, days, refresh]);
  async function importFile(file: File) {
    setBusy(true);
    setError("");
    try {
      if (file.size > 2_000_000) throw Error("File limit: 2 MB.");
      const content = await file.text();
      const response = await fetch(`/api/plumbing/${wid}/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: importKind,
          ...(file.name.endsWith(".json")
            ? { rows: JSON.parse(content) }
            : { csv: content }),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw Error(result.error);
      setRefresh((n) => n + 1);
      notify(`Imported ${result.count} ${importKind} observations.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed.");
    } finally {
      setBusy(false);
    }
  }
  const title = labels[view];
  return (
    <div className="plumbing-panel">
      <div className="plumbing-toolbar">
        <div>
          <span className="plumbing-kicker">
            DARTFORD · KENT · SOUTH EAST LONDON
          </span>
          <span className="sr-only">{title}</span>
          <p>
            {view === "dashboard"
              ? "Your enquiries, jobs and money. The next steps are below."
              : "Follow the evidence from the first enquiry to the payment."}
          </p>
        </div>
        <div className="plumbing-toolbar-actions">
          <label className="plumbing-period">
            Period
            <select
              aria-label="Reporting period"
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
            >
              <option value={1}>Today</option>
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
            </select>
          </label>
          <button
            className="crm-button secondary"
            onClick={() => setRefresh((n) => n + 1)}
          >
            <Icon name="clock" size={16} />
            Refresh
          </button>
        </div>
      </div>
      {error && (
        <p className="crm-alert error" role="alert">
          {error}
        </p>
      )}
      {!data && !error && <p role="status">Loading owner metrics…</p>}
      {data && (
        <>
          <div
            className={`plumbing-data-banner ${data.demo ? "demo" : "live"}`}
          >
            <span className="plumbing-status-dot" />
            <strong>{data.demo ? "DEMO WORKSPACE" : "YOUR WORKSPACE"}</strong>
            <span>
              {data.demo
                ? "Synthetic contacts, calls, revenue and search metrics. No live accounts connected."
                : "CRM events and imported/saved reports. Missing measurements remain unknown."}
            </span>
            <small>
              {data.from} — {data.to} · GBP · London
            </small>
          </div>
          {data.legacyCurrencyRecords > 0 && (
            <p className="crm-alert">
              {data.legacyCurrencyRecords} legacy non-GBP leads are excluded
              from GBP revenue. No currency conversion is performed.
            </p>
          )}
          {view === "dashboard" && (
            <>
              <div className="plumbing-kpis">
                {[
                  {
                    label: "Leads today",
                    value: String(data.kpis.leadsToday),
                    hint: "New enquiries · London date",
                    target: "leads",
                  },
                  {
                    label: "Qualified leads",
                    value: String(data.kpis.qualified),
                    hint: "Selected-period intake cohort",
                    target: "leads",
                  },
                  {
                    label: "Booked jobs",
                    value: String(data.kpis.booked),
                    hint: "Booking events in this period",
                    target: "leads",
                  },
                  {
                    label: "Ad spend",
                    value: data.ads.length ? gbp(data.kpis.spend) : "—",
                    hint: "Google + Microsoft Ads",
                    target: "ads",
                  },
                  {
                    label: "Cost per booked job",
                    value: gbp(data.kpis.costPerBooked),
                    hint: `${data.kpis.paidBookings} ad-attributed bookings`,
                    target: "ads",
                  },
                  {
                    label: "Revenue received",
                    value: gbp(data.kpis.revenue),
                    hint: "Payment events · not quote values",
                    target: "leads",
                  },
                  {
                    label: "Payment ROAS",
                    value: multiplier(data.kpis.roas),
                    hint: `${gbp(data.kpis.attributedRevenue)} attributed to ads`,
                    target: "ads",
                  },
                ].map((k, i) => (
                  <button
                    key={k.label}
                    className={`plumbing-kpi ${i === 5 ? "featured" : ""}`}
                    onClick={() => navigate(k.target as Section)}
                  >
                    <span>{k.label}</span>
                    <strong>{k.value}</strong>
                    <small>{k.hint}</small>
                  </button>
                ))}
              </div>
              <div className="plumbing-two-column">
                <Card
                  title="What needs your attention"
                  action={
                    <button
                      className="crm-text-button"
                      onClick={() =>
                        askAgent(
                          "Give me today's plumbing briefing. Review wasted budget, campaigns to scale, search-term candidates, lead follow-up and tracking discrepancies.",
                        )
                      }
                    >
                      <Icon name="spark" size={16} />
                      Ask AI
                    </button>
                  }
                >
                  <div className="plumbing-attention">
                    {data.briefing.slice(0, 5).map((item) => (
                      <button
                        key={item.id}
                        className={`plumbing-attention-item ${item.severity}`}
                        onClick={() =>
                          item.leadId
                            ? openLead(item.leadId)
                            : navigate(
                                item.kind === "tracking" ? "tracking" : "ads",
                              )
                        }
                      >
                        <span className="plumbing-attention-icon">
                          <Icon
                            name={
                              item.kind === "followup"
                                ? "contacts"
                                : item.kind === "tracking"
                                  ? "help"
                                  : "spark"
                            }
                            size={18}
                          />
                        </span>
                        <span>
                          <strong>{item.title}</strong>
                          <small>{item.detail}</small>
                        </span>
                        <Icon name="arrow" size={16} />
                      </button>
                    ))}
                    {!data.briefing.length && (
                      <p className="plumbing-empty">
                        No rules triggered in this period. This does not verify
                        live tracking.
                      </p>
                    )}
                  </div>
                </Card>
                <Card
                  title="Enquiries & payments"
                  action={<span className="plumbing-chip">{days} days</span>}
                >
                  <div
                    className="plumbing-trend"
                    aria-label="New leads by date"
                  >
                    {data.trend.map((day) => (
                      <div key={day.date} className="plumbing-trend-day">
                        <button
                          title={`${day.date}: ${day.leads} leads, ${gbp(day.revenue)} paid, ${gbp(day.spend)} spend`}
                          aria-label={`${day.date}: ${day.leads} leads, ${gbp(day.revenue)} paid`}
                          style={{
                            height: `${Math.max(5, (day.leads / Math.max(1, ...data.trend.map((d) => d.leads))) * 120)}px`,
                          }}
                          onClick={() => navigate("leads")}
                        />
                        <small>{day.date.slice(8)}</small>
                      </div>
                    ))}
                  </div>
                  <div className="plumbing-chart-key">
                    <span>
                      <i />
                      New leads
                    </span>
                    <span>Hover or focus a bar for daily totals</span>
                  </div>
                  <details>
                    <summary>View the daily data</summary>
                    <Table
                      headers={["Date", "Leads", "Revenue", "Spend"]}
                      rows={data.trend.map((d) => [
                        d.date,
                        d.leads,
                        gbp(d.revenue),
                        gbp(d.spend),
                      ])}
                    />
                  </details>
                </Card>
              </div>
              <Card
                title="From search to a paid job"
                action={
                  <button
                    className="crm-text-button"
                    onClick={() => navigate("leads")}
                  >
                    Open Lead Hub <Icon name="arrow" size={15} />
                  </button>
                }
              >
                <div className="plumbing-funnel">
                  {data.funnel.map((stage, i) => (
                    <div key={stage.label}>
                      <span>{String(i + 1).padStart(2, "0")}</span>
                      <strong>{stage.count}</strong>
                      <small>{stage.label}</small>
                    </div>
                  ))}
                </div>
                <p className="plumbing-note">
                  Clicks are platform totals; landing visits are recorded CRM
                  touchpoints. Stages count events, and qualified leads use the
                  intake cohort. These are different populations, so a
                  cross-system conversion rate is not inferred.
                </p>
              </Card>
              <div className="plumbing-two-column">
                <Card
                  title="Latest enquiries"
                  action={
                    <button
                      className="crm-text-button"
                      onClick={() => navigate("leads")}
                    >
                      All leads
                    </button>
                  }
                >
                  <Table
                    headers={["Customer", "Enquiry", "Stage", "Source"]}
                    rows={data.leads.slice(0, 6).map((l) => [
                      <button
                        className="plumbing-link"
                        onClick={() => openLead(l.id)}
                        key={l.id}
                      >
                        {l.name}
                        <small>{l.postcode}</small>
                      </button>,
                      l.service || "Not recorded",
                      <span className="plumbing-chip" key="s">
                        {l.status.replaceAll("_", " ")}
                      </span>,
                      sourceLabel(l.source),
                    ])}
                  />
                </Card>
                <Card title="Where customers came from">
                  <Table
                    headers={["Source", "Leads", "Qualified", "Bookings"]}
                    rows={[
                      "google_ads",
                      "microsoft_ads",
                      "organic",
                      "gbp",
                      "direct",
                    ].map((s) => [
                      sourceLabel(s),
                      data.sources.find((r) => r.source === s)?.leads ?? 0,
                      data.sources.find((r) => r.source === s)?.qualified ?? 0,
                      data.sources.find((r) => r.source === s)?.booked ?? 0,
                    ])}
                  />
                  <p className="plumbing-note">
                    Source is the lead acquisition source. Phone and WhatsApp
                    are contact channels, not advertising sources.
                  </p>
                </Card>
              </div>
            </>
          )}
          {view === "ads" && (
            <>
              <div className="plumbing-inline-metrics">
                <span>
                  Spend <strong>{gbp(data.kpis.spend)}</strong>
                </span>
                <span>
                  Booked from ads <strong>{data.kpis.paidBookings}</strong>
                </span>
                <span>
                  Received from ads{" "}
                  <strong>{gbp(data.kpis.attributedRevenue)}</strong>
                </span>
                <span>
                  ROAS <strong>{multiplier(data.kpis.roas)}</strong>
                </span>
              </div>
              <label className="plumbing-source-filter">
                Platform
                <select
                  aria-label="Advertising platform"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                >
                  <option value="all">Google + Microsoft Ads</option>
                  <option value="google_ads">Google Ads</option>
                  <option value="microsoft_ads">Microsoft Ads</option>
                </select>
              </label>
              <Card title="Campaign performance">
                <Table
                  headers={[
                    "Campaign",
                    "Spend",
                    "Clicks",
                    "CPC",
                    "Conversions",
                    "CPA",
                    "Qualified",
                    "Booked",
                    "Revenue",
                    "ROAS",
                  ]}
                  rows={data.ads
                    .filter((a) => source === "all" || a.source === source)
                    .map((a) => [
                      <span key={a.campaign}>
                        <strong>{a.campaign}</strong>
                        <small>{sourceLabel(a.source)}</small>
                      </span>,
                      gbp(a.spend),
                      a.clicks,
                      gbp(a.cpc),
                      a.conversions,
                      gbp(a.cpa),
                      a.qualified,
                      a.booked,
                      gbp(a.revenue),
                      multiplier(a.roas),
                    ])}
                />
              </Card>
              <Card title="Keywords & search terms">
                <Table
                  headers={[
                    "Keyword / search term",
                    "Campaign",
                    "Spend",
                    "Clicks",
                    "CPC",
                    "Conversions",
                    "CPA",
                    "Qualified at keyword",
                    "Keyword revenue",
                  ]}
                  rows={data.terms
                    .filter((t) => source === "all" || t.source === source)
                    .map((t) => [
                      <span key={`${t.keyword}-${t.searchTerm}`}>
                        <strong>{t.keyword}</strong>
                        <small>Search term: {t.searchTerm}</small>
                      </span>,
                      t.campaign,
                      gbp(t.spend),
                      t.clicks,
                      gbp(t.cpc),
                      t.conversions,
                      gbp(t.cpa),
                      t.qualified,
                      gbp(t.keywordRevenue),
                    ])}
                />
                <p className="plumbing-note">
                  Search-term spend/conversions come from the import. CRM
                  qualification and revenue are attributed at keyword level and
                  repeated as context; do not sum these columns across search
                  terms.
                </p>
              </Card>
            </>
          )}
          {view === "tracking" && (
            <>
              <div className="plumbing-inline-metrics">
                <span>
                  Matched observations{" "}
                  <strong>
                    {data.tracking.filter((t) => t.status === "matched").length}
                  </strong>
                </span>
                <span>
                  Require review{" "}
                  <strong>
                    {data.tracking.filter((t) => t.status !== "matched").length}
                  </strong>
                </span>
                <span>
                  Missing systems{" "}
                  <strong>
                    {["ga4", "gtm", "google_ads", "microsoft_ads"]
                      .filter((s) => !data.tracking.some((t) => t.system === s))
                      .join(", ") || "None in imported data"}
                  </strong>
                </span>
              </div>
              <Card title="CRM vs measured conversions">
                <Table
                  headers={[
                    "Date",
                    "Platform",
                    "Source",
                    "Channel",
                    "CRM unique leads",
                    "Reported",
                    "Difference",
                    "Health",
                  ]}
                  rows={data.tracking.map((t) => [
                    t.date,
                    t.system.toUpperCase(),
                    sourceLabel(t.source),
                    t.channel,
                    t.crm,
                    t.conversions,
                    t.delta === null
                      ? "Not comparable"
                      : `${t.delta > 0 ? "+" : ""}${t.delta}`,
                    <span
                      key="status"
                      className={`plumbing-chip ${t.status === "matched" ? "ok" : "warning"}`}
                    >
                      {t.status.replaceAll("_", " ")}
                    </span>,
                  ])}
                />
                <p className="plumbing-note">
                  A match compares imported unique-lead observations with unique
                  CRM contacts for the same date, source and channel. It is not
                  a GTM installation test. Attribution windows, consent, missing
                  CRM records and duplicates can explain differences.
                </p>
              </Card>
            </>
          )}
          {view === "calls" && (
            <>
              <div className="plumbing-inline-metrics">
                <span>
                  Calls <strong>{data.calls.length}</strong>
                </span>
                <span>
                  Answered{" "}
                  <strong>
                    {data.calls.filter((c) => c.outcome === "answered").length}
                  </strong>
                </span>
                <span>
                  Missed{" "}
                  <strong>
                    {data.calls.filter((c) => c.outcome === "missed").length}
                  </strong>
                </span>
              </div>
              <Card title="Every call, linked to its lead">
                <Table
                  headers={[
                    "Time · London",
                    "Caller",
                    "Number dialled",
                    "Outcome",
                    "Duration",
                    "Source / campaign",
                    "Landing page",
                  ]}
                  rows={data.calls.map((c) => [
                    new Date(c.timestamp).toLocaleString("en-GB", {
                      timeZone: BRAND.timezone,
                    }),
                    <button
                      key={c.id}
                      className="plumbing-link"
                      onClick={() => openLead(c.leadId)}
                    >
                      {c.name}
                      <small>{c.phone}</small>
                    </button>,
                    c.calledNumber,
                    <span
                      key="outcome"
                      className={`plumbing-chip ${c.outcome === "missed" ? "warning" : "ok"}`}
                    >
                      {c.outcome}
                    </span>,
                    c.duration === null
                      ? "Unknown"
                      : `${Math.floor(c.duration / 60)}:${String(c.duration % 60).padStart(2, "0")}`,
                    <span key="campaign">
                      {sourceLabel(c.source)}
                      <small>{c.campaign}</small>
                    </span>,
                    c.landingPage,
                  ])}
                />
                <p className="plumbing-note">
                  Import provider call logs using stable IDs. This view does not
                  provision phone numbers, record audio or connect a telephone
                  provider automatically.
                </p>
              </Card>
            </>
          )}
          {view === "localSeo" && (
            <>
              <SeoAudit wid={wid} demo={data.demo} />
              <Card title="Google Business Profile & local search observations">
                <Table
                  headers={[
                    "Checked",
                    "Location / service",
                    "Keyword",
                    "Rank",
                    "Competitor / rank",
                    "Calls",
                    "Reviews",
                    "Rating",
                  ]}
                  rows={data.localSeo.map((r) => [
                    r.date,
                    <span key={r.location}>
                      <strong>{r.location}</strong>
                      <small>{r.service}</small>
                    </span>,
                    r.keyword,
                    r.rank ?? "Not measured",
                    `${r.competitor || "Not recorded"} · ${r.competitor_rank ?? "—"}`,
                    r.calls,
                    r.reviews,
                    r.rating ?? "—",
                  ])}
                />
                <p className="plumbing-note">
                  Each row is a dated location/keyword observation. Calls and
                  review counts are profile-level context; do not sum repeated
                  profile metrics across keywords. DEMO rankings and reviews are
                  illustrative, not actual company results.
                </p>
              </Card>
            </>
          )}
          <Card
            title="Data & demo files"
            action={
              <button
                className="crm-text-button"
                onClick={() =>
                  downloadFile(
                    `local-plumbing-${view}-${data.to}.json`,
                    JSON.stringify(data, null, 2),
                  )
                }
              >
                <Icon name="download" size={15} />
                Export evidence
              </button>
            }
          >
            <div className="plumbing-import">
              <div>
                <p>
                  Use the existing Google/Stripe connectors for authenticated
                  reports, or import dated provider exports here.
                </p>
                <button
                  className="crm-text-button"
                  onClick={() => navigate("connectors")}
                >
                  Open connectors <Icon name="arrow" size={14} />
                </button>
                <small>
                  Last imported:{" "}
                  {Object.entries(data.importedAt)
                    .map(
                      ([key, time]) =>
                        `${key} ${new Date(time!).toLocaleDateString("en-GB")}`,
                    )
                    .join(" · ") || "No observations imported"}
                </small>
              </div>
              <div>
                <select
                  aria-label="Import type"
                  value={importKind}
                  onChange={(e) => setImportKind(e.target.value)}
                  disabled={busy || readOnly}
                >
                  <option value="ads">Ads keywords & search terms</option>
                  <option value="tracking">Tracking observations</option>
                  <option value="calls">Call provider log</option>
                  <option value="localSeo">GBP & local SEO</option>
                </select>
                <label
                  className={`crm-button ${busy || readOnly ? "disabled" : ""}`}
                >
                  {busy ? "Importing…" : "Import CSV / JSON"}
                  <input
                    type="file"
                    accept=".csv,.json"
                    disabled={busy || readOnly}
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void importFile(file);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
            </div>
            <div className="plumbing-downloads">
              {[
                ["ads-keywords-demo.csv", "Ads example"],
                ["call-tracking-demo.csv", "Calls example"],
                ["tracking-health-demo.csv", "Tracking example"],
                ["local-seo-demo.csv", "Local SEO example"],
                ["plumbing-demo.json", "Full DEMO pack"],
                ["company-brain.md", "Company Brain"],
              ].map(([file, label]) => (
                <a key={file} href={`/demo/${file}`} download>
                  {label}
                  <Icon name="download" size={14} />
                </a>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
