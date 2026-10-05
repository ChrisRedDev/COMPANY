"use client";
import type { AiProvider, AgentMessage } from "@/lib/ai/model";
import { Field } from "../crm/ui";
const labels: Record<AiProvider, string> = {
  openrouter: "OpenRouter API",
  codex: "ChatGPT przez Codex CLI",
  claude: "Claude Code CLI",
};
export default function AgentChat({
  messages,
  prompt,
  setPrompt,
  busy,
  storageBusy,
  canAsk,
  ask,
  decision,
}: {
  messages: AgentMessage[];
  prompt: string;
  setPrompt: (v: string) => void;
  busy: boolean;
  storageBusy?: boolean;
  canAsk: boolean;
  ask: (e: React.FormEvent) => Promise<void>;
  decision: (id: string, approve: boolean) => Promise<void>;
}) {
  return (
    <section className="crm-card p-6">
      <div className="grid gap-6">
        {messages.length ? (
          messages.map((m) => (
            <article key={m.id} className="border-b border-slate-100 pb-6">
              <div className="mb-3 rounded-xl bg-slate-50 p-4">
                <strong>Ty</strong>
                <p className="break-words whitespace-pre-wrap">{m.prompt}</p>
              </div>
              <p className="crm-muted mb-2">
                {labels[m.provider as AiProvider]} · {m.model}
              </p>
              <p className="text-[15px] leading-7 break-words whitespace-pre-wrap">
                {m.answer}
              </p>
              <div className="mt-4 grid gap-3">
                {m.actions.map((a) => (
                  <div
                    key={a.id}
                    className="rounded-xl border border-violet-100 bg-violet-50/50 p-4"
                  >
                    <strong>
                      {a.payload.type === "create_task"
                        ? "Propozycja zadania"
                        : "Propozycja notatki"}
                      : {a.payload.title}
                    </strong>
                    <p className="crm-muted">
                      {a.payload.type === "create_task"
                        ? `Termin: ${a.payload.date} · Firma: ${a.payload.companyId}`
                        : `Folder: ${a.payload.category}`}
                    </p>
                    {a.payload.type === "create_note" && (
                      <details className="my-3">
                        <summary>Sprawdź treść przed zapisem</summary>
                        <pre className="text-sm break-words whitespace-pre-wrap">
                          {a.payload.content}
                        </pre>
                      </details>
                    )}
                    {a.status === "pending" ? (
                      <div className="mt-3 flex gap-3">
                        <button
                          className="crm-button"
                          disabled={busy || storageBusy}
                          onClick={() => void decision(a.id, true)}
                        >
                          Zatwierdź i wykonaj
                        </button>
                        <button
                          className="crm-button secondary"
                          disabled={busy || storageBusy}
                          onClick={() => void decision(a.id, false)}
                        >
                          Odrzuć
                        </button>
                      </div>
                    ) : (
                      <p className="text-sm text-violet-700">
                        {a.status === "executed"
                          ? "Wykonano po zatwierdzeniu"
                          : "Odrzucono"}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </article>
          ))
        ) : (
          <div>
            <h3>Od czego zacząć?</h3>
            <p className="crm-muted">
              Zapytaj o wydatki, szanse sprzedaży albo procesy zapisane w
              Company Brain.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {[
                "Przeanalizuj marketing z ostatnich 30 dni.",
                "Co powinienem zrobić dzisiaj w CRM?",
                "Zaproponuj notatkę z zasadami obsługi klientów na podstawie wiedzy firmy.",
              ].map((q) => (
                <button
                  key={q}
                  className="crm-button secondary"
                  onClick={() => setPrompt(q)}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <form onSubmit={ask} className="mt-6 grid gap-3">
        <Field label="Wiadomość do agenta">
          <textarea
            rows={4}
            required
            maxLength={2000}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Co chcesz przeanalizować?"
          />
        </Field>
        <button
          className="crm-button justify-self-end"
          disabled={busy || storageBusy || !canAsk || !prompt.trim()}
        >
          {busy ? "Agent pracuje…" : "Analizuj"}
        </button>
      </form>
    </section>
  );
}
