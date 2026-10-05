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
