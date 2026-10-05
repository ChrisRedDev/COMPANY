"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { localRequest } from "@/lib/local/client";
import { downloadFile } from "@/lib/crm/backup";
import { today as currentDate } from "@/lib/crm/model";
import { Badge } from "../crm/ui";
type Status = {
  provider: string;
  status: string;
  last_sync?: string;
  error?: string;
};
type Config = { provider: string; configured: boolean; required: string[] };
export default function Connectors({
  wid,
  mailSettings,
  openAi,
  openBrain,
}: {
  wid: string;
  mailSettings: () => void;
  openAi: () => void;
  openBrain: () => void;
}) {
  const [states, setStates] = useState<Status[]>([]),
    [configs, setConfigs] = useState<Config[]>([]),
    [busy, setBusy] = useState(""),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [events, setEvents] = useState<unknown[][]>([]);
  const input = useRef<HTMLInputElement>(null);
  const load = useCallback(
    () =>
      localRequest(wid, "integrations")
        .then((r) => {
          setStates(r.states);
          setConfigs(r.providers);
          const posthog = r.snapshots?.find(
            (s: { provider: string }) => s.provider === "posthog",
          );
          if (posthog?.payload.events) setEvents(posthog.payload.events);
        })
        .catch((e) => setError(e.message)),
    [wid],
  );
  useEffect(() => {
    void load();
  }, [load]);
  async function action(provider: string, operation: string) {
    setBusy(provider);
    setError("");
    setMessage("");
    try {
      const r = await localRequest(wid, "integrations", {
        method: "POST",
        body: JSON.stringify({ provider, action: operation }),
      });
      setMessage(r.summary || r.message);
      if (r.events) setEvents(r.events);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd połączenia.");
    } finally {
      setBusy("");
      await load();
    }
  }
  async function importCsv(file?: File) {
    if (!file) return;
    setBusy("csv");
    setError("");
    try {
      if (file.size > 2_000_000) throw Error("CSV może mieć do 2 MB.");
      const result = await localRequest(wid, "marketing", {
        method: "POST",
        body: JSON.stringify({ csv: await file.text() }),
      });
      setMessage(
        `Zapisano ${result.count} wierszy. Pulpit pokaże przeliczone wyniki; ponowny import aktualizuje te same kampanie i daty.`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd importu.");
    } finally {
      setBusy("");
      if (input.current) input.current.value = "";
    }
  }
  return (
    <div className="grid gap-5">
      <section className="crm-card p-6">
        <span className="crm-eyebrow">KONEKTORY · ODCZYT I IMPORT</span>
        <h2>Twoje źródła danych, w jednym miejscu.</h2>
        <p className="crm-muted">
          Sekrety dostawców zostają na komputerze w .env.local. Konfiguracja
          dotyczy tej instalacji, a importy są oddzielne dla każdej przestrzeni.
        </p>
        <div className="mt-5 flex flex-wrap gap-3 text-xs font-medium text-slate-600">
          <span className="rounded-full bg-slate-100 px-3 py-2">
            {states.filter((s) => s.status === "checked").length} sprawdzonych
            odczytów API
          </span>
          <span className="rounded-full bg-violet-50 px-3 py-2 text-violet-700">
            Importy zapisane w SQLite
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-2">
            Synchronizacja uruchamiana ręcznie
          </span>
        </div>
      </section>
      {error && (
        <p role="alert" className="crm-alert error">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="crm-alert">
          {message}
        </p>
      )}
      <div className="grid gap-5 md:grid-cols-2">
        <article className="crm-card grid gap-4 border-violet-200! p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-xl!">Twoje AI · Twój model</h3>
            <Badge tone="purple">OpenRouter / CLI</Badge>
          </div>
          <p className="crm-muted">
            Podłącz OpenRouter API albo lokalne CLI Codex / Claude Code. Wybierz
            model, analizuj dane i zatwierdzaj propozycje agenta. Subskrypcje
            działają przez zalogowane CLI.
          </p>
          <button className="crm-button justify-self-start" onClick={openAi}>
            Otwórz połączenie AI
          </button>
        </article>
        <article className="crm-card grid gap-4 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-xl!">Strona firmy → Company Brain</h3>
            <Badge tone="purple">Publiczny HTML</Badge>
          </div>
          <p className="crm-muted">
            Podaj adres HTTPS. Generator z wybranym modelem przygotuje kontekst
            firmy, ofertę, markę i propozycje marketingowe ze źródłami.
            Sprawdzony szkic zapiszesz i pobierzesz do Obsidiana.
          </p>
          <button
            className="crm-button secondary justify-self-start"
            onClick={openBrain}
          >
            Otwórz wiedzę firmy
          </button>
        </article>
        {configs.map((c) => {
          const s = states.find((s) => s.provider === c.provider),
            label =
              c.provider === "wordpress" ? "WordPress / Elementor" : "PostHog",
            checked = s?.status === "checked",
            disconnected = s?.status === "disconnected";
          return (
            <article key={c.provider} className="crm-card grid gap-4 p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-xl!">{label}</h3>
                <Badge
                  tone={
                    checked ? "green" : s?.status === "error" ? "red" : "gray"
                  }
                >
                  {checked
                    ? "Odczyt API sprawdzony"
                    : disconnected
                      ? "Wyłączony"
                      : s?.status === "error"
                        ? "Błąd"
                        : c.configured
                          ? "Gotowy do sprawdzenia"
                          : "Wymaga konfiguracji"}
                </Badge>
              </div>
              <p className="crm-muted">
                {c.provider === "wordpress"
                  ? "Odczyt opublikowanych stron i import treści do Company Brain. Bez publikacji lub zmian w WordPressie."
                  : "Odczyt liczby zdarzeń z ostatnich 30 dni z PostHog Cloud EU/US. Bez tworzenia własnego session replay."}
              </p>
              <details>
                <summary className="cursor-pointer text-sm text-violet-700">
                  Jak podłączyć?
                </summary>
                <ul className="mt-3 grid gap-2 text-sm">
                  {c.required.map((k) => (
                    <li key={k}>
                      <code>{k}</code>
                    </li>
                  ))}
                </ul>
                <p className="crm-muted mt-3">
                  Uzupełnij .env.local i zrestartuj serwer. Nie wklejaj kluczy
                  do notatek ani CSV.
                </p>
              </details>
              {s?.last_sync && (
                <p className="crm-muted">
                  Ostatni udany odczyt:{" "}
                  {new Date(s.last_sync).toLocaleString("pl-PL")}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <button
                  className="crm-button secondary"
                  disabled={!c.configured || !!busy}
                  onClick={() => void action(c.provider, "check")}
                >
                  {busy === c.provider
                    ? "Łączenie…"
                    : disconnected
                      ? "Połącz ponownie"
                      : "Sprawdź odczyt"}
                </button>
                <button
                  className="crm-button"
                  disabled={!c.configured || disconnected || !!busy}
                  onClick={() => void action(c.provider, "sync")}
                >
                  {c.provider === "wordpress"
                    ? "Importuj strony"
                    : "Odczytaj zdarzenia"}
                </button>
                {checked && (
                  <button
                    className="crm-text-button"
                    disabled={!!busy}
                    onClick={() => void action(c.provider, "disconnect")}
                  >
                    Wyłącz w przestrzeni
                  </button>
                )}
              </div>
            </article>
          );
        })}
        <article className="crm-card grid gap-4 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-xl!">Google Ads / Microsoft Ads</h3>
            <Badge tone="purple">Import CSV</Badge>
          </div>
          <p className="crm-muted">
            Wczytaj dzienne wyniki kampanii w PLN. Adapter importu waliduje dane
            i aktualizuje istniejące wiersze. Bez live OAuth i zmian kampanii.
          </p>
          <p className="text-sm">
            Kolumny: date, source, campaign, spend, impressions, clicks, leads,
            qualified, revenue. Źródła: google_ads, microsoft_ads, organic, gbp,
            direct.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              className="crm-button"
              disabled={!!busy}
              onClick={() => input.current?.click()}
            >
              {busy === "csv" ? "Importowanie…" : "Importuj CSV"}
            </button>
            <button
              className="crm-button secondary"
              onClick={() =>
                downloadFile(
                  "szablon-kampanii.csv",
                  `date;source;campaign;spend;impressions;clicks;leads;qualified;revenue\n${currentDate()};google_ads;Przykład do uzupełnienia;0;0;0;0;0;0\n`,
                )
              }
            >
              Pobierz szablon
            </button>
          </div>
          <input
            ref={input}
            type="file"
            accept=".csv,text/csv"
            hidden
            onChange={(e) => void importCsv(e.target.files?.[0])}
          />
        </article>
        <article className="crm-card grid gap-4 p-6">
          <h3 className="text-xl!">Poczta · Resend</h3>
          <p className="crm-muted">
            Bezpośrednia wysyłka z CRM z potwierdzeniem użytkownika. Klucz API
            na serwerze, token wysyłki tylko w pamięci sesji.
          </p>
          <button
            className="crm-button secondary justify-self-start"
            onClick={mailSettings}
          >
            Otwórz konfigurację poczty
          </button>
        </article>
      </div>
      {!!events.length && (
        <section className="crm-card p-6">
          <h3>Zdarzenia PostHog · ostatnie 30 dni</h3>
          <ul className="mt-4 grid gap-2 text-sm">
            {events.map((r, i) => (
              <li key={i}>
                {String(r[0])}: <strong>{String(r[1])}</strong>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
