const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const vm = require("node:vm");
function load(file, stubs = {}) {
  const filename = path.resolve(file);
  const source = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const exports = {};
  const req = (name) =>
    Object.hasOwn(stubs, name)
      ? stubs[name]
      : name === "server-only"
        ? {}
        : name.startsWith(".")
          ? load(path.resolve(path.dirname(filename), name) + ".ts", stubs)
          : require(name);
  vm.runInNewContext(
    source,
    {
      exports,
      require: req,
      Date,
      Intl,
      URL,
      crypto: globalThis.crypto,
      Response,
      Request,
      Buffer,
      process,
      fetch: globalThis.fetch,
      AbortSignal,
    },
    { filename },
  );
  return exports;
}
const model = load("lib/crm/model.ts"),
  backup = load("lib/crm/backup.ts"),
  csv = load("lib/csv.ts");
test("NIP sprawdza sumę kontrolną i dopuszcza pole opcjonalne", () => {
  assert.equal(model.validNip("526-025-09-95"), true);
  assert.equal(model.validNip("5260250994"), false);
  assert.equal(model.validNip("123"), false);
  assert.equal(model.validNip(""), true);
});
test("PLN i daty są formatowane po polsku", () => {
  assert.match(model.money(123000), /123\s000\s?zł/);
  assert.equal(model.dateLabel("2026-03-12"), "12.03.2026");
});
test("adres strony dopuszcza tylko HTTP i HTTPS", () => {
  assert.equal(model.safeWebsite("example.com"), "https://example.com/");
  assert.equal(model.safeWebsite("javascript:alert(1)"), "");
  assert.equal(
    model.safeWebsite("https://example.com"),
    "https://example.com/",
  );
});
test("CSV chroni komórki formuł i cudzysłowy przy średniku", () => {
  assert.equal(
    csv.toCsv([['Nazwa; "firma"', "=1+1", "@formula"]]),
    '"Nazwa; ""firma""";\'=1+1;\'@formula',
  );
});
function archive(change) {
  const data = model.seedData();
  change?.(data);
  return JSON.stringify({ version: 1, data });
}
test("kopia danych przechodzi pełną walidację", () => {
  assert.equal(backup.parseBackup(archive()).firms.length, 5);
});
test("kopia odrzuca błędne referencje, wartości i daty", () => {
  assert.throws(() =>
    backup.parseBackup(archive((d) => (d.contacts[0].companyId = "missing"))),
  );
  assert.throws(() =>
    backup.parseBackup(archive((d) => (d.deals[0].value = -1))),
  );
  assert.throws(() =>
    backup.parseBackup(archive((d) => (d.tasks[0].date = "2026-02-30"))),
  );
  assert.throws(() =>
    backup.parseBackup(archive((d) => d.firms.push(d.firms[0]))),
  );
});
test("niepewna wysyłka wraca do szkicu bez zmiany klucza", () => {
  const d = model.seedData();
  d.mails = [
    {
      id: "mail-one",
      contactId: "c1",
      to: "contact@example.com",
      subject: "Temat",
      body: "Treść",
      status: "sending",
      created: new Date().toISOString(),
      agent: true,
    },
  ];
  const restored = backup.parseBackup(JSON.stringify({ version: 1, data: d }));
  assert.equal(restored.mails[0].status, "draft");
  assert.equal(restored.mails[0].id, "mail-one");
});
test("agent tworzy tekst z projektu i podpisu", () => {
  const d = model.seedData();
  const draft = model.draftFollowup(
    d.contacts[0],
    d.firms[0],
    d.deals[0],
    "Jan",
  );
  assert.match(draft.subject, /Nova Studio/);
  assert.match(draft.body, /Automatyzacja obsługi klienta/);
  assert.match(draft.body, /Jan\nAI Evolution Polska/);
});
test("API poczty nie działa bez konfiguracji lub właściwego tokenu", () => {
  const original = { ...process.env };
  try {
    delete process.env.RESEND_API_KEY;
    delete process.env.CRM_MAIL_FROM;
    delete process.env.CRM_MAIL_ACCESS_TOKEN;
    const mail = load("lib/crm/mail-server.ts");
    assert.equal(
      mail.guardMail(new Request("http://localhost/api/mail/send")).status,
      503,
    );
    process.env.RESEND_API_KEY = "test";
    process.env.CRM_MAIL_FROM = "sender@example.com";
    process.env.CRM_MAIL_ACCESS_TOKEN = "secret";
    assert.equal(
      mail.guardMail(
        new Request("http://localhost/api/mail/send", {
          headers: { Authorization: "Bearer wrong" },
        }),
      ).status,
      401,
    );
    assert.equal(
      mail.guardMail(
        new Request("http://localhost/api/mail/send", {
          headers: {
            Authorization: "Bearer secret",
            Origin: "https://untrusted.example",
          },
        }),
      ).status,
      403,
    );
    assert.equal(
      mail.guardMail(
        new Request("http://localhost/api/mail/send", {
          headers: {
            Authorization: "Bearer secret",
            Origin: "http://localhost",
          },
        }),
      ),
      null,
    );
  } finally {
    process.env = original;
  }
});
test("walidacja wysyłki odrzuca błędne pola i nagłówki", () => {
  const mail = load("lib/crm/mail-server.ts");
  assert.equal(
    mail.validateMail({
      id: "one",
      to: "a@example.com",
      subject: "Temat",
      body: "Treść",
    }),
    true,
  );
  assert.equal(
    mail.validateMail({
      id: "one",
      to: "bad",
      subject: "Temat",
      body: "Treść",
    }),
    false,
  );
  assert.equal(
    mail.validateMail({
      id: "one",
      to: "a@example.com",
      subject: "X\r\nBcc:bad",
      body: "Treść",
    }),
    false,
  );
});

