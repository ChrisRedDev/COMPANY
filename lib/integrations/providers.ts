import "server-only";
export type Provider = "wordpress" | "posthog";
export function providerConfig(provider: Provider) {
  if (provider === "wordpress")
    return {
      configured: Boolean(process.env.WP_BASE_URL),
      required: [
        "WP_BASE_URL",
        "WP_USERNAME (opcjonalnie)",
        "WP_APPLICATION_PASSWORD (opcjonalnie)",
      ],
    };
  return {
    configured: Boolean(
      process.env.POSTHOG_PROJECT_ID && process.env.POSTHOG_PERSONAL_API_KEY,
    ),
    required: [
      "POSTHOG_PROJECT_ID",
      "POSTHOG_PERSONAL_API_KEY",
      "POSTHOG_HOST (opcjonalnie)",
    ],
  };
}
function baseUrl(value: string) {
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw Error("Adres integracji musi być HTTPS bez danych logowania.");
  return url;
}
async function getJson(url: URL, init: RequestInit) {
  const r = await fetch(url, {
    ...init,
    redirect: "error",
    signal: AbortSignal.timeout(20000),
  });
  if (!r.ok)
    throw Error(
      `Dostawca zwrócił HTTP ${r.status}. Sprawdź konfigurację i uprawnienia.`,
    );
  return r.json();
}
export interface IntegrationAdapter {
  provider: Provider;
  read(): Promise<{
    summary: string;
    documents?: { title: string; content: string }[];
    events?: unknown[];
  }>;
}
export function adapter(provider: Provider): IntegrationAdapter {
  if (provider === "wordpress")
    return {
      provider,
      async read() {
        const base = baseUrl(process.env.WP_BASE_URL || ""),
          url = new URL(
            `${base.pathname.replace(/\/$/, "")}/wp-json/wp/v2/pages?per_page=100&status=publish`,
            base,
          );
        const user = process.env.WP_USERNAME,
          password = process.env.WP_APPLICATION_PASSWORD;
        const rows = await getJson(url, {
          headers:
            user && password
              ? {
                  Authorization: `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`,
                }
              : {},
        });
        if (!Array.isArray(rows) || rows.length > 100)
          throw Error("Nieprawidłowa odpowiedź WordPress.");
        const clean = (v: unknown) =>
          String(v || "")
            .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, "")
            .replace(/<[^>]+>/g, " ")
            .replace(/&nbsp;|&#160;/g, " ")
            .replace(/&amp;/g, "&")
            .trim();
        return {
          summary: `Odczytano ${rows.length} opublikowanych stron (pierwsza strona API, maks. 100).`,
          documents: rows.map((p) => ({
            title:
              clean(p.title?.rendered)
                .slice(0, 90)
                .replace(/[\[\]\\/\x00-\x1f]/g, "-") || `Strona ${p.id}`,
            content: `# ${clean(p.title?.rendered)}\n\nŹródło: ${p.link}\n\n${clean(p.content?.rendered).slice(0, 180000)}`,
          })),
        };
      },
    };
  return {
    provider,
    async read() {
      const host = process.env.POSTHOG_HOST || "https://eu.posthog.com",
        url = baseUrl(host);
      if (!["eu.posthog.com", "us.posthog.com"].includes(url.hostname))
        throw Error("Ta wersja obsługuje PostHog Cloud EU/US.");
      url.pathname = `/api/projects/${encodeURIComponent(process.env.POSTHOG_PROJECT_ID || "")}/query/`;
      const result = await getJson(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.POSTHOG_PERSONAL_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: {
            kind: "HogQLQuery",
            query:
              "SELECT event, count() FROM events WHERE timestamp >= now() - INTERVAL 30 DAY GROUP BY event ORDER BY count() DESC LIMIT 20",
          },
        }),
      });
      if (!Array.isArray(result.results))
        throw Error("Nieprawidłowa odpowiedź PostHog.");
      return {
        summary: `Odczytano ${result.results.length} typów zdarzeń z ostatnich 30 dni.`,
        events: result.results,
      };
    },
  };
}
