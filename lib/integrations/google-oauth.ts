import "server-only";
import { randomBytes, createHash, timingSafeEqual } from "node:crypto";
import { database, readWorkspace, transaction, audit } from "../local/database";
import { integrationSettings } from "./repository";
import {
  credential,
  clientFingerprint,
  storeCredential,
  removeCredential,
} from "./google-vault";
import { GOOGLE_SCOPES, ADS_SCOPE } from "./google-auth";
import { apiJson, IntegrationError } from "./http";
const callbackPath = "/api/local/google/callback";
type Flow = {
  wid: string;
  verifier: string;
  browser: string;
  redirect: string;
  scopes: string[];
  expires: number;
  client: string;
};
// Route bundles share this process-wide, bounded, single-use state registry.
const registry = globalThis as typeof globalThis & {
  crmGoogleFlows?: Map<string, Flow>;
};
const flows = (registry.crmGoogleFlows ||= new Map<string, Flow>());
export function oauthClientConfigured() {
  return Boolean(
    process.env.GOOGLE_OAUTH_CLIENT_ID &&
    process.env.GOOGLE_OAUTH_CLIENT_SECRET,
  );
}
export function redirectUri(request: Request) {
  const url = new URL(request.url),
    host = request.headers.get("host") || url.host;
  const expected = `${url.protocol}//${host}${callbackPath}`;
  if (
    process.env.GOOGLE_OAUTH_REDIRECT_URI &&
    process.env.GOOGLE_OAUTH_REDIRECT_URI !== expected
  )
    throw new IntegrationError(
      "Adres aplikacji nie pasuje do GOOGLE_OAUTH_REDIRECT_URI. Otwórz aplikację pod dokładnie tym hostem i portem.",
      400,
    );
  return expected;
}
function cookieName(state: string) {
  return `crm_google_${createHash("sha256").update(state).digest("hex").slice(0, 16)}`;
}
function cookie(state: string, value: string, secure: boolean, age: number) {
  return `${cookieName(state)}=${value}; HttpOnly; SameSite=Lax; Path=${callbackPath}; Max-Age=${age}${secure ? "; Secure" : ""}`;
}
function clearGoogle(wid: string) {
  integrationSettings(wid, "ga4");
  transaction(() => {
    for (const table of [
      "provider_data",
      "connections",
      "integration_settings",
    ])
      database()
        .prepare(
          `DELETE FROM ${table} WHERE workspace_id=? AND provider IN ('ga4','search_console','google_ads')`,
        )
        .run(wid);
    audit(wid, "google.authentication.changed");
  });
}
export function oauthStatus(wid: string, request: Request) {
  readWorkspace(wid);
  let saved = null,
    error = "";
  try {
    saved = credential(wid);
  } catch (e) {
    error = e instanceof IntegrationError ? e.message : "Błąd skarbca Google.";
  }
  let redirect = "";
  try {
    redirect = redirectUri(request);
  } catch (e) {
    error = e instanceof Error ? e.message : "Błąd adresu powrotnego.";
  }
  return {
    clientConfigured: oauthClientConfigured(),
    connected: Boolean(saved),
    connectedAt: saved?.connectedAt,
    scopes: saved?.scopes || [],
    adsDeveloperConfigured: Boolean(process.env.GOOGLE_ADS_DEVELOPER_TOKEN),
    redirectUri: redirect,
    error,
  };
}
export function beginOAuth(wid: string, request: Request, includeAds: boolean) {
  readWorkspace(wid);
  if (!oauthClientConfigured())
    throw new IntegrationError(
      "Uzupełnij GOOGLE_OAUTH_CLIENT_ID i GOOGLE_OAUTH_CLIENT_SECRET w .env.local, a następnie zrestartuj serwer.",
      400,
    );
  if (includeAds && !process.env.GOOGLE_ADS_DEVELOPER_TOKEN)
    throw new IntegrationError(
      "Do Google Ads potrzebny jest GOOGLE_ADS_DEVELOPER_TOKEN.",
      400,
    );
  const now = Date.now();
  for (const [key, flow] of flows) if (flow.expires <= now) flows.delete(key);
  if (flows.size >= 100)
    throw new IntegrationError(
      "Zbyt wiele rozpoczętych logowań. Spróbuj za kilka minut.",
      429,
    );
  const state = randomBytes(32).toString("base64url"),
    verifier = randomBytes(32).toString("base64url"),
    browser = randomBytes(32).toString("base64url"),
    redirect = redirectUri(request);
  const scopes = GOOGLE_SCOPES.split(" ").concat(includeAds ? [ADS_SCOPE] : []);
  flows.set(state, {
    wid,
    verifier,
    browser,
    redirect,
    scopes,
    expires: now + 600000,
    client: clientFingerprint(),
  });
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
    redirect_uri: redirect,
    response_type: "code",
    scope: scopes.join(" "),
    access_type: "offline",
    prompt: "consent select_account",
    state,
    code_challenge: createHash("sha256").update(verifier).digest("base64url"),
    code_challenge_method: "S256",
  }).toString();
  return Response.json(
    { url: url.href },
    {
      headers: {
        "Cache-Control": "no-store",
        "Set-Cookie": cookie(
          state,
          browser,
          redirect.startsWith("https:"),
          600,
        ),
      },
    },
  );
}
export function disconnectOAuth(wid: string) {
  readWorkspace(wid);
  removeCredential(wid);
  clearGoogle(wid);
  for (const [state, flow] of flows) if (flow.wid === wid) flows.delete(state);
  return {
    message:
      "Usunięto lokalny token, wybór usług i zapisane raporty Google tej firmy. Cofnięcie zgody Google wykonasz w ustawieniach konta Google. Starsza konfiguracja z .env.local pozostaje osobna.",
  };
}
export async function finishOAuth(request: Request) {
  const url = new URL(request.url),
    state = url.searchParams.get("state") || "";
  const flow = /^[A-Za-z0-9_-]{43}$/.test(state) ? flows.get(state) : undefined;
  const browser =
    (request.headers.get("cookie") || "")
      .split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith(`${cookieName(state)}=`))
      ?.split("=")[1] || "";
  const good =
    flow &&
    browser.length === flow.browser.length &&
    timingSafeEqual(Buffer.from(browser), Buffer.from(flow.browser)) &&
    flow.expires > Date.now() &&
    flow.client === clientFingerprint() &&
    flow.redirect === redirectUri(request);
  if (!good)
    return Response.json(
      {
        error:
          "Logowanie wygasło lub nie pochodzi z tej przeglądarki. Rozpocznij je ponownie w Konektorach.",
      },
      {
        status: 400,
        headers: {
          "Cache-Control": "no-store",
          "Referrer-Policy": "no-referrer",
        },
      },
    );
  flows.delete(state); // Claim before the network call: callback replay cannot exchange twice.
  let result = "error";
  if (url.searchParams.has("error")) result = "denied";
  else {
    try {
      readWorkspace(flow.wid);
      const code = url.searchParams.get("code");
      if (!code || code.length > 10000) throw Error();
      const response = (await apiJson(
        "https://oauth2.googleapis.com/token",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            grant_type: "authorization_code",
            code,
            client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
            client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
            redirect_uri: flow.redirect,
            code_verifier: flow.verifier,
          }),
        },
        true,
        false,
      )) as Record<string, unknown>;
      const scopes =
        typeof response.scope === "string"
          ? response.scope.split(" ").filter(Boolean)
          : [];
      if (
        typeof response.refresh_token !== "string" ||
        !response.refresh_token ||
        response.refresh_token.length > 10000 ||
        /[\r\n]/.test(response.refresh_token) ||
        !flow.scopes.every((s) => scopes.includes(s))
      )
        throw Error();
      const old = credential(flow.wid);
      storeCredential(flow.wid, {
        refreshToken: response.refresh_token,
        scopes,
        connectedAt: new Date().toISOString(),
        client: clientFingerprint(),
        generation: randomBytes(16).toString("hex"),
      });
      try {
        clearGoogle(flow.wid);
      } catch (e) {
        if (old) storeCredential(flow.wid, old);
        else removeCredential(flow.wid);
        throw e;
      }
      result = "connected";
    } catch {
      result = "error";
    }
  }
  const target = new URL("/", flow.redirect);
  target.search = new URLSearchParams({
    google: result,
    googleWorkspace: flow.wid,
  }).toString();
  return new Response(null, {
    status: 303,
    headers: {
      Location: target.href,
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      "Set-Cookie": cookie(state, "", flow.redirect.startsWith("https:"), 0),
    },
  });
}
