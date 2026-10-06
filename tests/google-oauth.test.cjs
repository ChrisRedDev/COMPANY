const { test } = require("node:test"),
  assert = require("node:assert/strict");
const { load } = require("./helpers/load-ts.cjs");
const fs = require("node:fs"),
  os = require("node:os"),
  path = require("node:path"),
  crypto = require("node:crypto");
function fixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "crm-oauth-"));
  const changes = {
    CRM_DATABASE_PATH: path.join(dir, "crm.sqlite"),
    GOOGLE_OAUTH_CLIENT_ID: "test-client",
    GOOGLE_OAUTH_CLIENT_SECRET: "test-secret",
    GOOGLE_OAUTH_REFRESH_TOKEN: undefined,
    GOOGLE_SERVICE_ACCOUNT_FILE: undefined,
    GOOGLE_ADS_DEVELOPER_TOKEN: "developer-demo",
    GOOGLE_ADS_API_VERSION: undefined,
    GOOGLE_OAUTH_REDIRECT_URI: undefined,
    NEXT_PUBLIC_CRM_MODE: "sqlite",
    LOCAL_DATABASE_ENABLED: "1",
  };
  const old = Object.fromEntries(
    Object.keys(changes).map((k) => [k, process.env[k]]),
  );
  function set(values) {
    for (const [k, v] of Object.entries(values))
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
  }
  set(changes);
  const db = load("lib/local/database.ts"),
    http = load("lib/integrations/http.ts"),
    vault = load("lib/integrations/google-vault.ts", {
      "../local/database": db,
      "./http": http,
    });
  const stubs = {
    "../local/database": db,
    "./google-vault": vault,
    "./http": http,
  };
  const repo = load("lib/integrations/repository.ts", stubs);
  stubs["./repository"] = repo;
  const a = db.createWorkspace("Firma A"),
    b = db.createWorkspace("Firma B");
  return {
    dir,
    db,
    http,
    vault,
    repo,
    stubs,
    a,
    b,
    close: () => {
      db.database().close();
      set(old);
      fs.rmSync(dir, { recursive: true, force: true });
    },
  };
}
const request = (
  url = "http://localhost:3000/api/local/workspaces/id/google/connect",
  headers = {},
  method = "POST",
) => new Request(url, { method, headers });
async function flow(oauth, wid, ads = true) {
  const response = oauth.beginOAuth(wid, request(), ads),
    url = new URL((await response.json()).url),
    cookie = response.headers.get("set-cookie").split(";")[0];
  return {
    url,
    cookie,
    callback: (extra = {}, cookies = cookie) =>
      request(
        `http://localhost:3000/api/local/google/callback?${new URLSearchParams({ state: url.searchParams.get("state"), code: "code-demo", ...extra })}`,
        { cookie: cookies, "sec-fetch-site": "cross-site" },
        "GET",
      ),
  };
}
test("OAuth: PKCE, cookie przeglądarki, single-use, szyfrowanie i izolacja firm — real SQLite, mock Google", async () => {
  const f = fixture();
  let calls = 0,
    exchanged;
  const oauth = load("lib/integrations/google-oauth.ts", {
    ...f.stubs,
    "./http": {
      ...f.http,
      apiJson: async (url, init, google, retry) => {
        calls++;
        assert.equal(url, "https://oauth2.googleapis.com/token");
        assert.equal(retry, false);
        exchanged = init.body;
        return {
          refresh_token: "refresh-private-demo",
          scope: exchangedScopes,
        };
      },
    },
  });
  let exchangedScopes = "";
  try {
    const begun = await flow(oauth, f.a);
    exchangedScopes = begun.url.searchParams.get("scope");
    assert.equal(begun.url.origin, "https://accounts.google.com");
    assert.equal(begun.url.searchParams.get("code_challenge_method"), "S256");
    assert.equal((await oauth.finishOAuth(begun.callback({}, ""))).status, 400);
    assert.equal(calls, 0);
    const done = await oauth.finishOAuth(begun.callback());
    assert.equal(done.status, 303);
    const location = new URL(done.headers.get("location"));
    assert.equal(location.searchParams.get("google"), "connected");
    assert.equal(location.searchParams.get("googleWorkspace"), f.a);
    assert.equal(location.searchParams.has("code"), false);
    assert.equal(
      crypto
        .createHash("sha256")
        .update(exchanged.get("code_verifier"))
        .digest("base64url"),
      begun.url.searchParams.get("code_challenge"),
    );
    assert.equal(f.vault.credential(f.a).refreshToken, "refresh-private-demo");
    assert.equal(f.vault.credential(f.b), null);
    assert.equal((await oauth.finishOAuth(begun.callback())).status, 400);
    assert.equal(calls, 1);
    const files = fs.readdirSync(`${f.db.databasePath()}.google-oauth`);
    for (const file of files)
      assert.equal(
        fs
          .readFileSync(path.join(`${f.db.databasePath()}.google-oauth`, file))
          .includes(Buffer.from("refresh-private-demo")),
        false,
      );
    assert.equal(
      fs.statSync(path.join(`${f.db.databasePath()}.google-oauth`, "key"))
        .mode & 0o777,
      0o600,
    );
    const backup = path.join(f.dir, "backup.sqlite");
    f.db.database().exec(`VACUUM INTO '${backup}'`);
    assert.equal(
      fs.readFileSync(backup).includes(Buffer.from("refresh-private-demo")),
      false,
    );
    assert.equal(
      JSON.stringify(oauth.oauthStatus(f.a, request())).includes(
        "refresh-private-demo",
      ),
      false,
    );
    oauth.disconnectOAuth(f.a);
    assert.equal(f.vault.credential(f.a), null);
  } finally {
    f.close();
  }
});
test("OAuth: anulowanie, częściowa zgoda i błąd tokenu zachowują poprzedni raport i połączenie", async () => {
  const f = fixture();
  let response = {
      refresh_token: "new-private-token",
      scope: "https://www.googleapis.com/auth/analytics.readonly",
    },
    fail = false;
  const oauth = load("lib/integrations/google-oauth.ts", {
    ...f.stubs,
    "./http": {
      ...f.http,
      apiJson: async () => {
        if (fail) throw Error("secret-demo");
        return response;
      },
    },
  });
  try {
    f.vault.storeCredential(f.a, {
      refreshToken: "previous-private",
      scopes: [],
      client: f.vault.clientFingerprint(),
      generation: "old",
      connectedAt: new Date().toISOString(),
    });
    f.repo.saveIntegrationSettings(f.a, "ga4", { propertyId: "123" });
    f.db
      .database()
      .prepare("INSERT INTO provider_data VALUES(?,?,?)")
      .run(f.a, "ga4", JSON.stringify({ summary: "previous report" }));
    for (const mode of ["denied", "partial", "failed"]) {
      const begun = await flow(oauth, f.a);
      fail = mode === "failed";
      const done = await oauth.finishOAuth(
        begun.callback(mode === "denied" ? { error: "access_denied" } : {}),
      );
      assert.equal(
        new URL(done.headers.get("location")).searchParams.get("google"),
        mode === "denied" ? "denied" : "error",
      );
      assert.equal(f.vault.credential(f.a).refreshToken, "previous-private");
      assert.equal(f.repo.integrationSettings(f.a, "ga4").propertyId, "123");
      assert.equal(
        f.db
          .database()
          .prepare("SELECT count(*) n FROM provider_data WHERE workspace_id=?")
          .get(f.a).n,
        1,
      );
    }
    const begun = await flow(oauth, f.a);
    fail = false;
    response.scope = begun.url.searchParams.get("scope");
    await oauth.finishOAuth(begun.callback());
    assert.equal(f.repo.integrationSettings(f.a, "ga4").propertyId, undefined);
    assert.equal(
      f.db
        .database()
        .prepare("SELECT count(*) n FROM provider_data WHERE workspace_id=?")
        .get(f.a).n,
      0,
    );
  } finally {
    f.close();
  }
});
test("OAuth: wygasły state, zmiana klienta i URI odrzucają callback; wyjątek cross-site tylko na callback GET", async () => {
  const f = fixture(),
    oauth = load("lib/integrations/google-oauth.ts", f.stubs),
    guard = load("lib/local/guard.ts"),
    now = Date.now;
  try {
    const begun = await flow(oauth, f.a, false);
    assert.equal(
      begun.url.searchParams.get("scope").includes("adwords"),
      false,
    );
    Date.now = () => now() + 600001;
    assert.equal((await oauth.finishOAuth(begun.callback())).status, 400);
    Date.now = now;
    const next = await flow(oauth, f.a);
    process.env.GOOGLE_OAUTH_CLIENT_SECRET = "changed-client";
    assert.equal((await oauth.finishOAuth(next.callback())).status, 400);
    process.env.GOOGLE_OAUTH_REDIRECT_URI = "https://evil.example/callback";
    assert.throws(
      () => oauth.beginOAuth(f.a, request(), false),
      /Adres aplikacji/,
    );
    const callback = request(
      "http://localhost:3000/api/local/google/callback?state=bad",
      { "sec-fetch-site": "cross-site" },
      "GET",
    );
    assert.equal(guard.guardLocal(callback, true), null);
    assert.equal(guard.guardLocal(callback).status, 403);
    assert.equal(
      guard.guardLocal(
        request(undefined, { "sec-fetch-site": "cross-site" }),
        true,
      ).status,
      403,
    );
    assert.equal(
      guard.guardLocal(
        request("https://evil.example/api/local/google/callback", {}, "GET"),
        true,
      ).status,
      403,
    );
  } finally {
    Date.now = now;
    f.close();
  }
});
test("Skarbiec: podmiana między firmami, zmiana klienta, uszkodzony klucz i brak klucza nie otwierają tokenu", () => {
  const f = fixture();
  try {
    const record = {
      refreshToken: "private",
      scopes: [],
      generation: "gen",
      client: f.vault.clientFingerprint(),
      connectedAt: new Date().toISOString(),
    };
    f.vault.storeCredential(f.a, record);
    const folder = `${f.db.databasePath()}.google-oauth`,
      key = path.join(folder, "key"),
      savedKey = fs.readFileSync(key);
    fs.copyFileSync(
      path.join(folder, `${f.a}.enc`),
      path.join(folder, `${f.b}.enc`),
    );
    assert.throws(() => f.vault.credential(f.b), /skarbiec/);
    process.env.GOOGLE_OAUTH_CLIENT_SECRET = "changed";
    assert.throws(() => f.vault.credential(f.a), /ponownego/);
    process.env.GOOGLE_OAUTH_CLIENT_SECRET = "test-secret";
    fs.writeFileSync(key, Buffer.alloc(32));
    assert.throws(() => f.vault.credential(f.a), /skarbiec/);
    fs.unlinkSync(key);
    assert.throws(() => f.vault.storeCredential(f.a, record), /zapisać/);
    assert.equal(fs.existsSync(key), false);
    fs.writeFileSync(key, savedKey);
    assert.equal(f.vault.credential(f.a).refreshToken, "private");
  } finally {
    f.close();
  }
});
test("Ads: token OAuth, developer-token, MCC, mikrowaluta, ułamkowe konwersje i ROAS — mock oficjalnego REST", async () => {
  const f = fixture(),
    calls = [],
    before = globalThis.fetch;
  let malformed = false;
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    if (String(url).endsWith("/token"))
      return Response.json({ access_token: "access-test" });
    const query = JSON.parse(init.body).query;
    if (query.includes("customer.currency_code"))
      return Response.json({
        results: [
          {
            customer: {
              id: "1234567890",
              descriptiveName: "Firma DEMO",
              currencyCode: "EUR",
              timeZone: "Europe/Warsaw",
            },
          },
        ],
      });
    const today = new Date(
      new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Warsaw" }) +
        "T12:00:00Z",
    );
    today.setUTCDate(today.getUTCDate() - 1);
    const metrics = {
      costMicros: malformed ? "NaN" : "12500000",
      clicks: "5",
      impressions: "100",
      conversions: 2.5,
      conversionsValue: 50,
    };
    return Response.json({
      results: [
        query.includes("campaign.name")
          ? { campaign: { id: "456", name: "DEMO kampania" }, metrics }
          : { segments: { date: today.toISOString().slice(0, 10) }, metrics },
      ],
    });
  };
  try {
    const ads = load("lib/integrations/google-ads.ts", {
      "./google-auth": { googleToken: async () => "access-test" },
    });
    const result = await ads.readGoogleAds(
      { customerId: "123-456-7890", loginCustomerId: "9876543210" },
      f.a,
    );
    assert.equal(result.report.currency, "EUR");
    assert.equal(result.report.totals.cost, 12.5);
    assert.equal(result.report.totals.conversions, 2.5);
    assert.equal(result.report.totals.roas, 4);
    assert.equal(result.report.totals.cpa, 5);
    for (const { url, init } of calls) {
      assert.equal(new URL(url).origin, "https://googleads.googleapis.com");
      assert.ok(url.includes("/v25/"));
      assert.equal(init.headers["developer-token"], "developer-demo");
      assert.equal(init.headers["login-customer-id"], "9876543210");
      assert.ok(JSON.parse(init.body).query.startsWith("SELECT "));
      assert.equal(url.includes("mutate"), false);
    }
    malformed = true;
    await assert.rejects(
      ads.readGoogleAds({ customerId: "1234567890" }),
      /metryka/,
    );
    assert.throws(() =>
      load("lib/integrations/model.ts").validateResource("google_ads", {
        customerId: "1234567890?x=y",
      }),
    );
  } finally {
    globalThis.fetch = before;
    f.close();
  }
});
test("Ads: paginacja, limit i manager MCC nie zapisują częściowego raportu", async () => {
  const before = globalThis.fetch,
    f = fixture();
  let page = 0,
    mode = "pages";
  globalThis.fetch = async (url, init) => {
    page++;
    if (mode === "manager")
      return Response.json({
        results: [{ customer: { manager: true, currencyCode: "PLN" } }],
      });
    const p = JSON.parse(init.body).pageToken;
    return Response.json({
      results: [{ customer: { id: p ? "2" : "1" } }],
      ...(mode === "loop" || !p ? { nextPageToken: "next-demo" } : {}),
    });
  };
  try {
    const ads = load("lib/integrations/google-ads.ts", {
      "./google-auth": { googleToken: async () => "test" },
    });
    assert.equal(
      (
        await ads.adsSearch(
          "test",
          "1234567890",
          "SELECT customer.id FROM customer",
        )
      ).length,
      2,
    );
    assert.equal(page, 2);
    mode = "loop";
    await assert.rejects(
      ads.adsSearch("test", "1234567890", "SELECT customer.id FROM customer"),
      /paginacja/,
    );
    mode = "manager";
    await assert.rejects(
      ads.readGoogleAds({ customerId: "1234567890" }),
      /menedżera/,
    );
  } finally {
    globalThis.fetch = before;
    f.close();
  }
});
test("Lista usług: GA4 strony, Search Console permissions, bezpośrednie konta Ads i dzieci MCC — mock API", async () => {
  const f = fixture(),
    before = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const u = String(url);
    if (u.includes("analyticsadmin"))
      return Response.json({
        accountSummaries: [
          {
            displayName: "Firma",
            propertySummaries: [
              {
                property: u.includes("pageToken")
                  ? "properties/222"
                  : "properties/111",
                displayName: "Sklep",
              },
            ],
          },
        ],
        ...(!u.includes("pageToken") ? { nextPageToken: "next" } : {}),
      });
    if (u.includes("webmasters"))
      return Response.json({
        siteEntry: [
          { siteUrl: "sc-domain:example.pl", permissionLevel: "siteOwner" },
          {
            siteUrl: "sc-domain:hidden.pl",
            permissionLevel: "siteUnverifiedUser",
          },
        ],
      });
    if (u.includes("listAccessibleCustomers"))
      return Response.json({ resourceNames: ["customers/1234567890"] });
    return Response.json({
      results: [
        {
          customerClient: {
            id: "9876543210",
            descriptiveName: "Sklep",
            manager: false,
          },
        },
      ],
    });
  };
  try {
    const api = load("lib/integrations/google-resources.ts", {
      "./google-auth": { googleToken: async () => "test" },
    });
    assert.equal((await api.googleResources(f.a, "ga4")).length, 2);
    assert.equal((await api.googleResources(f.a, "search_console")).length, 1);
    assert.equal(
      (await api.googleResources(f.a, "google_ads"))[0].id,
      "1234567890",
    );
    assert.equal(
      (await api.googleResources(f.a, "google_ads", "1234567890"))[0].label,
      "Sklep · 9876543210",
    );
    await assert.rejects(api.googleResources(f.a, "unknown"), /Nieznana/);
  } finally {
    globalThis.fetch = before;
    f.close();
  }
});
test("Token: lokalne OAuth tej firmy ma pierwszeństwo; refresh token nie trafia do klienta", async () => {
  const f = fixture();
  let posted;
  try {
    f.vault.storeCredential(f.a, {
      refreshToken: "workspace-refresh",
      scopes: ["https://www.googleapis.com/auth/adwords"],
      generation: "gen",
      client: f.vault.clientFingerprint(),
      connectedAt: new Date().toISOString(),
    });
    process.env.GOOGLE_OAUTH_REFRESH_TOKEN = "legacy-refresh";
    process.env.GOOGLE_SERVICE_ACCOUNT_FILE = "/missing-legacy-json";
    const auth = load("lib/integrations/google-auth.ts", {
      "./google-vault": f.vault,
      "./http": {
        ...f.http,
        apiJson: async (url, init) => {
          posted = init.body;
          return { access_token: "access-for-server" };
        },
      },
    });
    assert.equal(
      await auth.googleToken(f.a, "google_ads"),
      "access-for-server",
    );
    assert.equal(posted.get("refresh_token"), "workspace-refresh");
    await assert.rejects(auth.googleToken(f.a, "ga4"), /Skonfiguruj/);
  } finally {
    f.close();
  }
});
test("Google: wyłączenie podczas odczytu nie przywraca starego raportu — real SQLite", async () => {
  const f = fixture();
  let resolve;
  try {
    const oauth = load("lib/integrations/google-oauth.ts", f.stubs);
    f.vault.storeCredential(f.a, {
      refreshToken: "private",
      scopes: [],
      generation: "old",
      client: f.vault.clientFingerprint(),
      connectedAt: new Date().toISOString(),
    });
    f.repo.saveIntegrationSettings(f.a, "ga4", { propertyId: "123" });
    const pending = new Promise((r) => {
      resolve = r;
    });
    const service = load("lib/integrations/service.ts", {
      ...f.stubs,
      "./providers": {
        providerConfig: () => ({ configured: true }),
        adapter: () => ({ read: () => pending }),
      },
    });
    const sync = service.integrationAction(f.a, {
      provider: "ga4",
      action: "sync",
    });
    oauth.disconnectOAuth(f.a);
    resolve({ summary: "old data" });
    await assert.rejects(sync, (e) => e.status === 409);
    assert.equal(
      f.db
        .database()
        .prepare("SELECT count(*) n FROM provider_data WHERE workspace_id=?")
        .get(f.a).n,
      0,
    );
    assert.equal(f.vault.credential(f.a), null);
  } finally {
    f.close();
  }
});
