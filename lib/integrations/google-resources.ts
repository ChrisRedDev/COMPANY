import "server-only";
import { googleToken } from "./google-auth";
import { apiJson, IntegrationError } from "./http";
import { adsHeaders, adsSearch, adsVersion } from "./google-ads";
import { validateResource, type GoogleProvider } from "./model";
export type GoogleChoice = { id: string; label: string; manager?: boolean };
export async function googleResources(
  wid: string,
  provider: GoogleProvider,
  manager?: string,
): Promise<GoogleChoice[]> {
  if (!["ga4", "search_console", "google_ads"].includes(provider))
    throw new IntegrationError("Nieznana usługa Google.", 400);
  const token = await googleToken(wid, provider);
  if (provider === "search_console") {
    const data = (await apiJson(
      "https://www.googleapis.com/webmasters/v3/sites",
      { headers: { Authorization: `Bearer ${token}` } },
      true,
    )) as { siteEntry?: { siteUrl: string; permissionLevel: string }[] };
    if (
      !data ||
      (data.siteEntry !== undefined &&
        (!Array.isArray(data.siteEntry) || data.siteEntry.length > 1000))
    )
      throw new IntegrationError("Nieprawidłowa lista witryn Google.");
    return (data.siteEntry || [])
      .filter((s) => s.permissionLevel !== "siteUnverifiedUser")
      .map((s) => {
        const r = validateResource(provider, s);
        return { id: r.siteUrl!, label: s.siteUrl };
      });
  }
  if (provider === "ga4") {
    const choices: GoogleChoice[] = [],
      seen = new Set<string>();
    let next = "";
    for (let page = 0; page < 10; page++) {
      const url = new URL(
        "https://analyticsadmin.googleapis.com/v1beta/accountSummaries",
      );
      url.searchParams.set("pageSize", "200");
      if (next) url.searchParams.set("pageToken", next);
      const data = (await apiJson(
        url,
        { headers: { Authorization: `Bearer ${token}` } },
        true,
      )) as {
        accountSummaries?: {
          displayName: string;
          propertySummaries?: { property: string; displayName: string }[];
        }[];
        nextPageToken?: string;
      };
      if (
        !data ||
        (data.accountSummaries !== undefined &&
          !Array.isArray(data.accountSummaries))
      )
        throw new IntegrationError("Nieprawidłowa lista GA4.");
      for (const account of data.accountSummaries || []) {
        if (
          account.propertySummaries !== undefined &&
          !Array.isArray(account.propertySummaries)
        )
          throw new IntegrationError("Nieprawidłowa lista usług GA4.");
        for (const p of account.propertySummaries || []) {
          if (
            !/^properties\/[1-9][0-9]{0,19}$/.test(p.property) ||
            typeof p.displayName !== "string"
          )
            throw new IntegrationError("Nieprawidłowa usługa GA4.");
          const id = p.property.slice(11);
          choices.push({
            id,
            label: `${account.displayName || "GA4"} / ${p.displayName} · ${id}`,
          });
          if (choices.length > 2000)
            throw new IntegrationError(
              "Lista GA4 przekracza limit 2000 usług.",
            );
        }
      }
      if (!data.nextPageToken) return choices;
      if (
        typeof data.nextPageToken !== "string" ||
        data.nextPageToken.length > 10000 ||
        seen.has(data.nextPageToken)
      )
        throw new IntegrationError("Nieprawidłowa paginacja GA4.");
      next = data.nextPageToken;
      seen.add(next);
    }
    throw new IntegrationError("Lista kont GA4 przekracza limit stron.");
  }
  if (manager) {
    validateResource("google_ads", { customerId: manager });
    const rows = await adsSearch(
      token,
      manager,
      "SELECT customer_client.id, customer_client.descriptive_name, customer_client.manager, customer_client.level FROM customer_client WHERE customer_client.level <= 1",
      manager,
    );
    return rows
      .map((r) => {
        const c = r.customerClient as Record<string, unknown> | undefined;
        if (!c || !/^[1-9][0-9]{9}$/.test(String(c.id)))
          throw new IntegrationError("Nieprawidłowe konto MCC.");
        return {
          id: String(c.id),
          label: `${c.descriptiveName || "Konto"} · ${c.id}${c.manager ? " (MCC)" : ""}`,
          manager: c.manager === true,
        };
      })
      .filter((c) => c.id !== manager);
  }
  const data = (await apiJson(
    `https://googleads.googleapis.com/${adsVersion()}/customers:listAccessibleCustomers`,
    { headers: adsHeaders(token) },
    true,
  )) as { resourceNames?: string[] };
  if (
    !data ||
    (data.resourceNames !== undefined &&
      (!Array.isArray(data.resourceNames) || data.resourceNames.length > 200))
  )
    throw new IntegrationError(
      "Nieprawidłowa lub zbyt duża lista kont Ads. Wpisz numer konta ręcznie.",
    );
  // Directly accessible accounts, including MCC. Child accounts are fetched on demand.
  return (data.resourceNames || []).map((r) => {
    if (typeof r !== "string" || !/^customers\/[1-9][0-9]{9}$/.test(r))
      throw new IntegrationError("Nieprawidłowy numer konta Ads.");
    const id = r.slice(10);
    return { id, label: `Konto Google Ads · ${id}` };
  });
}
