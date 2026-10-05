"use client";
import { useCallback, useEffect, useState } from "react";
import { localRequest } from "@/lib/local/client";
import {
  AI_PROVIDERS,
  type AiProvider,
  type AgentMessage,
} from "@/lib/ai/model";
import AgentChat from "./agent-chat";
import { Field, Badge } from "../crm/ui";
type Status = {
  openrouter: boolean;
  codex: boolean;
  claude: boolean;
  cliEnabled: boolean;
};
const labels: Record<AiProvider, string> = {
  openrouter: "OpenRouter API",
  codex: "ChatGPT przez Codex CLI",
  claude: "Claude Code CLI",
};
export default function AiAgent({
  wid,
  storageBusy,
  onApplied,
}: {
  wid: string;
  storageBusy?: boolean;
  onApplied: () => void;
}) {
  const [provider, setProvider] = useState<AiProvider>("openrouter"),
    [model, setModel] = useState(""),
    [prompt, setPrompt] = useState(""),
    [key, setKey] = useState(""),
    [messages, setMessages] = useState<AgentMessage[]>([]),
    [status, setStatus] = useState<Status>({
      openrouter: false,
      codex: false,
      claude: false,
      cliEnabled: false,
    }),
    [models, setModels] = useState<{ id: string; name: string }[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const load = useCallback(async () => {
    try {
      const result = await localRequest(wid, "ai");
      setStatus(result.status);
      setMessages(result.messages);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd odczytu agenta.");
    }
  }, [wid]);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) void load();
    });
    return () => {
      active = false;
    };
  }, [load]);
  async function fetchModels() {
    setBusy(true);
    setError("");
    try {
      const r = await localRequest(wid, "ai/models");
      setModels(r.models);
      setNotice(
        `Pobrano ${r.models.length} modeli. Wybierz identyfikator; koszt zależy od wybranego modelu i konta.`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nie udało się pobrać modeli.");
    } finally {
      setBusy(false);
    }
  }
  async function connectKey() {
    setBusy(true);
    setError("");
    try {
      await localRequest(wid, "ai/key", {
        method: "POST",
        body: JSON.stringify({ key }),
      });
      setKey("");
      setNotice(
        "Klucz zapisano w pamięci serwera na 30 minut. Nie trafia do SQLite ani localStorage.",
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd klucza.");
    } finally {
      setBusy(false);
    }
  }
  async function ask(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const r = await localRequest(wid, "ai", {
        method: "POST",
        body: JSON.stringify({ provider, model, prompt }),
      });
      setMessages(r.messages);
      setPrompt("");
      if (r.usage)
        setNotice(
          `Zużycie zgłoszone przez dostawcę: ${JSON.stringify(r.usage)}`,
        );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Nie udało się przeprowadzić analizy.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function decision(id: string, approve: boolean) {
    setBusy(true);
    setError("");
    try {
      const r = await localRequest(wid, "ai/decision", {
        method: "POST",
        body: JSON.stringify({ id, approve }),
      });
      setMessages(r.messages);
      if (approve) onApplied();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Nie udało się zatwierdzić propozycji.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="grid gap-5">
      <section className="crm-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="crm-eyebrow">
              AI BRAIN · ASYSTENT TWOJEJ FIRMY
            </span>
            <h2>Zapytaj. Sprawdź. Zdecyduj.</h2>
            <p className="crm-muted">
              Analiza CRM, importów marketingowych i wybranych notatek. Każdą
              zmianę zatwierdzasz osobno.
            </p>
          </div>
          <Badge tone={status[provider] ? "green" : "gray"}>
            {provider === "openrouter"
              ? status.openrouter
                ? "Klucz dostępny"
                : "Podłącz klucz"
              : status[provider]
                ? "CLI dostępne · logowanie do sprawdzenia"
                : "CLI niedostępne lub wyłączone"}
          </Badge>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Field label="Dostawca AI">
            <select
              value={provider}
              disabled={busy}
              onChange={(e) => {
                setProvider(e.target.value as AiProvider);
                setModel("");
                setNotice("");
              }}
            >
              {AI_PROVIDERS.map((p) => (
                <option key={p} value={p}>
                  {labels[p]}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="Model AI"
            hint="Wybierz z listy lub wpisz identyfikator dostępny na swoim koncie."
          >
            <input
              list="growth-models"
              value={model}
              disabled={busy}
              maxLength={151}
              placeholder="ID modelu lub alias"
              onChange={(e) => setModel(e.target.value)}
            />
          </Field>
          <datalist id="growth-models">
            {provider === "openrouter"
              ? models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))
              : provider === "claude"
                ? ["sonnet", "opus", "haiku"].map((m) => (
                    <option key={m} value={m} />
                  ))
                : null}
          </datalist>
        </div>
        {provider === "openrouter" ? (
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Klucz OpenRouter (sesja 30 minut)">
              <input
                type="password"
                autoComplete="off"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="sk-or-…"
              />
            </Field>
            <button
              className="crm-button secondary"
              disabled={busy || !key}
              onClick={() => void connectKey()}
            >
              Podłącz API
            </button>
            <button
              className="crm-button secondary"
              disabled={busy || !status.openrouter}
              onClick={() => void fetchModels()}
            >
              Pobierz modele
            </button>
            <button
              className="crm-text-button"
              disabled={busy}
              onClick={() =>
                void localRequest(wid, "ai/disconnect", {
                  method: "POST",
                  body: "{}",
                })
                  .then(() => {
                    setModels([]);
                    return load();
                  })
                  .catch((e) => setError(e.message))
              }
            >
              Usuń klucz sesji
            </button>
          </div>
        ) : (
          <p className="crm-alert">
            {provider === "codex"
              ? "Subskrypcję ChatGPT wykorzystasz przez zainstalowany Codex CLI: zaloguj się poleceniem codex login. To nie jest podłączenie strony chatgpt.com ani klucz API z subskrypcji."
              : "Zainstaluj Claude Code i zaloguj konto w CLI. Dostęp i limity modeli zależą od Twojego planu Anthropic."}{" "}
            W .env.local ustaw LOCAL_AI_CLI_ENABLED=1 i uruchom serwer ponownie.
            Adapter działa bez narzędzi systemowych i MCP.
          </p>
        )}
        <p className="crm-muted mt-3">
          Kliknięcie „Analizuj” wysyła ograniczony kontekst tej przestrzeni do
          wybranego dostawcy. Klucze i konfiguracja integracji nie są częścią
          kontekstu. Agent może proponować zadania i notatki; nie zmienia
          kampanii i nie wysyła e-maili.
        </p>
      </section>
      {error && (
        <p className="crm-alert error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="crm-alert break-all" role="status">
          {notice}
        </p>
      )}
      <AgentChat
        messages={messages}
        prompt={prompt}
        setPrompt={setPrompt}
        busy={busy}
        storageBusy={storageBusy}
        canAsk={Boolean(status[provider] && model)}
        ask={ask}
        decision={decision}
      />
    </div>
  );
}