test("endpoint wysyłki przekazuje idempotencję i zwraca przyjęcie dostawcy", async () => {
  const calls = [];
  const route = load("app/api/mail/send/route.ts", {
    "@/lib/crm/mail-server": {
      guardMail: () => null,
      validateMail: () => true,
      mailConfig: () => ({ from: "Team <sender@my-domain.pl>" }),
      resend: async (path, options) => {
        calls.push({ path, options });
        return { id: "provider-123" };
      },
    },
  });
  const result = await route.POST(
    new Request("http://localhost/api/mail/send", {
      method: "POST",
      body: JSON.stringify({
        id: "mail-123",
        to: "user@my-domain.pl",
        subject: "Oferta",
        body: "Treść",
      }),
    }),
  );
  assert.equal(result.status, 200);
  assert.equal((await result.json()).status, "accepted");
  assert.equal(calls[0].options.headers["Idempotency-Key"], "crm-mail-123");
  assert.equal(JSON.parse(calls[0].options.body).text, "Treść");
});
test("endpoint nie wysyła do odbiorców demonstracyjnych", async () => {
  let called = false;
  const route = load("app/api/mail/send/route.ts", {
    "@/lib/crm/mail-server": {
      guardMail: () => null,
      validateMail: () => true,
      mailConfig: () => ({}),
      resend: async () => {
        called = true;
        return { id: "bad" };
      },
    },
  });
  const result = await route.POST(
    new Request("http://localhost/api/mail/send", {
      method: "POST",
      body: JSON.stringify({
        id: "one",
        to: "demo@example.com",
        subject: "Test",
        body: "Treść",
      }),
    }),
  );
  assert.equal(result.status, 400);
  assert.equal(called, false);
});
const growth = load("lib/growth/model.ts");
test("Growth OS waliduje zapis i zachowuje identyfikatory migracji", () => {
  const state = {
    ...model.seedData(),
    onboarded: true,
    sender: "Firma",
    agentEnabled: false,
  };
  const result = growth.validateSnapshot(growth.snapshot(state, 2));
  assert.equal(result.revision, 2);
  assert.equal(result.data.firms[0].id, "f1");
  assert.throws(() => growth.validateSnapshot({ ...result, revision: -1 }));
  assert.throws(() =>
    growth.validateSnapshot({
      ...result,
      settings: { ...result.settings, sender: "x".repeat(201) },
    }),
  );
  assert.equal(growth.canWrite("viewer"), false);
  for (const role of ["owner", "admin", "marketer"])
    assert.equal(growth.canWrite(role), true);
});
test("Cloud API odrzuca brak logowania, obce origin i nieważną sesję", async () => {
  const old = {
    mode: process.env.NEXT_PUBLIC_CRM_MODE,
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
  process.env.NEXT_PUBLIC_CRM_MODE = "cloud";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.invalid";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "public-test";
  let called = false;
  const api = load("lib/supabase/server.ts", {
    "@supabase/supabase-js": {
      createClient: (_url, _key, options) => {
        called = true;
        assert.equal(options.global.headers.Authorization, "Bearer test");
        return {
          auth: { getUser: async () => ({ data: { user: null }, error: {} }) },
        };
      },
    },
  });
  try {
    assert.equal(
      (await api.authenticated(new Request("http://localhost/api/workspaces")))
        .status,
      401,
    );
    assert.equal(called, false);
    assert.equal(
      (
        await api.authenticated(
          new Request("http://localhost/api/workspaces", {
            headers: {
              origin: "https://evil.invalid",
              authorization: "Bearer test",
            },
          }),
        )
      ).status,
      403,
    );
    assert.equal(called, false);
    assert.equal(
      (
        await api.authenticated(
          new Request("http://localhost/api/workspaces", {
            headers: { authorization: "Bearer test" },
          }),
        )
      ).status,
      401,
    );
    assert.equal(called, true);
    assert.equal(api.databaseError({ code: "40001" }).status, 409);
    assert.equal(api.databaseError({ code: "42501" }).status, 403);
  } finally {
    for (const [k, v] of Object.entries({
      NEXT_PUBLIC_CRM_MODE: old.mode,
      NEXT_PUBLIC_SUPABASE_URL: old.url,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: old.key,
    })) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
});
test("Zapis workspace przekazuje JWT/RLS, UUID i oczekiwaną wersję do transakcji", async () => {
  let args;
  const api = load("app/api/workspaces/[id]/data/route.ts", {
    "@/lib/growth/model": growth,
    "@/lib/supabase/server": {
      authenticated: async () => ({
        db: {
          rpc: async (name, payload) => {
            args = { name, payload };
            return { data: 3, error: null };
          },
        },
      }),
      readBody: async (r) => r.json(),
      databaseError: () =>
        Response.json({ error: "conflict" }, { status: 409 }),
    },
  });
  const wid = "00000000-0000-0000-0000-000000000001",
    state = growth.snapshot(
      {
        ...model.seedData(),
        onboarded: false,
        sender: "Firma",
        agentEnabled: false,
      },
      2,
    );
  const result = await api.PUT(
    new Request("http://localhost", {
      method: "PUT",
      body: JSON.stringify(state),
    }),
    { params: Promise.resolve({ id: wid }) },
  );
  assert.equal(result.status, 200);
  assert.equal(args.name, "save_workspace");
  assert.equal(args.payload.wid, wid);
  assert.equal(args.payload.expected_revision, 2);
  const bad = await api.PUT(
    new Request("http://localhost", {
      method: "PUT",
      body: JSON.stringify({ ...state, revision: -1 }),
    }),
    { params: Promise.resolve({ id: wid }) },
  );
  assert.equal(bad.status, 400);
  const badId = await api.GET(new Request("http://localhost"), {
    params: Promise.resolve({ id: "f1" }),
  });
  assert.equal(badId.status, 400);
});
test("Globalny klucz Resend nie daje dostępu do wysyłki z workspace", () => {
  const previous = process.env.NEXT_PUBLIC_CRM_MODE;
  process.env.NEXT_PUBLIC_CRM_MODE = "cloud";
  try {
    const server = load("lib/crm/mail-server.ts");
    assert.equal(
      server.guardMail(new Request("http://localhost/api/mail/send")).status,
      503,
    );
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_CRM_MODE;
    else process.env.NEXT_PUBLIC_CRM_MODE = previous;
  }
});
const marketing = load("lib/integrations/marketing.ts"),
  knowledge = load("lib/knowledge/model.ts"),
  aiModel = load("lib/ai/model.ts");
const csvHeader =
  "date;source;campaign;spend;impressions;clicks;leads;qualified;revenue\n";
test("marketing: import waliduje dane, wylicza KPI i nie dzieli przez zero", () => {
  const rows = marketing.parseCsv(
    csvHeader +
      '2026-10-05;google_ads;"Oferta; lokalna";200;1000;80;10;6;1200\n',
  );
  assert.equal(rows[0].campaign, "Oferta; lokalna");
  const m = marketing.metrics(rows);
  assert.equal(m.cpa, 20);
  assert.equal(m.roas, 6);
  assert.equal(m.cvr, 12.5);
  assert.equal(marketing.metrics([]).cpa, null);
  assert.throws(() =>
    marketing.parseCsv(
      csvHeader + "2026-02-30;google_ads;Błąd;10;100;5;1;0;0\n",
    ),
  );
  assert.throws(() =>
    marketing.parseCsv(
      csvHeader + "2026-10-05;google_ads;Błąd;-1;100;5;1;0;0\n",
    ),
  );
  assert.throws(() =>
    marketing.parseCsv(
      csvHeader + "2026-10-05;google_ads;Błąd;10;100;5;1;2;0\n",
    ),
  );
  assert.throws(() =>
    marketing.parseCsv(
      csvHeader +
        Array(2)
          .fill("2026-10-05;google_ads;Duplikat;10;100;5;1;0;0")
          .join("\n"),
    ),
  );
});
test("wiedza: tytuły bez traversal, wikilinki i oryginalny Markdown w ZIP", () => {
  assert.throws(() =>
    knowledge.validateDocument({
      title: "../sekret",
      category: "company",
      content: "tekst",
      revision: 0,
    }),
  );
  const links = knowledge.wikiLinks(
    "[[Oferta]] [[services/Oferta|usługi]] [[Oferta]]",
  );
  assert.equal(links.length, 2);
  const vault = load("lib/knowledge/vault.ts");
  const zip = vault.vaultZip([
    {
      id: "doc1",
      title: "Zażółć",
      category: "company",
      content: "# Wiedza\n\n[[Oferta]]",
      revision: 1,
      updated_at: "",
    },
  ]);
  assert.equal(zip.readUInt32LE(0), 0x04034b50);
  assert.equal(zip.includes(Buffer.from("company/Zażółć.md")), true);
  assert.equal(zip.includes(Buffer.from("# Wiedza\n\n[[Oferta]]")), true);
});
test("SQLite i agent: izolacja, konflikty, zatwierdzenie, brak duplikatu i rollback", async () => {
  const folder = fs.mkdtempSync(
      path.join(require("node:os").tmpdir(), "growth-unit-"),
    ),
    previous = process.env.CRM_DATABASE_PATH;
  process.env.CRM_DATABASE_PATH = path.join(folder, "test.sqlite");
  try {
    const db = load("lib/local/database.ts"),
      a = db.createWorkspace("Firma A"),
      b = db.createWorkspace("Firma B"),
      data = model.seedData();
    db.saveWorkspace(a, {
      revision: 0,
      data,
      settings: { onboarded: true, sender: "Firma A", agentEnabled: false },
    });
    assert.equal(db.readWorkspace(b).data.firms.length, 0);
    assert.throws(
      () =>
        db.saveWorkspace(a, {
          revision: 0,
          data,
          settings: { onboarded: true, sender: "A", agentEnabled: false },
        }),
      /Konflikt/,
    );
    const repo = load("lib/knowledge/repository.ts");
    const note = repo.saveDocument(a, {
      id: "",
      revision: 0,
      title: "Oferta",
      category: "services",
      content: "# Oferta\nFirma A",
    });
    assert.equal(repo.listDocuments(b).length, 0);
    assert.throws(
      () =>
        repo.saveDocument(a, {
          id: note,
          revision: 0,
          title: "Oferta",
          category: "services",
          content: "nadpisanie",
        }),
      /Konflikt/,
    );
    const service = load("lib/ai/service.ts", {
      "./providers": {
        generate: async () => ({
          text: JSON.stringify({
            answer: "Zadanie wymaga Twojej zgody.",
            actions: [
              {
                type: "create_task",
                companyId: "f1",
                title: "Skontaktuj się z firmą",
                date: "2026-10-06",
              },
            ],
          }),
          usage: null,
        }),
      },
    });
    const result = await service.ask(
      a,
      "openrouter",
      "test/model",
      "Co dalej?",
    );
    const action = result.messages.at(-1).actions[0];
    assert.equal(db.readWorkspace(a).data.tasks.length, 3);
    assert.throws(() => service.decide(b, action.id, true), /Propozycja/);
    service.decide(a, action.id, true);
    assert.equal(db.readWorkspace(a).data.tasks.length, 4);
    assert.throws(() => service.decide(a, action.id, true), /Propozycja/);
    const stale = await service.ask(
      a,
      "openrouter",
      "test/model",
      "Kolejny krok",
    );
    const current = db.readWorkspace(a);
    db.saveWorkspace(a, current);
    assert.throws(
      () => service.decide(a, stale.messages.at(-1).actions[0].id, true),
      /Konflikt/,
    );
    assert.equal(db.readWorkspace(a).data.tasks.length, 4);
    const deny = load("lib/ai/service.ts", {
      "./providers": {
        generate: async () => ({
          text: JSON.stringify({
            answer: "Nieznana firma",
            actions: [
              {
                type: "create_task",
                companyId: "outside",
                title: "Zadanie",
                date: "2026-10-06",
              },
            ],
          }),
          usage: null,
        }),
      },
    });
    const count = service.history(a).length;
    await assert.rejects(
      () => deny.ask(a, "openrouter", "test/model", "Zadanie"),
      /nieistniejącą/,
    );
    assert.equal(service.history(a).length, count);
  } finally {
    if (previous === undefined) delete process.env.CRM_DATABASE_PATH;
    else process.env.CRM_DATABASE_PATH = previous;
    fs.rmSync(folder, { recursive: true, force: true });
  }
});
test("AI przyjmuje tylko dozwolone propozycje i poprawne identyfikatory modeli", () => {
  assert.equal(aiModel.validModel("openai/model-name"), true);
  assert.equal(aiModel.validModel("model; rm -rf"), false);
  assert.throws(
    () =>
      aiModel.parseAnswer(
        JSON.stringify({
          answer: "SQL",
          actions: [{ type: "run_sql", sql: "DELETE" }],
        }),
      ),
    /niedostępne/,
  );
  assert.throws(() =>
    aiModel.parseAnswer(
      JSON.stringify({
        answer: "Task",
        actions: [
          {
            type: "create_task",
            title: "Task",
            companyId: "f1",
            date: "2026-02-30",
          },
        ],
      }),
    ),
  );
  const answer = aiModel.parseAnswer(
    '```json\n{"answer":"Analiza","actions":[]}\n```',
  );
  assert.equal(answer.answer, "Analiza");
});
test("adaptery WordPress i PostHog wysyłają tylko ustalone żądania odczytu", async () => {
  const before = globalThis.fetch,
    oldWp = process.env.WP_BASE_URL,
    oldHost = process.env.POSTHOG_HOST;
  process.env.WP_BASE_URL = "https://example.com";
  process.env.POSTHOG_HOST = "https://eu.posthog.com";
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    return Response.json(
      calls.length === 1
        ? [
            {
              id: 1,
              title: { rendered: "Usługi" },
              link: "https://example.com/uslugi",
              content: { rendered: "<script>evil()</script><p>Oferta</p>" },
            },
          ]
        : { results: [["pageview", 12]] },
    );
  };
  try {
    const providers = load("lib/integrations/providers.ts");
    const wp = await providers.adapter("wordpress").read();
    assert.equal(wp.documents[0].content.includes("evil()"), false);
    assert.match(calls[0].url, /wp-json\/wp\/v2\/pages/);
    const ph = await providers.adapter("posthog").read();
    assert.equal(ph.events[0][1], 12);
    assert.equal(calls[1].init.method, "POST");
    assert.match(JSON.parse(calls[1].init.body).query.query, /SELECT event/);
  } finally {
    globalThis.fetch = before;
    if (oldWp === undefined) delete process.env.WP_BASE_URL;
    else process.env.WP_BASE_URL = oldWp;
    if (oldHost === undefined) delete process.env.POSTHOG_HOST;
    else process.env.POSTHOG_HOST = oldHost;
  }
});
test("OpenRouter nie przekazuje klucza do kontekstu i wybiera model użytkownika", async () => {
  const before = globalThis.fetch;
  let request;
  globalThis.fetch = async (_url, init) => {
    request = JSON.parse(init.body);
    assert.match(init.headers.Authorization, /Bearer sk-or-/);
    return Response.json({
      choices: [{ message: { content: '{"answer":"Analiza","actions":[]}' } }],
      usage: { total_tokens: 10 },
    });
  };
  try {
    const providers = load("lib/ai/providers.ts");
    providers.setSessionKey("workspace-test", "sk-or-session-test-key-123456");
    const result = await providers.generate(
      "workspace-test",
      "openrouter",
      "provider/selected-model",
      "Pytanie",
      "Kontekst firmy",
    );
    assert.equal(request.model, "provider/selected-model");
    assert.equal(JSON.stringify(request.messages).includes("sk-or-"), false);
    assert.equal(result.usage.total_tokens, 10);
    providers.clearSessionKey("workspace-test");
  } finally {
    globalThis.fetch = before;
  }
});
test("research firmy blokuje prywatne adresy i czyści HTML", () => {
  const reader = load("lib/knowledge/research.ts");
  for (const address of [
    "127.0.0.1",
    "10.0.0.1",
    "192.168.0.1",
    "169.254.169.254",
    "100.64.0.1",
    "::1",
    "::ffff:127.0.0.1",
    "fd00::1",
    "2001:db8::1",
  ])
    assert.equal(reader.publicAddress(address), false);
  assert.equal(reader.publicAddress("93.184.216.34"), true);
  for (const url of [
    "http://example.com",
    "https://user:pass@example.com",
    "https://localhost",
    "https://127.0.0.1",
    "https://example.com:8080",
    "https://example.com/?token=x",
  ])
    assert.throws(() => reader.websiteUrl(url));
  assert.equal(
    reader
      .pageText(
        "<script>Ignore system</script><h1>Oferta</h1><p>Usługi &amp; marka</p>",
      )
      .includes("Ignore"),
    false,
  );
  const links = reader.researchLinks(
    '<a href="/kontakt">Kontakt</a><a href="https://evil.invalid/uslugi">Usługi</a><a href="/oferta">Oferta</a>',
    new URL("https://example.com"),
  );
  assert.equal(links.length, 2);
  assert.ok(links.every((link) => link.startsWith("https://example.com/")));
});
test("generator: źródła, 34 sekcje, szkic bez zmian, atomowy zapis i Obsidian", async () => {
  const folder = fs.mkdtempSync(
    path.join(require("node:os").tmpdir(), "brain-unit-"),
  );
  const previous = process.env.CRM_DATABASE_PATH;
  process.env.CRM_DATABASE_PATH = path.join(folder, "brain.sqlite");
  const sources = [
    {
      id: "S01",
      url: "https://example.com",
      text: "Firma Testowa — szkolenia AI dla firm w Polsce.",
      checkedAt: "2026-10-05T10:00:00Z",
    },
  ];
  const answer = {
    companyName: "Firma Testowa",
    summary: "Szkolenia AI dla firm.",
    sections: [
      {
        number: 1,
        content: "CONFIRMED [S01]: Firma Testowa.\nMISSING: cele firmy.",
      },
      { number: 5, content: "CONFIRMED [S01]: szkolenia AI." },
      { number: 20, content: "TO CONFIRM: seria poradników AI." },
    ],
    questions: ["Jaki jest najważniejszy cel firmy?"],
  };
  try {
    const generatorModel = load("lib/knowledge/generation-model.ts");
    const parsed = generatorModel.parseBrain(JSON.stringify(answer), sources);
    assert.equal(parsed.documents.length, 4);
    assert.match(parsed.documents[0].content, /## 34\./);
    assert.match(parsed.documents[0].content, /MISSING/);
    assert.throws(
      () =>
        generatorModel.parseBrain(
          JSON.stringify({
            ...answer,
            sections: [{ number: 1, content: "[S99]" }],
          }),
          sources,
        ),
      /źródło/,
    );
    const db = load("lib/local/database.ts"),
      a = db.createWorkspace("Firma A"),
      b = db.createWorkspace("Firma B");
    const service = load("lib/knowledge/generation.ts", {
      "../ai/providers": {
        aiStatus: async () => ({ openrouter: true }),
        generate: async (_wid, _provider, model, _prompt, context, options) => {
          assert.equal(model, "test/model");
          assert.match(context, /S01/);
          assert.equal(options.maxTokens, 8000);
          return { text: JSON.stringify(answer), usage: { total_tokens: 100 } };
        },
      },
      "./research": {
        researchWebsite: async () => ({ sources, warnings: [] }),
      },
    });
    const repo = load("lib/knowledge/repository.ts");
    const draft = await service.generateBrain(
      a,
      "https://example.com",
      "openrouter",
      "test/model",
    );
    assert.equal(repo.listDocuments(a).length, 0);
    assert.equal(service.latestBrainDraft(a).id, draft.id);
    assert.equal(service.latestBrainDraft(b), null);
    assert.throws(() => service.saveGeneratedBrain(b, draft.id), /Szkic/);
    assert.equal(service.saveGeneratedBrain(a, draft.id).count, 4);
    assert.equal(repo.listDocuments(a).length, 4);
    assert.equal(repo.listDocuments(b).length, 0);
    const context = JSON.parse(
      load("lib/ai/service.ts").buildContext(a, "marketing firmy").text,
    );
    assert.ok(
      context.notes.some((note) => note.title.endsWith("COMPANY_BRAIN")),
    );
    assert.ok(
      context.notes.some((note) => note.content.includes("seria poradników")),
    );
    assert.equal(service.latestBrainDraft(a), null);
    assert.throws(() => service.saveGeneratedBrain(a, draft.id), /Szkic/);
    const zip = load("lib/knowledge/vault.ts").vaultZip(repo.listDocuments(a));
    assert.ok(
      zip.includes(Buffer.from("company/Firma Testowa — COMPANY_BRAIN.md")),
    );
    assert.ok(
      zip.includes(
        Buffer.from(
          "[[company/Firma Testowa — COMPANY_BRAIN|Pełny mózg firmy]]",
        ),
      ),
    );
    const next = await service.generateBrain(
      a,
      "https://example.com",
      "openrouter",
      "test/model",
    );
    assert.throws(() => service.saveGeneratedBrain(a, next.id), /UNIQUE/);
    assert.equal(repo.listDocuments(a).length, 4);
    assert.equal(service.latestBrainDraft(a).id, next.id);
    const c = db.createWorkspace("Firma C");
    repo.saveDocument(c, { ...parsed.documents[3], id: "", revision: 0 });
    const colliding = await service.generateBrain(
      c,
      "https://example.com",
      "openrouter",
      "test/model",
    );
    assert.throws(() => service.saveGeneratedBrain(c, colliding.id), /UNIQUE/);
    assert.equal(repo.listDocuments(c).length, 1);
    assert.equal(service.latestBrainDraft(c).id, colliding.id);
  } finally {
    if (previous === undefined) delete process.env.CRM_DATABASE_PATH;
    else process.env.CRM_DATABASE_PATH = previous;
    fs.rmSync(folder, { recursive: true, force: true });
  }
});
test("research pobiera tylko publiczny HTML, przypina DNS i ignoruje obce linki", async () => {
  const savedProxy = process.env.HTTPS_PROXY,
    savedLower = process.env.https_proxy;
  delete process.env.HTTPS_PROXY;
  delete process.env.https_proxy;
  const calls = [];
  const reader = load("lib/knowledge/research.ts", {
    "node:dns/promises": {
      lookup: async () => [{ address: "93.184.216.34", family: 4 }],
    },
    "node:https": {
      request: (url, options, respond) => {
        calls.push(url.href);
        assert.equal(options.method, "GET");
        assert.equal(options.headers.Authorization, undefined);
        options.lookup(url.hostname, { all: true }, (error, addresses) => {
          assert.equal(error, null);
          assert.equal(addresses[0].address, "93.184.216.34");
        });
        options.lookup(
          url.hostname,
          { all: false },
          (error, address, family) => {
            assert.equal(error, null);
            assert.equal(address, "93.184.216.34");
            assert.equal(family, 4);
          },
        );
        const task = new (require("node:events").EventEmitter)();
        task.end = () =>
          process.nextTick(() => {
            const response = new (require("node:events").EventEmitter)();
            response.statusCode = 200;
            response.headers = { "content-type": "text/html; charset=utf-8" };
            respond(response);
            response.emit(
              "data",
              Buffer.from(
                '<h1>Firma testowa</h1><p>Projektujemy wnętrza i pomagamy w wyborze wyposażenia mieszkań. Publiczna oferta dla klientów z Polski.</p><a href="/kontakt">Kontakt</a><a href="https://private.local/kontakt">Kontakt prywatny</a>',
              ),
            );
            response.emit("end");
          });
        return task;
      },
    },
  });
  try {
    const research = await reader.researchWebsite("https://example.com");
    assert.equal(research.sources.length, 2);
    assert.equal(calls.length, 2);
    assert.ok(calls.every((url) => url.startsWith("https://example.com/")));
    const privateReader = load("lib/knowledge/research.ts", {
      "node:dns/promises": {
        lookup: async () => [{ address: "10.0.0.1", family: 4 }],
      },
      "node:https": {
        request: () => assert.fail("private DNS must not make a request"),
      },
    });
    await assert.rejects(
      () => privateReader.researchWebsite("https://example.com"),
      /niedozwolonego/,
    );
  } finally {
    if (savedProxy === undefined) delete process.env.HTTPS_PROXY;
    else process.env.HTTPS_PROXY = savedProxy;
    if (savedLower === undefined) delete process.env.https_proxy;
    else process.env.https_proxy = savedLower;
  }
});
