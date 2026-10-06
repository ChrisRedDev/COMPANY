"use client";
import { useState } from "react";
import type { GoogleProvider, Resource } from "@/lib/integrations/model";
import { localRequest } from "@/lib/local/client";
import { Field } from "../crm/ui";
type Choice = { id: string; label: string; manager?: boolean };
export default function GoogleSetup({
  wid,
  provider,
  resource,
  busy,
  save,
}: {
  wid: string;
  provider: GoogleProvider;
  resource: Resource;
  busy: boolean;
  save: (resource: Resource) => Promise<void>;
}) {
  const [value, setValue] = useState(
      provider === "ga4"
        ? resource.propertyId || ""
        : provider === "google_ads"
          ? resource.customerId || ""
          : resource.siteUrl || "",
    ),
    [manager, setManager] = useState(resource.loginCustomerId || ""),
    [choices, setChoices] = useState<Choice[]>([]),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [loaded, setLoaded] = useState(false);
  async function discover(mcc = false) {
    setLoading(true);
    setError("");
    setChoices([]);
    setLoaded(false);
    try {
      const query = new URLSearchParams({ provider });
      if (mcc) query.set("manager", manager.replaceAll("-", "").trim());
      const r = await localRequest(wid, `google/resources?${query}`);
      setChoices(r.resources);
      setLoaded(true);
      if (!mcc && provider === "google_ads") setManager("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nie udało się wczytać usług.");
    } finally {
      setLoading(false);
    }
  }
  const label =
    provider === "ga4"
      ? "Identyfikator usługi GA4"
      : provider === "google_ads"
        ? "Numer konta reklamowego Google Ads"
        : "Usługa Search Console";
  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        void save(
          provider === "ga4"
            ? { propertyId: value }
            : provider === "google_ads"
              ? { customerId: value, loginCustomerId: manager }
              : { siteUrl: value },
        );
      }}
    >
      <button
        type="button"
        className="crm-button secondary justify-self-start"
        disabled={busy || loading}
        onClick={() => void discover()}
      >
        {loading ? "Wczytywanie…" : "Wczytaj dostępne usługi"}
      </button>
      {error && (
        <p className="crm-alert error" role="alert">
          {error}
        </p>
      )}
      {loaded &&
        (!choices.length ? (
          <p className="crm-muted">
            Brak dostępnych usług. Sprawdź konto, uprawnienia i API lub wpisz
            identyfikator ręcznie.
          </p>
        ) : (
          <Field label="Wybierz usługę Google">
            <select
              className="crm-select"
              disabled={busy || loading}
              value={choices.some((c) => c.id === value) ? value : ""}
              onChange={(e) => {
                setValue(e.target.value);
                if (choices.find((c) => c.id === e.target.value)?.manager)
                  setManager(e.target.value);
              }}
            >
              <option value="">Wybierz z listy…</option>
              {choices.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
        ))}
      <Field label={label}>
        <input
          required
          disabled={busy || loading}
          maxLength={
            provider === "ga4" ? 20 : provider === "google_ads" ? 12 : 1000
          }
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={
            provider === "ga4"
              ? "123456789 — nie G-…"
              : provider === "google_ads"
                ? "123-456-7890"
                : "sc-domain:twoja-firma.pl lub https://twoja-firma.pl/"
          }
        />
      </Field>
      {provider === "google_ads" && (
        <>
          <Field label="Numer menedżera MCC (opcjonalnie)">
            <input
              maxLength={12}
              disabled={busy || loading}
              value={manager}
              onChange={(e) => {
                setManager(e.target.value);
                setChoices([]);
                setLoaded(false);
              }}
              placeholder="Numer konta menedżera, jeśli obsługuje Twoje konto"
            />
          </Field>
          <button
            type="button"
            className="crm-button secondary justify-self-start"
            disabled={busy || loading || !manager.trim()}
            onClick={() => void discover(true)}
          >
            Wczytaj konta pod menedżerem MCC
          </button>
          <p className="crm-muted">
            Lista bez MCC pokazuje konta z bezpośrednim dostępem. Dla agencji
            wpisz numer menedżera i wczytaj jego konta. Wybierz konto reklamowe;
            dla zagnieżdżonego MCC wczytaj kolejny poziom po wybraniu menedżera.
            Token deweloperski musi mieć dostęp do kont produkcyjnych.
          </p>
        </>
      )}
      <p className="crm-muted">
        {provider === "ga4"
          ? "Numer znajdziesz w GA4 → Administracja → Szczegóły usługi. Konto musi mieć rolę Przeglądający."
          : provider === "search_console"
            ? "Wybierz dokładną nazwę usługi Search Console, łącznie z prefiksem lub końcowym ukośnikiem."
            : "Numer konta i menedżera znajdziesz w Google Ads."}{" "}
        Zapis dotyczy tylko bieżącej firmy. Zmiana usługi usuwa wcześniejszy
        raport.
      </p>
      <button
        className="crm-button secondary justify-self-start"
        disabled={busy || loading || !value.trim()}
      >
        Zapisz usługę{" "}
        {provider === "ga4"
          ? "GA4"
          : provider === "google_ads"
            ? "Google Ads"
            : "Search Console"}
      </button>
    </form>
  );
}
