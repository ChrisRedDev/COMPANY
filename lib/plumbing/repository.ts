import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  database,
  transaction,
  readWorkspace,
  createWorkspace,
  saveWorkspace,
  audit,
} from "../local/database";
import { leadDatabase, sqliteLeads } from "../leads/sqlite";
import {
  parseLead,
  parseEvent,
  LEAD_STATUSES,
  uuid,
  type LeadStatus,
  type LeadBundle,
  type EventType,
} from "../leads/model";
import { newLead, addEvent, updateLead } from "../leads/domain";
import { leadHandler } from "../leads/http";
import { marketingRows } from "../integrations/repository";
import { saveDocument, listDocuments } from "../knowledge/repository";
import { newJob } from "../automation/model";
import {
  plumbingReport,
  ukDay,
  type PlumbingInputs,
  type AdTerm,
  type CallRow,
} from "./model";
import { validateImport, importKey, type ImportKind } from "./imports";
import { auditHtml } from "./seo";
import { BRAND } from "./model";

function tables() {
  const db = database();
  db.exec(
    "CREATE TABLE IF NOT EXISTS plumbing_imports(workspace_id TEXT NOT NULL REFERENCES workspaces(id),kind TEXT NOT NULL,record_key TEXT NOT NULL,payload TEXT NOT NULL,imported_at TEXT NOT NULL,PRIMARY KEY(workspace_id,kind,record_key)); CREATE TABLE IF NOT EXISTS plumbing_demo(workspace_id TEXT PRIMARY KEY REFERENCES workspaces(id),version INTEGER NOT NULL,ready INTEGER NOT NULL DEFAULT 0);",
  );
  return db;
}
export function plumbingInputs(wid: string): PlumbingInputs {
  readWorkspace(wid);
  const db = tables(),
    rows = db
      .prepare(
        "SELECT kind,payload,imported_at FROM plumbing_imports WHERE workspace_id=?",
      )
      .all(wid);
  const data: PlumbingInputs = {
    ads: [],
    tracking: [],
    localSeo: [],
    importedAt: {},
    demo: !!db
      .prepare(
        "SELECT workspace_id FROM plumbing_demo WHERE workspace_id=? AND ready=1",
      )
      .get(wid),
  };
  for (const r of rows) {
    if (r.kind === "ads") data.ads.push(JSON.parse(String(r.payload)));
    if (r.kind === "tracking")
      data.tracking.push(JSON.parse(String(r.payload)));
    if (r.kind === "localSeo")
      data.localSeo.push(JSON.parse(String(r.payload)));
    data.importedAt[r.kind as ImportKind] = String(r.imported_at);
  }
  return data;
}
export async function allLeadBundles(wid: string) {
  readWorkspace(wid);
  return Promise.all(
    leadDatabase()
      .prepare(
        "SELECT id FROM leads WHERE workspace_id=? ORDER BY created_at DESC",
      )
      .all(wid)
      .map((r) => sqliteLeads.read(wid, String(r.id))),
  );
}
export async function reportFor(wid: string, from: string, to: string) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(from) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(to) ||
    !Number.isFinite(Date.parse(from)) ||
    !Number.isFinite(Date.parse(to)) ||
    from > to ||
    (Date.parse(to) - Date.parse(from)) / 86400000 > 365
  )
    throw Error("Choose a valid date range of at most 366 days.");
  const rows = marketingRows(wid),
    inputs = plumbingInputs(wid),
    bundles = await allLeadBundles(wid);
  const saved = database()
    .prepare(
      "SELECT payload FROM provider_data WHERE workspace_id=? AND provider='google_ads'",
    )
    .get(wid);
  const live = saved ? JSON.parse(String(saved.payload))?.report : null;
  // Reuse the saved Google connector's daily report when no overlapping imported
  // Google campaign data exists. Its aggregate daily feed is labelled explicitly.
  if (!inputs.demo && live?.currency === "GBP" && Array.isArray(live.daily))
    for (const day of live.daily) {
      if (!rows.some((r) => r.source === "google_ads" && r.date === day.date))
        rows.push({
          date: day.date,
          source: "google_ads",
          campaign: "Google Ads account total (live connector)",
          spend: Number(day.cost ?? 0),
          impressions: Number(day.impressions ?? 0),
          clicks: Number(day.clicks ?? 0),
          leads: Number(day.conversions ?? 0),
          qualified: 0,
          revenue: 0,
        });
    }
  return {
    ...plumbingReport(bundles, rows, inputs, from, to),
    liveGoogleCurrency: live?.currency ?? null,
  };
}
export async function importRows(wid: string, kind: ImportKind, raw: unknown) {
  readWorkspace(wid);
  const rows = validateImport(kind, raw);
  const db = tables(),
    at = new Date().toISOString();
  if (kind === "calls") {
    // Existing Lead Hub handles identity conflicts, version checks and event replay.
    for (const row of rows as CallRow[]) {
      const response = await leadHandler(
        new Request("http://localhost/import", { method: "POST" }),
        wid,
        [],
        {
          ...parseLead({
            first_name: row.name,
            phone: row.phone,
            source: row.source,
            campaign: row.campaign,
            landing_page: row.landing_page,
            keyword: row.keyword,
            postcode: row.postcode,
            service: row.service,
            problem: row.problem,
            channel: "call",
          }),
        },
        sqliteLeads,
        plumbingInputs(wid).demo,
      );
      const saved = await response.json();
      if (!response.ok) throw Error(saved.error);
      const bundle = await sqliteLeads.read(wid, saved.lead.id),
        id = stableId(`call:${wid}:${row.id}`);
      const event = parseEvent(
        {
          id,
          event_type: "phone_call",
          source: row.source || "Call provider",
          timestamp: row.timestamp,
          metadata: {
            provider_call_id: row.id,
            call_duration: row.duration,
            call_outcome: row.outcome,
            called_number: row.called_number,
            campaign: row.campaign,
            landing_page: row.landing_page,
            keyword: row.keyword,
          },
        },
        wid,
        bundle.lead.id,
      );
      if (bundle.events.some((e) => e.id === id)) {
        const old = bundle.events.find((e) => e.id === id)!;
        if (JSON.stringify(old) !== JSON.stringify(event))
          throw Error("This provider call id already has different data.");
        continue;
      }
      const next = addEvent(bundle, event);
      next.lead.revision = bundle.lead.revision + 1;
      await sqliteLeads.write(wid, next, bundle.lead.revision, false);
    }
  }
  transaction(() => {
    const statement = db.prepare(
      "INSERT INTO plumbing_imports VALUES(?,?,?,?,?) ON CONFLICT(workspace_id,kind,record_key) DO UPDATE SET payload=excluded.payload,imported_at=excluded.imported_at",
    );
    for (const row of rows)
      statement.run(wid, kind, importKey(kind, row), JSON.stringify(row), at);
    if (kind === "ads") {
      const ads = db
        .prepare(
          "SELECT payload FROM plumbing_imports WHERE workspace_id=? AND kind='ads'",
        )
        .all(wid)
        .map((r) => JSON.parse(String(r.payload)) as AdTerm);
      const keys = new Set(
        (rows as AdTerm[]).map((r) => `${r.date}\0${r.source}\0${r.campaign}`),
      );
      const save = db.prepare(
        "INSERT INTO campaign_days VALUES(?,?,?,?,?) ON CONFLICT(workspace_id,date,source,campaign) DO UPDATE SET payload=excluded.payload",
      );
      for (const key of keys) {
        const [date, source, campaign] = key.split("\0"),
          group = ads.filter(
            (r) =>
              r.date === date && r.source === source && r.campaign === campaign,
          );
        const day = {
          date,
          source,
          campaign,
          spend: group.reduce((s, r) => s + r.spend, 0),
          impressions: group.reduce((s, r) => s + r.impressions, 0),
          clicks: group.reduce((s, r) => s + r.clicks, 0),
          leads: group.reduce((s, r) => s + r.conversions, 0),
          qualified: 0,
          revenue: 0,
        };
        save.run(wid, date, source, campaign, JSON.stringify(day));
      }
    }
    audit(wid, `plumbing.import.${kind}`);
  });
  return rows.length;
}
export const stableId = (value: string) => {
  const h = createHash("sha256").update(value).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
};
export async function transitionLead(
  wid: string,
  lid: string,
  body: Record<string, unknown>,
) {
  if (
    !uuid(lid) ||
    !LEAD_STATUSES.includes(body.status as LeadStatus) ||
    body.status === "won"
  )
    throw Error("Choose a valid plumbing stage.");
  const current = await sqliteLeads.read(wid, lid);
  if (body.revision !== current.lead.revision)
    throw Error("Lead changed. Refresh before saving.");
  if (body.status === current.lead.status) return current;
  const eventType: Partial<Record<LeadStatus, EventType>> = {
    quote: "quote_sent",
    booked: "booking_created",
    in_progress: "job_started",
    completed: "job_completed",
    paid: "payment_received",
  };
  let next = updateLead(
    current,
    parseLead({ ...current.lead, status: body.status }),
  );
  const type = eventType[body.status as LeadStatus];
  if (type) {
    const amount = body.amount ?? current.lead.estimated_value;
    const event = parseEvent(
      {
        id: randomUUID(),
        event_type: type,
        source: "Local Plumbing Services",
        timestamp: new Date().toISOString(),
        metadata: {
          ...(type !== "booking_created"
            ? { amount, currency: current.lead.currency ?? "PLN" }
            : {}),
          ...(type === "booking_created" && body.scheduled_at
            ? { scheduled_at: body.scheduled_at }
            : {}),
          note: "Recorded from plumbing pipeline",
        },
      },
      wid,
      lid,
    );
    next = addEvent(next, event);
  }
  await sqliteLeads.write(wid, next, current.lead.revision, false);
  return sqliteLeads.read(wid, lid);
}
let demoPending: Promise<{ id: string; duplicate: boolean }> | null = null;
export function loadDemo() {
  if (!demoPending)
    demoPending = seedDemo().finally(() => {
      demoPending = null;
    });
  return demoPending;
}
export function ensureCompanyBrain(wid: string) {
  readWorkspace(wid);
  if (
    !listDocuments(wid).some(
      (d) => d.title === "Local Plumbing Services COMPANY BRAIN",
    )
  )
    saveDocument(wid, {
      title: "Local Plumbing Services COMPANY BRAIN",
      category: "company",
      content: readFileSync(
        join(process.cwd(), "public/demo/company-brain.md"),
        "utf8",
      ),
      revision: 0,
    });
}
async function seedDemo() {
  const db = tables();
  const existing = db
    .prepare(
      "SELECT workspace_id FROM plumbing_demo ORDER BY ready DESC LIMIT 1",
    )
    .get();
  const wid = existing
    ? String(existing.workspace_id)
    : createWorkspace("Local Plumbing Services · DEMO");
  if (
    existing &&
    db.prepare("SELECT ready FROM plumbing_demo WHERE workspace_id=?").get(wid)
      ?.ready === 1
  ) {
    ensureDemoSeo(wid);
    return { id: wid, duplicate: true };
  }
  db.prepare(
    "INSERT INTO plumbing_demo VALUES(?,1,0) ON CONFLICT(workspace_id) DO NOTHING",
  ).run(wid);
  const fixture = JSON.parse(
    readFileSync(join(process.cwd(), "public/demo/plumbing-demo.json"), "utf8"),
  );
  const base = ukDay(),
    shift = (day: string) =>
      new Date(
        Date.parse(`${day}T12:00:00Z`) +
          Date.parse(`${base}T12:00:00Z`) -
          Date.parse(`${fixture.reference_date}T12:00:00Z`),
      )
        .toISOString()
        .slice(0, 10);
  const bundles: LeadBundle[] = [];
  for (const [index, lead] of fixture.leads.entries()) {
    const lid = stableId(`demo-lead:${index}`);
    let bundle = newLead(wid, lid, parseLead(lead), true);
    const created = `${shift(lead.date)}T09:00:00Z`;
    bundle.lead.created_at = created;
    for (const [n, row] of lead.events.entries()) {
      const metadata = { ...row.metadata };
      if (metadata.scheduled_at)
        metadata.scheduled_at =
          shift(String(metadata.scheduled_at).slice(0, 10)) +
          String(metadata.scheduled_at).slice(10);
      bundle = addEvent(
        bundle,
        parseEvent(
          {
            id: stableId(`demo-event:${index}:${n}`),
            event_type: row.type,
            source: lead.source,
            timestamp: new Date(
              Date.parse(created) + row.minutes * 60000,
            ).toISOString(),
            metadata: {
              campaign: lead.campaign,
              keyword: lead.keyword,
              landing_page: lead.landing_page,
              ...metadata,
            },
          },
          wid,
          lid,
        ),
      );
    }
    bundle.lead.updated_at = bundle.events.at(-1)?.timestamp ?? created;
    bundle.lead.revision = 1;
    await sqliteLeads.write(wid, bundle, 0, true);
    bundles.push(bundle);
  }
  for (const kind of ["ads", "tracking", "localSeo"] as const)
    await importRows(
      wid,
      kind,
      fixture[kind].map((r: Record<string, unknown>) => ({
        ...r,
        date: shift(String(r.date)),
      })),
    );
  const state = readWorkspace(wid);
  if (!state.data.firms.length) {
    state.data.firms = bundles.map((b) => ({
      id: b.lead.id,
      name: leadNameForDemo(b),
      nip: "",
      city: b.lead.postcode ?? "",
      industry: b.lead.service ?? "",
      website: "",
      notes: "Synthetic DEMO customer",
      created: ukDay(b.lead.created_at),
      phone: b.lead.phone,
      email: b.lead.email,
    }));
    state.data.deals = bundles
      .filter((b) => b.appointments.length)
      .map((b) => ({
        id: stableId(`deal:${b.lead.id}`),
        companyId: b.lead.id,
        name: b.lead.service ?? "Plumbing job",
        value: b.lead.estimated_value,
        probability: ["paid", "completed"].includes(b.lead.status) ? 100 : 70,
        stage: ["paid", "completed"].includes(b.lead.status)
          ? ("Wygrana" as const)
          : ("Oferta" as const),
        closeDate: ukDay(b.lead.created_at),
        service: {
          status:
            b.lead.status === "paid" || b.lead.status === "completed"
              ? ("completed" as const)
              : b.lead.status === "in_progress"
                ? ("in_progress" as const)
                : ("booked" as const),
          start: londonLocal(
            b.appointments[0].scheduled_at ?? b.lead.created_at,
          ),
          end: londonLocal(
            new Date(
              Date.parse(b.appointments[0].scheduled_at ?? b.lead.created_at) +
                3600000,
            ).toISOString(),
          ),
          resource: `Demo engineer ${b.lead.id.slice(0, 4)}`,
          location: b.lead.postcode ?? "",
          notes: "DEMO job; not a live booking",
          history: [],
        },
      }));
    state.settings = {
      ...state.settings,
      onboarded: true,
      businessMode: "services",
      sender: "Local Plumbing Services",
      automation: {
        jobs: [
          newJob(
            {
              name: "Daily plumbing briefing",
              kind: "agent",
              frequency: "daily",
              time: "08:00",
              prompt:
                "Give me today's plumbing briefing: wasted budget, campaigns to scale, keyword candidates, lead follow-up and tracking discrepancies.",
            },
            randomUUID(),
          ),
        ],
        runs: [],
        reports: [],
      },
    };
    saveWorkspace(wid, state);
  }
  ensureCompanyBrain(wid);
  ensureDemoSeo(wid);
  db.prepare("UPDATE plumbing_demo SET ready=1 WHERE workspace_id=?").run(wid);
  audit(wid, "plumbing.demo.ready");
  return { id: wid, duplicate: false };
}
function ensureDemoSeo(wid: string) {
  const db = database();
  db.exec(
    "CREATE TABLE IF NOT EXISTS plumbing_seo(workspace_id TEXT PRIMARY KEY REFERENCES workspaces(id),payload TEXT NOT NULL)",
  );
  if (
    !db
      .prepare("SELECT workspace_id FROM plumbing_seo WHERE workspace_id=?")
      .get(wid)
  ) {
    const result = {
      ...auditHtml(
        readFileSync(
          join(process.cwd(), "public/demo/seo-audit-demo.html"),
          "utf8",
        ),
        BRAND.website,
        "emergency plumber dartford",
      ),
      demo: true,
    };
    db.prepare("INSERT INTO plumbing_seo VALUES(?,?)").run(
      wid,
      JSON.stringify(result),
    );
  }
}
const londonLocal = (date: string) =>
  new Date(date)
    .toLocaleString("sv-SE", {
      timeZone: "Europe/London",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
    .replace(" ", "T");
function leadNameForDemo(b: LeadBundle) {
  return `${b.lead.first_name} ${b.lead.last_name}`.trim();
}
