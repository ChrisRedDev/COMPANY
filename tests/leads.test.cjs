const { test } = require("node:test"),
  assert = require("node:assert/strict");
const { load } = require("./helpers/load-ts.cjs");
const fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os");
const model = load("lib/leads/model.ts"),
  domain = load("lib/leads/domain.ts", { "./model": model }),
  demo = load("lib/leads/demo.ts", { "./model": model, "./domain": domain });
const lead = (change = {}) =>
  model.parseLead({
    first_name: "Anna",
    last_name: "Kowalska",
    email: "Anna@Example.com",
    phone: "500 100 200",
    source: "Google Ads",
    campaign: "Oferta Warszawa",
    estimated_value: 280,
    revenue: 0,
    ...change,
  });
const wid = "00000000-0000-4000-8000-000000000001",
  lid = "00000000-0000-4000-8000-000000000002";
test("identity: normalizacja e-maili, polskich i międzynarodowych telefonów", () => {
  assert.equal(model.emailKey(" ANNA@Example.COM "), "anna@example.com");
  for (const phone of [
    "500100200",
    "+48 500-100-200",
    "0048500100200",
    "48500100200",
  ])
    assert.equal(model.phoneKey(phone), "+48500100200");
  assert.equal(model.phoneKey("0044 7700 900123"), "+447700900123");
  assert.equal(model.phoneKey(""), "");
  assert.throws(() => model.phoneKey("500 ext 12"));
  assert.throws(() => model.parseLead({}));
  assert.throws(() => lead({ revenue: -1 }));
  assert.throws(() => lead({ status: "unknown" }));
  assert.throws(() => lead({ email: "wrong" }));
});
test("identity: konflikt e-mailu i telefonu dwóch leadów wymaga wyjaśnienia", () => {
  const a = domain.newLead(wid, lid, lead()).lead,
    b = domain.newLead(
      wid,
      "00000000-0000-4000-8000-000000000003",
      lead({ email: "b@example.com", phone: "500100201" }),
    ).lead;
  assert.equal(model.resolveIdentity([a, b], "ANNA@example.com", ""), a);
  assert.throws(
    () => model.resolveIdentity([a, b], a.email, b.phone),
    /różnych leadów/,
  );
  assert.equal(
    model.resolveIdentity([a, b], a.email, a.phone, a.id),
    undefined,
  );
});
test("zdarzenia: walidacja metadata, czasu, kwoty płatności i zakresu workspace", () => {
  const raw = {
    id: crypto.randomUUID(),
    event_type: "phone_call",
    source: "Telefon",
    timestamp: "2026-10-05T10:00:00+02:00",
    metadata: { call_duration: 222 },
  };
  assert.equal(
    model.parseEvent(raw, wid, lid).timestamp,
    "2026-10-05T08:00:00.000Z",
  );
  assert.throws(() =>
    model.parseEvent({ ...raw, timestamp: "2026-02-30T10:00:00Z" }, wid, lid),
  );
  assert.throws(() =>
    model.parseEvent({ ...raw, metadata: { call_duration: -1 } }, wid, lid),
  );
  assert.throws(() =>
    model.parseEvent(
      { ...raw, event_type: "payment_received", metadata: {} },
      wid,
      lid,
    ),
  );
  assert.throws(
    () =>
      domain.addEvent(
        domain.newLead(wid, lid, lead()),
        model.parseEvent(raw, "00000000-0000-4000-8000-000000000004", lid),
      ),
    /przestrzeni/,
  );
});
test("timeline i atrybucja: zdarzenia wsteczne porządkują first/last touch", () => {
  let b = domain.newLead(wid, lid, lead());
  const event = (source, time) =>
    model.parseEvent(
      {
        id: crypto.randomUUID(),
        event_type: "page_view",
        source,
        timestamp: time,
        metadata: {},
      },
      wid,
      lid,
    );
  b = domain.addEvent(b, event("Direct", "2026-10-05T12:00:00Z"));
  b = domain.addEvent(b, event("Google Ads", "2026-10-05T10:00:00Z"));
  b = domain.addEvent(b, event("Telefon", "2026-10-05T11:00:00Z"));
  assert.equal(b.lead.first_touch_source, "Google Ads");
  assert.equal(b.lead.last_touch_source, "Direct");
  assert.equal(b.events[0].source, "Google Ads");
  assert.equal(b.events[2].source, "Direct");
  assert.equal(domain.addEvent(b, b.events[0]), b);
});
test("DEMO: cały flow, jedna oferta/praca, płatność i jawne oznaczenie", () => {
  const b = demo.demoLead(wid);
  assert.equal(b.lead.is_demo, true);
  assert.equal(b.lead.revenue, 280);
  assert.equal(b.events.length, 11);
  assert.equal(b.quotes.length, 1);
  assert.equal(b.quotes[0].status, "accepted");
  assert.equal(b.jobs.length, 1);
  assert.equal(b.jobs[0].status, "completed");
  assert.equal(b.appointments.length, 1);
  assert.equal(b.payments.length, 1);
  assert.equal(b.touchpoints.length, 4);
  assert.equal(b.conversions.length, 6);
  assert.equal(b.lead.first_touch_source, "Google Ads");
  assert.equal(b.lead.last_touch_source, "Telefon");
});
test("odtworzenie ledgeru jest chronologiczne i zachowuje ręczny revenue", () => {
  let b = domain.newLead(wid, lid, lead({ revenue: 100 }));
  const event = (type, time, metadata) =>
    model.parseEvent(
      {
        id: crypto.randomUUID(),
        event_type: type,
        source: "CRM",
        timestamp: time,
        metadata,
      },
      wid,
      lid,
    );
  b = domain.addEvent(
    b,
    event("quote_accepted", "2026-10-05T12:00:00Z", { amount: 280 }),
  );
  b = domain.addEvent(
    b,
    event("quote_sent", "2026-10-05T10:00:00Z", { amount: 280 }),
  );
  assert.equal(b.quotes.length, 1);
  assert.equal(b.quotes[0].status, "accepted");
  const payment = event("payment_received", "2026-10-05T13:00:00Z", {
    amount: 280,
  });
  b = domain.addEvent(b, payment);
  assert.equal(b.lead.revenue, 380);
  b = domain.addEvent(
    b,
    event("note_added", "2026-10-05T14:00:00Z", { note: "Ustalenia" }),
  );
  assert.equal(b.lead.revenue, 380);
  const changed = domain.updateLead(
    b,
    lead({ status: "qualified", revenue: 400 }),
  );
  assert.equal(changed.lead.revenue, 400);
  assert.equal(changed.lead.status, "qualified");
  assert.ok(changed.events.some((e) => e.event_type === "status_change"));
  const reordered = { ...payment, metadata: { note: "x", amount: 280 } },
    original = { ...payment, metadata: { amount: 280, note: "x" } };
  assert.equal(model.sameEvent(reordered, original), true);
});
test("SQLite/API: lead, duplikaty, status, revenue, idempotencja, izolacja i rollback", async () => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), "lead-hub-")),
    prev = process.env.CRM_DATABASE_PATH;
  process.env.CRM_DATABASE_PATH = path.join(folder, "test.sqlite");
  const db = load("lib/local/database.ts"),
    repo = load("lib/leads/sqlite.ts", {
      "../local/database": db,
      "./model": model,
    }).sqliteLeads;
  const http = load("lib/leads/http.ts", {
    "./model": model,
    "./domain": domain,
    "./demo": demo,
  });
  try {
    const a = db.createWorkspace("Firma A"),
      b = db.createWorkspace("Firma B");
    const invoke = (wid, method, path, body = {}) =>
      http.leadHandler(
        new Request("http://localhost/api/local/workspaces/" + wid + "/leads", {
          method,
        }),
        wid,
        path,
        body,
        repo,
      );
    const created = await invoke(a, "POST", [], lead());
    assert.equal(created.status, 201);
    const first = (await created.json()).lead;
    assert.equal(
      (
        await invoke(
          a,
          "POST",
          [],
          lead({ email: "ANNA@EXAMPLE.COM", phone: "" }),
        )
      ).status,
      200,
    );
    assert.equal(
      (
        await invoke(
          a,
          "POST",
          [],
          lead({ email: "", phone: "0048 500 100 200" }),
        )
      ).status,
      200,
    );
    assert.equal(
      (await repo.list(a, { search: "", status: "", scope: "all", page: 0 }))
        .total,
      1,
    );
    const second = (
      await (
        await invoke(
          a,
          "POST",
          [],
          lead({ email: "b@example.com", phone: "500100201" }),
        )
      ).json()
    ).lead;
    assert.equal(
      (
        await invoke(
          a,
          "POST",
          [],
          lead({ email: first.email, phone: second.phone }),
        )
      ).status,
      409,
    );
    assert.equal((await invoke(b, "POST", [], lead())).status, 201);
    assert.equal((await invoke(b, "GET", [first.id])).status, 404);
    assert.equal((await invoke("bad", "GET", [])).status, 400);
    const before = db.readWorkspace(a);
    const raw = {
      id: crypto.randomUUID(),
      revision: 1,
      event_type: "payment_received",
      source: "Klient",
      timestamp: "2026-10-05T12:00:00Z",
      metadata: { amount: 280, note: "Wpłata" },
      workspace_id: b,
    };
    const paid = await invoke(a, "POST", [first.id, "events"], raw);
    assert.equal(paid.status, 200);
    assert.equal((await paid.json()).lead.revenue, 280);
    const retry = await invoke(a, "POST", [first.id, "events"], {
      ...raw,
      metadata: { note: "Wpłata", amount: 280 },
    });
    assert.equal(retry.status, 200);
    const state = await repo.read(a, first.id);
    assert.equal(state.payments.length, 1);
    assert.equal(state.lead.workspace_id, a);
    const changed = await invoke(a, "PUT", [first.id], {
      ...lead({ status: "qualified", revenue: 300 }),
      revision: state.lead.revision,
    });
    assert.equal(changed.status, 200);
    assert.equal((await changed.json()).lead.revenue, 300);
    assert.equal(
      (await invoke(a, "PUT", [first.id], { ...lead(), revision: 1 })).status,
      409,
    );
    assert.equal(
      (
        await invoke(a, "PUT", [first.id], {
          ...lead({ email: second.email }),
          revision: 3,
        })
      ).status,
      409,
    );
    assert.equal(db.readWorkspace(a).revision, before.revision);
    assert.equal(
      (
        await repo.read(
          b,
          (
            await repo.list(b, {
              search: "",
              status: "",
              scope: "all",
              page: 0,
            })
          ).leads[0].id,
        )
      ).lead.revenue,
      0,
    );
    const invalid = structuredClone(await repo.read(a, first.id));
    invalid.lead.revision++;
    invalid.events.push({
      ...invalid.events[0],
      id: crypto.randomUUID(),
      workspace_id: b,
    });
    await assert.rejects(repo.write(a, invalid, 3, false), /relacja/);
    assert.equal((await repo.read(a, first.id)).lead.revision, 3);
    const firstDemo = await invoke(a, "POST", ["demo"]);
    assert.equal(firstDemo.status, 201);
    const secondDemo = await invoke(a, "POST", ["demo"]);
    assert.equal(secondDemo.status, 200);
    assert.equal(
      (await repo.list(a, { search: "", status: "", scope: "demo", page: 0 }))
        .total,
      1,
    );
    assert.equal(
      (await repo.list(a, { search: "%", status: "", scope: "all", page: 0 }))
        .total,
      0,
    );
    const touch = {
      id: crypto.randomUUID(),
      revision: 3,
      event_type: "phone_call",
      source: "Telefon",
      timestamp: "2026-10-04T10:00:00Z",
      metadata: {},
    };
    assert.equal(
      (await invoke(a, "POST", [first.id, "events"], touch)).status,
      200,
    );
    const historical = await repo.read(a, first.id);
    assert.equal(historical.touchpoints[0].campaign, "Oferta Warszawa");
    assert.equal(
      (
        await invoke(a, "PUT", [first.id], {
          ...lead({
            campaign: "Nowa kampania",
            status: "qualified",
            revenue: 300,
          }),
          revision: historical.lead.revision,
        })
      ).status,
      200,
    );
    assert.equal(
      (await invoke(a, "POST", [first.id, "events"], touch)).status,
      200,
    );
    const more = {
      id: crypto.randomUUID(),
      revision: (await repo.read(a, first.id)).lead.revision,
      event_type: "email",
      source: "Email",
      timestamp: "2026-10-05T14:00:00Z",
      metadata: {},
    };
    assert.equal(
      (await invoke(a, "POST", [first.id, "events"], more)).status,
      200,
    );
    const preserved = await repo.read(a, first.id);
    assert.equal(preserved.touchpoints[0].campaign, "Oferta Warszawa");
    assert.equal(preserved.touchpoints[1].campaign, "Nowa kampania");
    for (let i = 0; i < 51; i++)
      assert.equal(
        (
          await invoke(
            b,
            "POST",
            [],
            lead({
              email: `page${i}@example.com`,
              phone: "",
              last_name: "Żółć",
              campaign: "Kampania testowa",
            }),
          )
        ).status,
        201,
      );
    const query = { search: "żółć", status: "", scope: "real", page: 0 };
    assert.equal((await repo.list(b, query)).total, 51);
    assert.equal((await repo.list(b, query)).leads.length, 50);
    assert.equal((await repo.list(b, { ...query, page: 1 })).leads.length, 1);
    assert.equal((await repo.list(a, query)).total, 0);
  } finally {
    db.database().close();
    if (prev === undefined) delete process.env.CRM_DATABASE_PATH;
    else process.env.CRM_DATABASE_PATH = prev;
    fs.rmSync(folder, { recursive: true, force: true });
  }
});
test("cloud API blokuje brak sesji i odmowę dostępu do workspace", async () => {
  const cloud = load("lib/leads/cloud.ts", { "./model": model }),
    http = load("lib/leads/http.ts", {
      "./model": model,
      "./domain": domain,
      "./demo": demo,
    });
  const route = load("app/api/workspaces/[id]/leads/[[...path]]/route.ts", {
    "@/lib/supabase/server": {
      authenticated: async () =>
        Response.json({ error: "Logowanie" }, { status: 401 }),
    },
    "@/lib/leads/cloud": cloud,
    "@/lib/leads/http": http,
  });
  assert.equal(
    (
      await route.GET(new Request("http://localhost"), {
        params: Promise.resolve({ id: wid }),
      })
    ).status,
    401,
  );
  const repo = cloud.cloudLeads({
    rpc: async () => ({ error: { code: "42501" } }),
  });
  assert.equal(
    (await http.leadHandler(new Request("http://localhost"), wid, [], {}, repo))
      .status,
    403,
  );
});
