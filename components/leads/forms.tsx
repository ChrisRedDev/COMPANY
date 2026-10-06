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
import { SERVICES } from "@/lib/plumbing/model";
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
      ? parseLead({ ...lead, currency: lead.currency ?? "PLN" })
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
          postcode: "",
          service: "",
          urgency: "planned",
          channel: "call",
          problem: "",
          currency: "GBP",
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
        value={String(draft[key] ?? "")}
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
      setError(e instanceof Error ? e.message : "Could not save enquiry.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={lead ? "Edit enquiry" : "Add enquiry"}
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
            Enter a name or contact. Matching phone/email details open the
            existing enquiry.
          </p>
          <div className="crm-form-grid">
            {input("first_name", "First name", "text", 100)}
            {input("last_name", "Last name", "text", 100)}
          </div>
          <div className="crm-form-grid">
            {input("postcode", "UK postcode", "text", 10)}
            <Field label="Service">
              <select
                value={draft.service ?? ""}
                onChange={(e) => change("service", e.target.value)}
              >
                <option value="">Choose service</option>
                {SERVICES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
          </div>
          <div className="crm-form-grid">
            <Field label="Contact channel">
              <select
                value={draft.channel ?? "call"}
                onChange={(e) => change("channel", e.target.value)}
              >
                {[
                  "call",
                  "form",
                  "whatsapp",
                  "website",
                  "email",
                  "referral",
                ].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Urgency">
              <select
                value={draft.urgency ?? "planned"}
                onChange={(e) => change("urgency", e.target.value)}
              >
                <option value="emergency">Emergency</option>
                <option value="same_day">Same day request</option>
                <option value="planned">Planned work</option>
              </select>
            </Field>
          </div>
          {input("problem", "Plumbing problem", "text", 2000)}
          {input("company_name", "Company (optional)")}
          <div className="crm-form-grid">
            {input("email", "Customer email", "email", 254)}
            {input("phone", "Caller phone", "tel", 50)}
          </div>
          <Field label="Stage">
            <select
              value={draft.status}
              disabled={Boolean(lead)}
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
            {input("source", "Acquisition source", "text", 100)}
            {input("campaign", "Acquisition campaign")}
          </div>
          <div className="crm-form-grid">
            {input("estimated_value", "Estimated quote value (GBP)", "number")}
            <Field label="Received revenue">
              <output>
                {new Intl.NumberFormat("en-GB", {
                  style: "currency",
                  currency: draft.currency ?? "GBP",
                }).format(draft.revenue)}
              </output>
            </Field>
          </div>
          <p className="text-sm leading-relaxed text-slate-600">
            Received revenue is measured from payment events. Use Add event or
            the Paid stage to record money received.
          </p>
          <details className="rounded-xl border border-slate-200/70 p-4">
            <summary className="cursor-pointer font-medium">
              Attribution & UTM (optional)
            </summary>
            <div className="mt-4 grid gap-4">
              {input("medium", "Acquisition medium", "text", 100)}
              {input("keyword", "Keyword", "text", 500)}
              {input("landing_page", "Landing page", "text", 1000)}
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
          <Field label="Customer notes">
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
            Cancel
          </button>
          <button disabled={busy} className="crm-button" type="submit">
            {busy ? "Saving…" : "Save enquiry"}
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
    [source, setSource] = useState("Phone"),
    [date, setDate] = useState(localNow),
    [note, setNote] = useState(""),
    [campaign, setCampaign] = useState(lead.campaign),
    [keyword, setKeyword] = useState(""),
    [landing, setLanding] = useState(lead.landing_page),
    [form, setForm] = useState(""),
    [duration, setDuration] = useState(""),
    [outcome, setOutcome] = useState("answered"),
    [called, setCalled] = useState("07392 234913"),
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
      if (type === "phone_call") {
        metadata.call_outcome = outcome;
        metadata.called_number = called;
        if (outcome === "missed") metadata.call_duration = 0;
      }
      if (financial) {
        metadata.amount = Number(value);
        metadata.currency = lead.currency ?? "PLN";
      }
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
      setError(e instanceof Error ? e.message : "Could not save event.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Add event" onClose={() => !busy && close()}>
      <form className="crm-form" onSubmit={save}>
        {error && (
          <p role="alert" className="crm-alert error">
            {error}
          </p>
        )}
        <fieldset disabled={busy} className="grid min-w-0 gap-4 border-0 p-0">
          <Field label="Event type">
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
          <Field label="Event source">
            <input
              required
              maxLength={100}
              value={source}
              onChange={(e) => setSource(e.target.value)}
            />
          </Field>
          <Field label="Event time">
            <input
              required
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </Field>
          <p className="text-sm leading-relaxed text-slate-600">
            Enter your device time. The timeline displays Europe/London time.
          </p>
          {financial && (
            <Field label={`Event amount (${lead.currency ?? "PLN"})`}>
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
              This records money actually received. Enter the payment once.
            </p>
          )}
          {type === "phone_call" && (
            <div className="crm-form-grid">
              <Field label="Call outcome">
                <select
                  value={outcome}
                  onChange={(e) => setOutcome(e.target.value)}
                >
                  <option value="answered">Answered</option>
                  <option value="missed">Missed</option>
                </select>
              </Field>
              <Field label="Number dialled">
                <input
                  value={called}
                  onChange={(e) => setCalled(e.target.value)}
                  maxLength={50}
                />
              </Field>
            </div>
          )}
          {type === "phone_call" && (
            <Field label="Call duration (seconds)">
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
            <Field label="Form name">
              <input
                maxLength={200}
                value={form}
                onChange={(e) => setForm(e.target.value)}
              />
            </Field>
          )}
          {type === "booking_created" && (
            <Field label="Booked time (optional)">
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
                Campaign and page (optional)
              </summary>
              <div className="mt-4 grid gap-4">
                <Field label="Event campaign">
                  <input
                    maxLength={200}
                    value={campaign}
                    onChange={(e) => setCampaign(e.target.value)}
                  />
                </Field>
                <Field label="Event keyword">
                  <input
                    maxLength={500}
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                  />
                </Field>
                <Field label="Event landing page">
                  <input
                    maxLength={1000}
                    value={landing}
                    onChange={(e) => setLanding(e.target.value)}
                  />
                </Field>
                <p className="text-sm text-slate-600">
                  UTM values come from the saved enquiry. Edit the lead to add
                  known attribution values.
                </p>
              </div>
            </details>
          )}
          <Field label="Event note">
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
            Cancel
          </button>
          <button disabled={busy} className="crm-button" type="submit">
            {busy ? "Saving…" : "Save event"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
