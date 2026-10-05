"use client";
import { useEffect, useState } from "react";
import type { AiProvider } from "@/lib/ai/model";
import type { BrainDraft } from "@/lib/knowledge/generation-model";
import { localDownload, localRequest } from "@/lib/local/client";
import { Field, Modal } from "../crm/ui";
import Markdown from "./markdown";
export default function BrainGenerator({
  wid,
  close,
  saved,
  openAi,
}: {
  wid: string;
  close: () => void;
  saved: () => void;
  openAi: () => void;
}) {
  const [url, setUrl] = useState(""),
    [provider, setProvider] = useState<AiProvider>("openrouter"),
    [model, setModel] = useState(""),
    [catalog, setCatalog] = useState<{ id: string; name: string }[]>([]),
    [status, setStatus] = useState<Record<string, boolean>>({}),
    [draft, setDraft] = useState<BrainDraft | null>(null),
    [selected, setSelected] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [applied, setApplied] = useState(false);
  useEffect(() => {
    let active = true;
    void Promise.all([
      localRequest(wid, "ai"),
      localRequest(wid, "brain/draft"),
    ])
      .then(([ai, brain]) => {
        if (active) {
          setStatus(ai.status);
          setDraft(brain.draft);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [wid]);
  async function create() {
    setBusy(true);
    setError("");
    try {
      const next = await localRequest(wid, "brain/generate", {
        method: "POST",
        body: JSON.stringify({ url, provider, model }),
      });
      setDraft(next);
      setSelected(0);
      setApplied(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd generowania.");
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    if (!draft) return;
    setBusy(true);
    setError("");
    try {
      await localRequest(wid, "brain/save-generation", {
        method: "POST",
        body: JSON.stringify({ id: draft.id }),
      });
      setApplied(true);
      saved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd zapisu.");
    } finally {
      setBusy(false);
    }
  }
  const docs =
    draft?.documents.map((d, i) => ({
      ...d,
      id: String(i),
      revision: 0,
      updated_at: "",
    })) || [];
  return (
    <Modal
      title="Mózg firmy ze strony"
      wide
      onClose={() => {
        if (!busy) close();
      }}
    >
      <div className="grid gap-5 p-6">
        {!draft && (
          <div className="rounded-xl bg-violet-50 p-5">
            <span className="crm-eyebrow">STRONA → WIEDZA → MARKETING</span>
            <h3>Opisz firmę raz. Pracuj z jej kontekstem.</h3>
            <p className="mt-2 text-sm text-slate-600">
              Podaj adres. Agent odczyta stronę i do 4 podstron, przygotuje 34
              sekcje oraz notatki o ofercie, marce i marketingu. Sprawdź szkic,
              a potem zapisz wiedzę i wyeksportuj ją do Obsidiana.
            </p>
          </div>
        )}
        {!draft && (
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              void create();
            }}
          >
            <Field
              label="Adres strony firmy"
              hint="Publiczny, docelowy adres HTTPS. Bez logowania; strony wymagające JavaScript mogą nie udostępniać treści."
            >
              <input
                type="url"
                placeholder="https://twoja-firma.pl"
                required
                maxLength={2048}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={busy}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Dostawca generatora">
                <select
                  value={provider}
                  disabled={busy}
                  onChange={(e) => {
                    setProvider(e.target.value as AiProvider);
                    setModel("");
                  }}
                >
                  <option value="openrouter">OpenRouter API</option>
                  <option value="codex">ChatGPT przez Codex CLI</option>
                  <option value="claude">Claude Code CLI</option>
                </select>
              </Field>
              <Field label="Model generatora">
                <input
                  value={model}
                  required
                  disabled={busy}
                  maxLength={150}
                  list="brain-models"
                  placeholder={
                    provider === "claude" ? "sonnet" : "Identyfikator modelu"
                  }
                  onChange={(e) => setModel(e.target.value)}
                />
              </Field>
            </div>
            <datalist id="brain-models">
              {catalog.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </datalist>
            {provider === "openrouter" && (
              <button
                type="button"
                className="crm-text-button justify-self-start"
                disabled={!status.openrouter || busy}
                onClick={() => {
                  setBusy(true);
                  void localRequest(wid, "ai/models")
                    .then((r) => setCatalog(r.models))
                    .catch((e) => setError(e.message))
                    .finally(() => setBusy(false));
                }}
              >
                Pobierz listę modeli
              </button>
            )}
            {!status[provider] && (
              <div className="crm-alert">
                <p>Najpierw podłącz klucz API lub zalogowane CLI w AI Brain.</p>
                <button
                  type="button"
                  className="crm-text-button"
                  onClick={openAi}
                >
                  Przejdź do połączenia AI
                </button>
              </div>
            )}
            <p className="crm-muted text-sm">
              Treść odczytanych stron trafi do wybranego dostawcy. Generowanie
              wykorzystuje płatne API lub limit Twojej subskrypcji, do 8000
              tokenów odpowiedzi. Nie wyszukuje zewnętrznych opinii ani
              konkurencji.
            </p>
            <button
              className="crm-button justify-self-start"
              disabled={busy || !status[provider] || !model.trim()}
            >
              {busy
                ? "Odczytuję stronę i tworzę szkic…"
                : "Wygeneruj mózg firmy"}
            </button>
          </form>
        )}
        {draft && (
          <>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <span className="crm-eyebrow">
                  {applied
                    ? "ZAPISANO W COMPANY BRAIN"
                    : "SZKIC DO SPRAWDZENIA"}
                </span>
                <h3>{draft.companyName}</h3>
                <p className="crm-muted">{draft.summary}</p>
              </div>
              <button
                className="crm-button secondary"
                disabled={busy}
                onClick={() => {
                  setDraft(null);
                  setApplied(false);
                  setError("");
                }}
              >
                Nowy mózg firmy
              </button>
            </div>
            <p className="crm-alert">
              CONFIRMED = zapis na odczytanej stronie. TO CONFIRM = hipoteza lub
              propozycja. MISSING = brak danych w odczytanych źródłach. Sprawdź
              ceny, obietnice i kontakt przed użyciem w marketingu.
            </p>
            <details className="rounded-lg border border-slate-200 p-4">
              <summary className="cursor-pointer font-semibold">
                Źródła i pytania do właściciela ({draft.sources.length} stron)
              </summary>
              <ul className="mt-3 grid gap-2 text-sm">
                {draft.sources.map((s) => (
                  <li key={s.id}>
                    <a
                      className="crm-text-button break-all"
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      [{s.id}] {s.url}
                    </a>{" "}
                    · {s.checkedAt.slice(0, 10)}
                  </li>
                ))}
                {draft.warnings.map((w, i) => (
                  <li key={`w${i}`}>{w}</li>
                ))}
                {draft.questions.map((q, i) => (
                  <li key={`q${i}`}>
                    {i + 1}. {q}
                  </li>
                ))}
              </ul>
            </details>
            <div className="flex flex-wrap gap-2" aria-label="Dokumenty szkicu">
              {draft.documents.map((d, i) => (
                <button
                  key={d.title}
                  className={`crm-button ${i === selected ? "" : "secondary"}`}
                  onClick={() => setSelected(i)}
                >
                  {["Pełny mózg firmy", "Oferta", "Marka", "Marketing"][i]}
                </button>
              ))}
            </div>
            <div
              className="max-h-[32vh] overflow-auto rounded-xl border border-slate-200 p-5"
              data-testid="brain-draft-preview"
            >
              <Markdown
                content={draft.documents[selected].content}
                documents={docs}
                open={(d) => setSelected(Number(d.id))}
              />
            </div>
            {draft.usage != null && (
              <p className="crm-muted text-xs">
                Zużycie dostawcy: {JSON.stringify(draft.usage)}
              </p>
            )}
            <div className="flex flex-wrap gap-3">
              {!applied ? (
                <button
                  className="crm-button"
                  disabled={busy}
                  onClick={() => void save()}
                >
                  {busy ? "Zapisuję…" : "Zatwierdź i zapisz 4 notatki"}
                </button>
              ) : (
                <>
                  <button
                    className="crm-button"
                    onClick={() =>
                      void localDownload(
                        `/api/local/workspaces/${wid}/vault`,
                        "company-brain.zip",
                      ).catch((e) => setError(e.message))
                    }
                  >
                    Pobierz do Obsidiana
                  </button>
                  <button className="crm-button secondary" onClick={close}>
                    Otwórz Company Brain
                  </button>
                </>
              )}
            </div>
            <p className="crm-muted text-sm">
              Zapis jest jedną transakcją. Istniejące notatki nie zostaną
              nadpisane. Po zapisie możesz je edytować i uzupełnić odpowiedzi
              właściciela. Obsidian: rozpakuj ZIP i wybierz „Otwórz folder jako
              skarbiec”.
            </p>
          </>
        )}
        {error && (
          <p role="alert" className="crm-alert error">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}
