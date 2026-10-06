"use client";
import { useState } from "react";
import {
  PLUMBING_PIPELINE,
  statusLabels,
  type Lead,
  type LeadStatus,
} from "@/lib/leads/model";
import { Field } from "../crm/ui";
export default function Pipeline({
  wid,
  lead,
  readOnly,
  saved,
}: {
  wid: string;
  lead: Lead;
  readOnly: boolean;
  saved: (lead: Lead) => void;
}) {
  const [stage, setStage] = useState<LeadStatus>(lead.status),
    [amount, setAmount] = useState(String(lead.estimated_value)),
    [scheduled, setScheduled] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function save() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/plumbing/${wid}/stage/${lead.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: stage,
          revision: lead.revision,
          amount: Number(amount),
          ...(scheduled
            ? { scheduled_at: new Date(scheduled).toISOString() }
            : {}),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.error);
      saved(data.lead);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update stage.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="plumbing-card">
      <div className="plumbing-card-heading">
        <h2>Plumbing pipeline</h2>
        <span className="plumbing-chip">{statusLabels[lead.status]}</span>
      </div>
      <div className="plumbing-pipeline">
        {PLUMBING_PIPELINE.map((s) => (
          <button
            disabled={readOnly || busy}
            key={s}
            className={s === stage ? "active" : ""}
            onClick={() => setStage(s)}
            aria-pressed={s === stage}
          >
            {statusLabels[s]}
          </button>
        ))}
      </div>
      <div className="plumbing-stage-actions">
        {["quote", "in_progress", "completed", "paid"].includes(stage) && (
          <Field label={`Amount (${lead.currency ?? "PLN"})`}>
            <input
              type="number"
              min={stage === "paid" ? 0.01 : 0}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={busy || readOnly}
            />
          </Field>
        )}
        {stage === "booked" && (
          <Field label="Booked for (device time)">
            <input
              type="datetime-local"
              value={scheduled}
              onChange={(e) => setScheduled(e.target.value)}
              disabled={busy || readOnly}
            />
          </Field>
        )}
        <button
          className="crm-button"
          onClick={() => void save()}
          disabled={busy || readOnly || stage === lead.status}
        >
          {busy ? "Saving…" : "Save stage"}
        </button>
        <p className="plumbing-note">
          Stage changes save a dated event. Paid records an actual payment;
          enter the amount received.
        </p>
      </div>
      {error && (
        <p className="crm-alert error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
