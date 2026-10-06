"use client";
import { useEffect, useState } from "react";
import { localRequest } from "@/lib/local/client";
import { Badge } from "../crm/ui";
type Status = {
  clientConfigured: boolean;
  connected: boolean;
  connectedAt?: string;
  scopes: string[];
  adsDeveloperConfigured: boolean;
  redirectUri: string;
  error?: string;
};
export default function GoogleAccount({
  wid,
  changed,
}: {
  wid: string;
  changed: () => Promise<unknown>;
}) {
  const [status, setStatus] = useState<Status | null>(null),
    [busy, setBusy] = useState(false),
    [ads, setAds] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    localRequest(wid, "google")
      .then((r) => {
        if (!active) return;
        setStatus(r);
        setAds(r.scopes.some((s: string) => s.endsWith("/adwords")));
        const url = new URL(window.location.href),
          outcome = url.searchParams.get("google");
        if (outcome && url.searchParams.get("googleWorkspace") === wid) {
          if (outcome === "connected")
            setMessage(
              "Połączono Google. Wybierz usługi poniżej i pobierz statystyki.",
            );
          else
            setError(
              outcome === "denied"
                ? "Anulowano zgodę Google. Poprzednie połączenie pozostało bez zmian."
                : "Nie ukończono logowania. Zaznacz wszystkie żądane usługi i sprawdź klienta OAuth, sieć oraz zapis skarbca.",
            );
          url.searchParams.delete("google");
          url.searchParams.delete("googleWorkspace");
          window.history.replaceState(
            null,
            "",
            url.pathname + url.search + url.hash,
          );
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [wid]);
  async function action(connect: boolean) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const r = await localRequest(
        wid,
        connect ? "google/connect" : "google/disconnect",
        { method: "POST", body: JSON.stringify({ includeAds: ads }) },
      );
      if (connect) {
        window.location.assign(r.url);
        return;
      }
      setMessage(r.message);
      setStatus(await localRequest(wid, "google"));
      await changed();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd Google.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="crm-card grid gap-4 p-6"
      aria-label="Połączenie konta Google"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="crm-eyebrow">GOOGLE · KONTO TEJ FIRMY</span>
          <h3 className="text-xl!">
            Zaloguj Google, wybierz źródła, zobacz wyniki.
          </h3>
        </div>
        <Badge tone={status?.connected ? "green" : "gray"}>
          {status?.connected ? "Google połączone" : "Logowanie OAuth"}
        </Badge>
      </div>
      <p className="crm-muted">
        1. Połącz swoje konto Google. 2. Wczytaj i wybierz usługę GA4, witrynę
        Search Console lub konto Ads. 3. Kliknij „Pobierz statystyki”. Raporty
        pojawią się także na Pulpicie. Odświeżasz je ręcznie.
      </p>
      {status?.connectedAt && (
        <p className="crm-muted">
          Zgoda zapisana {new Date(status.connectedAt).toLocaleString("pl-PL")}.
          Token tej firmy pozostaje w szyfrowanym skarbcu na komputerze serwera.
        </p>
      )}
      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          checked={ads}
          disabled={busy || !status?.adsDeveloperConfigured}
          onChange={(e) => setAds(e.target.checked)}
        />
        <span>
          Dołącz Google Ads{" "}
          {status?.adsDeveloperConfigured
            ? "— wymagane uprawnienie adwords"
            : "— najpierw ustaw GOOGLE_ADS_DEVELOPER_TOKEN"}
          . Aplikacja wyłącznie odczytuje dane; zakres zgody Google Ads pozwala
          również na zarządzanie reklamami.
        </span>
      </label>
      {!status?.clientConfigured && (
        <p className="crm-muted">
          Jednorazowo skonfiguruj własnego klienta OAuth Web w Google Cloud:
          GOOGLE_OAUTH_CLIENT_ID i GOOGLE_OAUTH_CLIENT_SECRET w .env.local.
          Zrestartuj aplikację.
        </p>
      )}
      <details>
        <summary className="cursor-pointer text-sm text-violet-700">
          Adres powrotny i instrukcja konfiguracji
        </summary>
        <p className="crm-muted mt-3">
          Dodaj dokładnie ten autoryzowany URI przekierowania klienta OAuth:
        </p>
        <code className="mt-2 block text-sm break-all">
          {status?.redirectUri || "Adres niedostępny — sprawdź konfigurację"}
        </code>
        <a
          className="mt-3 block text-sm text-violet-700 underline"
          href="https://github.com/aievolutionpl/CRM-DASHBOARD/blob/main/docs/GOOGLE-INTEGRATIONS.md"
          target="_blank"
          rel="noreferrer"
        >
          Instrukcja Google, API, kont MCC i tokenu deweloperskiego
        </a>
        <p className="crm-muted mt-3">
          GA4 i Search Console można też podłączyć dotychczasowym kontem usługi
          lub tokenem z .env.local. Zgody cofniesz na
          myaccount.google.com/permissions. Kopia SQLite nie zawiera tokenów
          OAuth.
        </p>
      </details>
      {(error || status?.error) && (
        <p className="crm-alert error" role="alert">
          {error || status?.error}
        </p>
      )}
      {message && (
        <p className="crm-alert" role="status">
          {message}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <button
          className="crm-button"
          disabled={busy || !status?.clientConfigured || !status?.redirectUri}
          onClick={() => void action(true)}
        >
          {busy
            ? "Łączenie…"
            : status?.connected
              ? "Zmień konto lub zgodę Google"
              : "Połącz przez Google"}
        </button>
        {(status?.connected || status?.error) && (
          <button
            className="crm-button secondary"
            disabled={busy}
            onClick={() => void action(false)}
          >
            Usuń lokalne połączenie Google
          </button>
        )}
      </div>
      <p className="crm-muted">
        Zmiana konta usuwa wybór usług i poprzednie raporty Google tej firmy.
        Klienci, wiedza i importy CSV pozostają zapisane.
      </p>
    </section>
  );
}
