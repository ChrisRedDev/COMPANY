"use client";
import {
  isDatabase,
  isSqlite,
  snapshot,
  validateSnapshot,
} from "@/lib/growth/model";
import { localDownload } from "@/lib/local/client";
import { useState, useRef } from "react";
import { useCrm } from "@/stores/crm-store";
import { today } from "@/lib/crm/model";
import { parseBackup, downloadFile } from "@/lib/crm/backup";
import { Icon, Badge, Field } from "./ui";
import type { MailStatus } from "./mail";
export default function Settings({
  token,
  setToken,
  status,
  setStatus,
  notify,
  showOnboarding,
}: {
  token: string;
  setToken: (s: string) => void;
  status: MailStatus;
  setStatus: (s: MailStatus) => void;
  notify: (s: string) => void;
  showOnboarding: () => void;
}) {
  const s = useCrm();
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  async function check() {
    setBusy(true);
    try {
      const response = await fetch("/api/mail/check", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (!response.ok) throw Error(result.error);
      setStatus({ ...status, verified: true, error: undefined });
      notify(result.message);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Nie udało się sprawdzić połączenia.";
      setStatus({ ...status, verified: false, error: message });
      notify(message);
    } finally {
      setBusy(false);
    }
  }
  async function restore(file?: File) {
    if (!file) return;
    try {
      if (file.size > 5_000_000)
        throw Error("Kopia może mieć maksymalnie 5 MB.");
      const raw = await file.text();
      const data = parseBackup(raw);
      const imported = JSON.parse(raw);
      const preferences =
        imported.settings === undefined
          ? undefined
          : validateSnapshot({ data, settings: imported.settings, revision: 0 })
              .settings;
      if (
        confirm("Przywrócenie kopii zastąpi bieżące dane CRM. Kontynuować?")
      ) {
        if (preferences) useCrm.setState({ ...data, ...preferences });
        else s.restore(data);
        notify("Kopia została przywrócona.");
      }
    } catch (error) {
      notify(error instanceof Error ? error.message : "Nieprawidłowa kopia.");
    }
    if (input.current) input.current.value = "";
  }
  return (
    <div className="crm-settings-grid">
      <section className="crm-card crm-settings-card">
        <span className="crm-section-icon">
          <Icon name="mail" />
        </span>
        <h3>Twoja poczta, Twój nadawca</h3>
        <p>
          Podłącz Resend, żeby wysyłać wiadomości bezpośrednio z CRM. Gmail i
          Outlook możesz otworzyć przez domyślny program pocztowy — to nie
          synchronizuje skrzynki.
        </p>
        <Badge
          tone={
            status.verified ? "green" : status.configured ? "purple" : "neutral"
          }
        >
          {status.verified
            ? "Połączenie sprawdzone"
            : status.configured
              ? "Zmienne skonfigurowane"
              : "Resend niepodłączony"}
        </Badge>
        <div className="crm-config-instructions">
          <strong>Konfiguracja na komputerze</strong>
          <ol>
            <li>
              Skopiuj <code>.env.example</code> do <code>.env.local</code>.
            </li>
            <li>
              Ustaw <code>RESEND_API_KEY</code>, <code>CRM_MAIL_FROM</code> i
              własny <code>CRM_MAIL_ACCESS_TOKEN</code>.
            </li>
            <li>Zweryfikuj domenę nadawcy w Resend i zrestartuj aplikację.</li>
            <li>Wpisz poniżej token dostępu i sprawdź połączenie.</li>
          </ol>
        </div>
        <Field
          label="Token dostępu do poczty"
          hint="Token sesji nie jest zapisywany w localStorage. Nie wpisuj tutaj klucza Resend."
        >
          <input
            type="password"
            autoComplete="off"
            value={token}
            maxLength={1000}
            onChange={(e) => setToken(e.target.value)}
          />
        </Field>
        <button
          className="crm-button"
          disabled={busy || !token || !status.configured}
          onClick={() => void check()}
        >
          {busy ? "Checking…" : "Sprawdź połączenie"}
        </button>
        {status.error && (
          <p className="crm-error" role="alert">
            {status.error}
          </p>
        )}
        <p className="crm-muted">
          Test odczytuje listę domen. Klucz tylko do wysyłki może nie mieć tego
          uprawnienia. Nie wysyłamy wiadomości testowej.
        </p>
      </section>
      <div className="crm-settings-stack">
        {isSqlite() && (
          <section className="crm-card crm-settings-card">
            <h3>Lokalna mini baza SQLite</h3>
            <p>
              Customers, CRM, wiedza, importy i historia agenta są zapisane na dysku
              tego komputera. Kopia SQLite zawiera wszystkie przestrzenie.
              Klucze API nie są w bazie.
            </p>
            <button
              className="crm-button secondary"
              onClick={() =>
                void localDownload(
                  "/api/local/backup",
                  "evolution-backup.sqlite",
                ).catch((e) => notify(e.message))
              }
            >
              Pobierz całą bazę SQLite
            </button>
          </section>
        )}
        <section className="crm-card crm-settings-card">
          <span className="crm-section-icon">
            <Icon name="agent" />
          </span>
          <h3>Podpis i agent</h3>
          <p>Ten podpis pojawi się w szkicach follow-upów.</p>
          <Field label="Podpis wiadomości">
            <input
              value={s.sender}
              maxLength={200}
              onChange={(e) => s.setSender(e.target.value)}
            />
          </Field>
          <p className="crm-muted">
            Agent korzysta z polskiego szablonu i informacji o projekcie. Nie
            wymaga konta w usłudze AI.
          </p>
        </section>
        <section className="crm-card crm-settings-card">
          <span className="crm-section-icon">
            <Icon name="download" />
          </span>
          <h3>Twoje dane są u Ciebie</h3>
          <p>
            {isDatabase()
              ? "Dane tej przestrzeni są zapisywane w bazie serwera (SQLite lub Supabase). Import JSON zastępuje wyłącznie dane wybranej przestrzeni. Stan zapisu widzisz nad aplikacją."
              : "Dane CRM pozostają w tej przeglądarce. Wykonuj kopie, żeby przenieść je na inny komputer lub odzyskać po wyczyszczeniu przeglądarki."}
          </p>
          <div className="crm-inline">
            <button
              className="crm-button secondary"
              onClick={() =>
                downloadFile(
                  `ai-evolution-crm-${today()}.json`,
                  JSON.stringify(
                    {
                      version: 1,
                      settings: snapshot(s, 0).settings,
                      exportedAt: new Date().toISOString(),
                      data: {
                        firms: s.firms,
                        contacts: s.contacts,
                        deals: s.deals,
                        tasks: s.tasks,
                        mails: s.mails,
                      },
                    },
                    null,
                    2,
                  ),
                )
              }
            >
              Pobierz kopię JSON
            </button>
            <button
              className="crm-button secondary"
              onClick={() => input.current?.click()}
            >
              Przywróć kopię
            </button>
            <input
              ref={input}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => void restore(e.target.files?.[0])}
            />
          </div>
          <p className="crm-muted">
            Kopia zawiera kontakty i treści wiadomości. Przechowuj ją w
            bezpiecznym miejscu. Nie obejmuje kluczy poczty.
          </p>
          <button
            className="crm-text-button danger"
            onClick={() => {
              if (
                confirm(
                  "Usunąć wszystkie firmy, kontakty, szanse, zadania i wiadomości? Najpierw pobierz kopię.",
                )
              ) {
                s.empty();
                notify("Dane CRM zostały wyczyszczone.");
              }
            }}
          >
            Wyczyść dane demonstracyjne / bieżące
          </button>
        </section>
        <section className="crm-card crm-settings-card">
          <h3>Potrzebujesz przypomnienia?</h3>
          <p>Krótki przewodnik pokazuje firmy, szanse, pocztę i agenta.</p>
          <button className="crm-button secondary" onClick={showOnboarding}>
            <Icon name="help" size={17} />
            Pokaż onboarding
          </button>
        </section>
      </div>
    </div>
  );
}
