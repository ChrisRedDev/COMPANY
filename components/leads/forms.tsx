"use client";
import { useState, type FormEvent } from "react";
import { cloudRequest } from "@/lib/supabase/browser";
import {
  parseLead,
  LEAD_STATUSES,
  statusLabels,
  EVENT_TYPES,
  eventLabels,
  type Lead,
  type LeadInput,
  type EventType,
} from "@/lib/leads/model";
import { Modal, Field } from "../crm/ui";
export function LeadForm({
  wid,
  lead,
  close,
  saved,
}: {
  wid: string;
  lead?: Lead;
  close: () => void;
  saved: (lead: Lead, duplicate?: boolean) => void;
}) {
  const [id] = useState(() => lead?.id ?? crypto.randomUUID());
  const [draft, setDraft] = useState<LeadInput>(() =>
    lead
      ? parseLead(lead)
      : {
          first_name: "",
          last_name: "",
          company_name: "",
          email: "",
          phone: "",
          status: "new",
          source: "",
          campaign: "",
          medium: "",
          estimated_value: 0,
          revenue: 0,
          notes: "",
          landing_page: "",
          keyword: "",
          utm: {},
        },
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const change = (key: keyof LeadInput, value: string | number) =>
    setDraft((s) => ({ ...s, [key]: value }));
  const input = (
    key: Exclude<keyof LeadInput, "utm">,
    label: string,
    type = "text",
    maxLength = 200,
  ) => (
    <Field label={label}>
      <input
        type={type}
        maxLength={maxLength}
        value={String(draft[key])}
        onChange={(e) =>
          change(
            key,
            type === "number" ? Number(e.target.value) : e.target.value,
          )
        }
        {...(type === "number" ? { min: 0, max: 1e12, step: "0.01" } : {})}
      />
    </Field>
  );
  async function save(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const data = parseLead(draft);
      const result = await cloudRequest(
        `/${wid}/leads${lead ? "/" + lead.id : ""}`,
        {
          method: lead ? "PUT" : "POST",
          body: JSON.stringify({ ...data, id, revision: lead?.revision }),
        },
      );
      saved(result.lead, result.duplicate);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nie udało się zapisać leada.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={lead ? "Edytuj leada" : "Dodaj leada"}
      onClose={() => !busy && close()}
    >
      <form className="crm-form" onSubmit={save}>
        {error && (
          <p role="alert" className="crm-alert error">
            {error}
          </p>
        )}
        <fieldset disabled={busy} className="grid min-w-0 gap-4 border-0 p-0">
          <p className="text-sm leading-relaxed text-slate-600">
            Wystarczy nazwa lub kontakt. Ten sam e-mail albo telefon wskaże
            istniejącego leada.
          </p>
          <div className="crm-form-grid">
            {input("first_name", "Imię leada", "text", 100)}
            {input("last_name", "Nazwisko leada", "text", 100)}
          </div>
          {input("company_name", "Firma leada (opcjonalnie)")}
          <div className="crm-form-grid">
            {input("email", "E-mail leada", "email", 254)}
            {input("phone", "Telefon leada", "tel", 50)}
          </div>
          <Field label="Status leada">
            <select
              value={draft.status}
              onChange={(e) => change("status", e.target.value)}
            >
              {LEAD_STATUSES.map((s) => (
                <option value={s} key={s}>
                  {statusLabels[s]}
                </option>
              ))}
            </select>
          </Field>
          <div className="crm-form-grid">
            {input("source", "Źródło leada", "text", 100)}
            {input("campaign", "Kampania leada")}
          </div>
          <div className="crm-form-grid">
            {input("estimated_value", "Szacowana wartość (PLN)", "number")}
            {input("revenue", "Revenue leada (PLN)", "number")}
          </div>
          <p className="text-sm leading-relaxed text-slate-600">
            Revenue to zapisana wartość przychodu. Otrzymane płatności ją
            zwiększają; możesz też uzupełnić ją ręcznie.
          </p>
          <details className="rounded-xl border border-slate-200/70 p-4">
            <summary className="cursor-pointer font-medium">
              Źródła i UTM (opcjonalnie)
            </summary>
            <div className="mt-4 grid gap-4">
              {input("medium", "Medium leada", "text", 100)}
              {input("keyword", "Słowo kluczowe leada", "text", 500)}
              {input("landing_page", "Landing page leada", "text", 1000)}
              {[
                "utm_source",
                "utm_medium",
                "utm_campaign",
                "utm_term",
                "utm_content",
              ].map((k) => (
                <Field key={k} label={k}>
                  <input
                    maxLength={500}
                    value={draft.utm[k] ?? ""}
                    onChange={(e) =>
                      setDraft((s) => ({
                        ...s,
                        utm: { ...s.utm, [k]: e.target.value },
                      }))
                    }
                  />
                </Field>
              ))}
            </div>
          </details>
          <Field label="Notatki leada">
            <textarea
              rows={4}
              maxLength={5000}
              value={draft.notes}
              onChange={(e) => change("notes", e.target.value)}
            />
          </Field>
        </fieldset>
        <div className="crm-form-actions">
          <button
            type="button"
            disabled={busy}
            className="crm-button secondary"
            onClick={close}
          >
            Anuluj
          </button>
          <button disabled={busy} className="crm-button" type="submit">
            {busy ? "Zapisywanie…" : "Zapisz leada"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
function localNow() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
export function EventForm({
  wid,
  lead,
  close,
  saved,
}: {
  wid: string;
  lead: Lead;
  close: () => void;
  saved: (lead: Lead) => void;
}) {
  const [id] = useState(() => crypto.randomUUID());
  const [type, setType] = useState<EventType>("phone_call"),
    [source, setSource] = useState("Telefon"),
    [date, setDate] = useState(localNow),
    [note, setNote] = useState(""),
    [campaign, setCampaign] = useState(lead.campaign),
    [keyword, setKeyword] = useState(""),
    [landing, setLanding] = useState(lead.landing_page),
    [form, setForm] = useState(""),
    [duration, setDuration] = useState(""),
    [value, setValue] = useState(String(lead.estimated_value)),
    [scheduled, setScheduled] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const financial = [
    "quote_sent",
    "quote_accepted",
    "job_started",
    "job_completed",
    "payment_received",
  ].includes(type);
  async function save(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const metadata: Record<string, string | number> = {};
      if (note.trim()) metadata.note = note.trim();
      if (
        [
          "ad_click",
          "page_view",
          "form_submit",
          "phone_call",
          "whatsapp",
          "email",
          "meeting",
        ].includes(type)
      ) {
        if (campaign) metadata.campaign = campaign;
        if (keyword) metadata.keyword = keyword;
        if (landing) metadata.landing_page = landing;
        for (const [k, v] of Object.entries(lead.utm)) if (v) metadata[k] = v;
      }
      if (type === "form_submit" && form) metadata.form_name = form;
      if (type === "phone_call" && duration !== "")
        metadata.call_duration = Number(duration);
      if (financial) metadata.amount = Number(value);
      if (type === "booking_created" && scheduled)
        metadata.scheduled_at = new Date(scheduled).toISOString();
      const result = await cloudRequest(`/${wid}/leads/${lead.id}/events`, {
        method: "POST",
        body: JSON.stringify({
          id,
          revision: lead.revision,
          event_type: type,
          source,
          timestamp: new Date(date).toISOString(),
          metadata,
        }),
      });
      saved(result.lead);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Nie udało się zapisać zdarzenia.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Dodaj zdarzenie" onClose={() => !busy && close()}>
      <form className="crm-form" onSubmit={save}>
        {error && (
          <p role="alert" className="crm-alert error">
            {error}
          </p>
        )}
        <fieldset disabled={busy} className="grid min-w-0 gap-4 border-0 p-0">
          <Field label="Rodzaj zdarzenia">
            <select
              value={type}
              onChange={(e) => setType(e.target.value as EventType)}
            >
              {EVENT_TYPES.filter(
                (t) =>
                  !["lead_created", "status_change", "lead_updated"].includes(
                    t,
                  ),
              ).map((t) => (
                <option key={t} value={t}>
                  {eventLabels[t]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Źródło zdarzenia">
            <input
              required
              maxLength={100}
              value={source}
              onChange={(e) => setSource(e.target.value)}
            />
          </Field>
          <Field label="Data i godzina zdarzenia">
            <input
              required
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </Field>
          <p className="text-sm leading-relaxed text-slate-600">
            Wpisz czas urządzenia. Oś czasu pokazuje godziny w Europe/Warsaw.
          </p>
          {financial && (
            <Field label="Kwota zdarzenia (PLN)">
              <input
                type="number"
                required
                min={type === "payment_received" ? "0.01" : "0"}
                max="1000000000000"
                step="0.01"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </Field>
          )}
          {type === "payment_received" && (
            <p className="crm-alert">
              Otrzymana płatność zwiększy revenue leada o podaną kwotę. Dodaj ją
              tylko raz.
            </p>
          )}
          {type === "phone_call" && (
            <Field label="Czas rozmowy (sekundy)">
              <input
                type="number"
                min="0"
                max="86400"
                step="1"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </Field>
          )}
          {type === "form_submit" && (
            <Field label="Nazwa formularza">
              <input
                maxLength={200}
                value={form}
                onChange={(e) => setForm(e.target.value)}
              />
            </Field>
          )}
          {type === "booking_created" && (
            <Field label="Umówiony termin (opcjonalnie)">
              <input
                type="datetime-local"
                value={scheduled}
                onChange={(e) => setScheduled(e.target.value)}
              />
            </Field>
          )}
          {[
            "ad_click",
            "page_view",
            "form_submit",
            "phone_call",
            "whatsapp",
            "email",
            "meeting",
          ].includes(type) && (
            <details className="rounded-xl border border-slate-200/70 p-4">
              <summary className="cursor-pointer font-medium">
                Kampania i strona (opcjonalnie)
              </summary>
              <div className="mt-4 grid gap-4">
                <Field label="Kampania zdarzenia">
                  <input
                    maxLength={200}
                    value={campaign}
                    onChange={(e) => setCampaign(e.target.value)}
                  />
                </Field>
                <Field label="Słowo kluczowe zdarzenia">
                  <input
                    maxLength={500}
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                  />
                </Field>
                <Field label="Landing page zdarzenia">
                  <input
                    maxLength={1000}
                    value={landing}
                    onChange={(e) => setLanding(e.target.value)}
                  />
                </Field>
                <p className="text-sm text-slate-600">
                  UTM pochodzą z zapisanej karty leada. Uzupełnij je w edycji
                  leada, jeśli są znane.
                </p>
              </div>
            </details>
          )}
          <Field label="Opis zdarzenia">
            <textarea
              rows={4}
              maxLength={5000}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </Field>
        </fieldset>
        <div className="crm-form-actions">
          <button
            disabled={busy}
            type="button"
            className="crm-button secondary"
            onClick={close}
          >
            Anuluj
          </button>
          <button disabled={busy} className="crm-button" type="submit">
            {busy ? "Zapisywanie…" : "Zapisz zdarzenie"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
