import "server-only";
import { readFileSync, statSync } from "node:fs";
import { credential } from "./google-vault";
import { sign } from "node:crypto";
import { apiJson, IntegrationError } from "./http";
export const GOOGLE_SCOPES =
  "https://www.googleapis.com/auth/analytics.readonly https://www.googleapis.com/auth/webmasters.readonly";
export const ADS_SCOPE = "https://www.googleapis.com/auth/adwords";
export function googleAuthConfigured(
  wid?: string,
  provider?: import("./model").GoogleProvider,
) {
  if (wid) {
    let saved;
    try {
      saved = credential(wid);
    } catch {
      return false;
    }
    if (saved)
      return saved.scopes.includes(
        provider === "google_ads"
          ? ADS_SCOPE
          : provider === "search_console"
            ? "https://www.googleapis.com/auth/webmasters.readonly"
            : "https://www.googleapis.com/auth/analytics.readonly",
      );
  }
  if (provider === "google_ads")
    return Boolean(
      process.env.GOOGLE_OAUTH_CLIENT_ID &&
      process.env.GOOGLE_OAUTH_CLIENT_SECRET &&
      process.env.GOOGLE_OAUTH_REFRESH_TOKEN,
    );

  return Boolean(
    process.env.GOOGLE_SERVICE_ACCOUNT_FILE ||
    (process.env.GOOGLE_OAUTH_CLIENT_ID &&
      process.env.GOOGLE_OAUTH_CLIENT_SECRET &&
      process.env.GOOGLE_OAUTH_REFRESH_TOKEN),
  );
}
export async function googleToken(
  wid?: string,
  provider?: import("./model").GoogleProvider,
): Promise<string> {
  const saved = wid ? credential(wid) : null;
  const body = new URLSearchParams();
  if (
    !saved &&
    provider !== "google_ads" &&
    process.env.GOOGLE_SERVICE_ACCOUNT_FILE
  ) {
    let account: { type: string; client_email: string; private_key: string };
    try {
      if (statSync(process.env.GOOGLE_SERVICE_ACCOUNT_FILE).size > 100000)
        throw Error();
      account = JSON.parse(
        readFileSync(
          /* turbopackIgnore: true */ process.env.GOOGLE_SERVICE_ACCOUNT_FILE,
          "utf8",
        ),
      );
      if (
        account.type !== "service_account" ||
        !account.client_email ||
        !account.private_key
      )
        throw Error();
    } catch {
      throw new IntegrationError(
        "Nie można odczytać pliku konta usługi Google. Sprawdź GOOGLE_SERVICE_ACCOUNT_FILE oraz format JSON.",
        400,
      );
    }
    const now = Math.floor(Date.now() / 1000);
    const encode = (value: unknown) =>
      Buffer.from(JSON.stringify(value)).toString("base64url");
    const unsigned = `${encode({ alg: "RS256", typ: "JWT" })}.${encode({ iss: account.client_email, scope: GOOGLE_SCOPES, aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 })}`;
    let signature: string;
    try {
      signature = sign(
        "RSA-SHA256",
        Buffer.from(unsigned),
        account.private_key,
      ).toString("base64url");
    } catch {
      throw new IntegrationError(
        "Klucz prywatny konta usługi Google jest nieprawidłowy.",
        400,
      );
    }
    body.set("grant_type", "urn:ietf:params:oauth:grant-type:jwt-bearer");
    body.set("assertion", `${unsigned}.${signature}`);
  } else {
    if (!googleAuthConfigured(wid, provider))
      throw new IntegrationError(
        "Skonfiguruj konto usługi Google lub OAuth w .env.local.",
        400,
      );
    body.set("grant_type", "refresh_token");
    body.set("client_id", process.env.GOOGLE_OAUTH_CLIENT_ID!);
    body.set("client_secret", process.env.GOOGLE_OAUTH_CLIENT_SECRET!);
    body.set(
      "refresh_token",
      saved?.refreshToken || process.env.GOOGLE_OAUTH_REFRESH_TOKEN!,
    );
  }
  const result = (await apiJson(
    "https://oauth2.googleapis.com/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    },
    true,
  )) as Record<string, unknown>;
  if (
    typeof result.access_token !== "string" ||
    !result.access_token ||
    result.access_token.length > 10000 ||
    /[\r\n]/.test(result.access_token)
  )
    throw new IntegrationError(
      "Google nie zwróciło prawidłowego tokenu dostępu.",
    );
  return result.access_token;
}
