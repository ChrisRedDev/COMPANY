const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs"),
  os = require("node:os"),
  path = require("node:path");
const { load, closeTestDatabases } = require("./helpers/load-ts.cjs");
const model = load("lib/leads/model.ts"),
  domain = load("lib/leads/domain.ts", { "./model": model });
const plumbing = load("lib/plumbing/model.ts"),
  imports = load("lib/plumbing/imports.ts");
const wid = "00000000-0000-4000-8000-000000000001";
const empty = {
  ads: [],
  tracking: [],
  localSeo: [],
  importedAt: {},
  demo: false,
};
function bundle(id, change = {}, events = []) {
  let b = domain.newLead(
    wid,
    `00000000-0000-4000-8000-${String(id).padStart(12, "0")}`,
    model.parseLead({
      first_name: "Customer",
      phone: `07700900${String(id).padStart(3, "0")}`,
      source: "google_ads",
      campaign: "Emergency",
      keyword: "plumber dartford",
      ...change,
    }),
  );
  b.lead.created_at = "2026-10-06T09:00:00Z";
  events.forEach((event) => {
    b = domain.addEvent(
      b,
      model.parseEvent(
        {
          id: crypto.randomUUID(),
          timestamp: "2026-10-06T10:00:00Z",
          source: "CRM",
          metadata: {},
          ...event,
        },
        wid,
        b.lead.id,
      ),
    );
  });
  return b;
}
test("UK identity, postcode and complete plumbing pipeline", () => {
  assert.equal(model.phoneKey("07392 234913"), "+447392234913");
  assert.equal(model.phoneKey("+44 7392 234913"), "+447392234913");
  assert.equal(
    model.parseLead({ first_name: "A", postcode: "da1 2jh" }).postcode,
    "DA1 2JH",
  );
  assert.throws(() =>
    model.parseLead({ first_name: "A", postcode: "NOT A POSTCODE" }),
  );
  assert.equal(model.PLUMBING_PIPELINE.length, 9);
  assert.equal(model.parseLead({ first_name: "A" }).currency, "GBP");
});
test("owner revenue is cash received; ROAS excludes organic and legacy PLN, London date matters", () => {
  const a = bundle(1, { status: "paid" }, [
    { event_type: "quote_sent", metadata: { amount: 9000 } },
    { event_type: "booking_created" },
    {
      event_type: "payment_received",
      metadata: { amount: 300, currency: "GBP" },
    },
  ]);
  const organic = bundle(2, { source: "organic", status: "paid" }, [
    {
      event_type: "payment_received",
      metadata: { amount: 200, currency: "GBP" },
    },
  ]);
  const legacy = bundle(3, { currency: "PLN", status: "paid" }, [
    {
      event_type: "payment_received",
      metadata: { amount: 1000, currency: "PLN" },
    },
  ]);
  const demo = bundle(4, {}, [
    {
      event_type: "payment_received",
      metadata: { amount: 99999, currency: "GBP" },
    },
  ]);
  demo.lead.is_demo = true;
  const report = plumbing.plumbingReport(
    [a, organic, legacy, demo],
    [
      {
        date: "2026-10-06",
        source: "google_ads",
        campaign: "Emergency",
        spend: 100,
        clicks: 10,
        impressions: 100,
        leads: 1,
      },
    ],
    empty,
    "2026-10-06",
    "2026-10-06",
  );
  assert.equal(report.kpis.revenue, 500);
  assert.equal(report.kpis.roas, 3);
  assert.equal(report.kpis.costPerBooked, 100);
  assert.equal(report.legacyCurrencyRecords, 1);
  assert.equal(report.sources.find((s) => s.source === "organic").leads, 1);
  assert.equal(plumbing.ukDay("2026-10-05T23:30:00Z"), "2026-10-06");
  assert.equal(plumbing.ratio(1, 0), null);
});
test("tracking compares unique answered contacts with compatible definitions, unknown is not healthy", () => {
  const b = bundle(5, {}, [
    {
      event_type: "phone_call",
      metadata: { call_outcome: "answered", call_duration: 30 },
    },
    {
      event_type: "phone_call",
      metadata: { call_outcome: "answered", call_duration: 40 },
    },
  ]);
  const missed = bundle(6, {}, [
    {
      event_type: "phone_call",
      metadata: { call_outcome: "missed", call_duration: 0 },
    },
  ]);
  const rows = [
    {
      date: "2026-10-06",
      source: "google_ads",
      channel: "call",
      system: "ga4",
      conversions: 4,
      definition: "unique_leads",
      timezone: "Europe/London",
      currency: "GBP",
    },
    {
      date: "2026-10-06",
      source: "google_ads",
      channel: "call",
      system: "gtm",
      conversions: 2,
      definition: "events",
      timezone: "Europe/London",
      currency: "GBP",
    },
  ];
  const r = plumbing.plumbingReport(
    [b, missed],
    [],
    { ...empty, tracking: rows },
    "2026-10-06",
    "2026-10-06",
  );
  assert.equal(r.tracking[0].crm, 1);
  assert.equal(r.tracking[0].delta, 3);
  assert.equal(r.tracking[1].delta, null);
  assert.equal(r.tracking[1].status, "not_comparable");
  assert.ok(
    plumbing
      .plumbingReport([], [], empty, "2026-10-06", "2026-10-06")
      .briefing.some((i) => i.id === "tracking-unknown"),
  );
});
test("CSV provider imports validate all rows, currency and conversion definition", () => {
  assert.equal(
    imports.csvTable('name,note\nA,"hello, world"')[0].note,
    "hello, world",
  );
  assert.throws(() => imports.csvTable("a,a\n1,2"));
  assert.throws(() =>
    imports.validateImport("ads", [
      {
        date: "2026-10-06",
        source: "google_ads",
        campaign: "X",
        currency: "PLN",
      },
    ]),
  );
  assert.throws(() =>
    imports.validateImport("calls", [
      {
        id: "a",
        timestamp: "2026-10-06T09:00:00Z",
        phone: "07700900123",
        outcome: "missed",
        duration: 10,
      },
    ]),
  );
});
test("DEMO is durable and isolated; pipeline and call replays do not double payments or calls", async () => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), "plumbing-test-")),
    previous = process.env.CRM_DATABASE_PATH;
  process.env.CRM_DATABASE_PATH = path.join(folder, "crm.sqlite");
  try {
    const db = load("lib/local/database.ts"),
      sql = load("lib/leads/sqlite.ts", { "../local/database": db }),
      knowledge = load("lib/knowledge/repository.ts", {
        "../local/database": db,
      }),
      integrations = load("lib/integrations/repository.ts", {
        "../local/database": db,
      });
    const repo = load("lib/plumbing/repository.ts", {
      "../local/database": db,
      "../leads/sqlite": sql,
      "../knowledge/repository": knowledge,
      "../integrations/repository": integrations,
    });
    const real = db.createWorkspace("Local Plumbing Services");
    const seeded = await repo.loadDemo(),
      again = await repo.loadDemo();
    assert.equal(seeded.id, again.id);
    assert.equal(again.duplicate, true);
    assert.equal(
      (
        await sql.sqliteLeads.list(seeded.id, {
          search: "",
          status: "",
          scope: "demo",
          page: 0,
        })
      ).total,
      20,
    );
    assert.equal(
      (await repo.reportFor(real, plumbing.ukDay(), plumbing.ukDay())).kpis
        .leads,
      0,
    );
    assert.ok(
      knowledge.listDocuments(seeded.id)[0].content.includes("15378664"),
    );
    const demoReport = await repo.reportFor(
      seeded.id,
      "2026-01-01",
      "2026-12-31",
    );
    assert.equal(demoReport.kpis.revenue, 5420);
    assert.equal(demoReport.demo, true);
    const lead = demoReport.leads.find((l) => l.status === "new");
    const paid = await repo.transitionLead(seeded.id, lead.id, {
      status: "paid",
      revision: lead.revision,
      amount: 123,
    });
    assert.equal(paid.payments.length, 1);
    const duplicate = await repo.transitionLead(seeded.id, lead.id, {
      status: "paid",
      revision: paid.lead.revision,
      amount: 123,
    });
    assert.equal(duplicate.lead.revenue, 123);
    await assert.rejects(
      () =>
        repo.transitionLead(seeded.id, lead.id, {
          status: "completed",
          revision: lead.revision,
        }),
      /changed/,
    );
    const row = {
      id: "provider-1",
      timestamp: new Date().toISOString(),
      phone: "07700900999",
      name: "Call test",
      called_number: "07392234913",
      outcome: "answered",
      duration: 120,
      source: "google_ads",
      campaign: "Emergency",
      landing_page: "/",
      keyword: "plumber dartford",
      postcode: "DA1 2JH",
      service: "Leak detection",
      problem: "Leak",
    };
    await repo.importRows(real, "calls", [row]);
    await repo.importRows(real, "calls", [row]);
    const calls = await repo.reportFor(
      real,
      plumbing.ukDay(),
      plumbing.ukDay(),
    );
    assert.equal(calls.calls.length, 1);
    assert.equal(calls.leads.length, 1);
    assert.equal(calls.demo, false);
    await assert.rejects(
      () => repo.importRows(real, "calls", [{ ...row, duration: 121 }]),
      /different data/,
    );
    assert.equal(
      (
        await repo.reportFor(seeded.id, plumbing.ukDay(), plumbing.ukDay())
      ).calls.some((c) => c.phone === row.phone),
      false,
    );
  } finally {
    closeTestDatabases(folder);
    if (previous === undefined) delete process.env.CRM_DATABASE_PATH;
    else process.env.CRM_DATABASE_PATH = previous;
    fs.rmSync(folder, { recursive: true, force: true });
  }
});
test("SEO reports its actual limits and flags a disconnected callback form", () => {
  const seo = load("lib/plumbing/seo.ts");
  const html = fs.readFileSync("public/demo/seo-audit-demo.html", "utf8");
  const r = seo.auditHtml(
    html,
    "https://local-plumbing-services.co.uk/",
    "emergency plumber dartford",
  );
  assert.equal(r.checks.find((c) => c.id === "demo-form").status, "fail");
  assert.equal(r.checks.find((c) => c.id === "call").status, "pass");
  assert.ok(r.limitations[0].includes("no JavaScript"));
  assert.equal(r.demo, false);
  assert.ok(r.score < 100);
});
