"use client";
import { useState } from "react";
import {
  eventLabels,
  statusLabels,
  LEAD_STATUSES,
  type LeadBundle,
  type LeadEvent,
  type Json,
  type LeadStatus,
} from "@/lib/leads/model";
import { Badge, Icon } from "../crm/ui";
export const leadMoney = (v: number, currency = "GBP") =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(v);
export const eventDate = (v: string) =>
  new Date(v).toLocaleString("en-GB", {
    timeZone: "Europe/London",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
const stateLabel = (v: Json | undefined) =>
  typeof v === "string" && LEAD_STATUSES.includes(v as LeadStatus)
    ? statusLabels[v as LeadStatus]
    : "";
const metadataLabels: Record<string, string> = {
  campaign: "Campaign",
  keyword: "Keyword",
  landing_page: "Landing page",
  call_duration: "Call duration",
  call_outcome: "Call outcome",
  called_number: "Number dialled",
  form_name: "Form",
  amount: "Amount",
  job_value: "Job value",
  scheduled_at: "Scheduled time",
  note: "Description",
  utm_source: "utm_source",
  utm_medium: "utm_medium",
  utm_campaign: "utm_campaign",
  utm_term: "utm_term",
  utm_content: "utm_content",
};
function valueText(key: string, v: Json, currency: string) {
  if (typeof v === "number" && ["amount", "job_value"].includes(key))
    return leadMoney(v, currency);
  if (key === "call_duration" && typeof v === "number")
    return `${Math.floor(v / 60)}:${String(v % 60).padStart(2, "0")}`;
  if (key === "scheduled_at" && typeof v === "string") return eventDate(v);
  return typeof v === "string" ? v : JSON.stringify(v);
}
function EventItem({
  event,
  currency,
}: {
  event: LeadEvent;
  currency: string;
}) {
  const m = event.metadata;
  const more = Object.entries(m).filter(
    ([k, v]) =>
      !metadataLabels[k] &&
      !["status", "previous_status", "changed"].includes(k) &&
      v !== null &&
      v !== "",
  );
  return (
    <li className="relative min-w-0 border-l-2 border-violet-100 pb-7 pl-6 last:pb-0">
      <span className="absolute top-1 -left-[7px] size-3 rounded-full border-2 border-white bg-violet-500" />
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <time className="text-sm text-slate-600" dateTime={event.timestamp}>
          {eventDate(event.timestamp)}
        </time>
        <Badge tone="purple">{event.source}</Badge>
      </div>
      <h3 className="text-base! font-semibold! text-slate-800">
        {eventLabels[event.event_type]}
      </h3>
      {stateLabel(m.status) && (
        <p className="mt-2! text-sm leading-relaxed">
          {stateLabel(m.previous_status)
            ? `${stateLabel(m.previous_status)} → `
            : ""}
          {stateLabel(m.status)}
        </p>
      )}
      <dl className="mt-3 grid gap-2 text-sm leading-relaxed">
        {Object.entries(metadataLabels)
          .filter(([k]) => m[k] !== undefined && m[k] !== null && m[k] !== "")
          .map(([k, label]) => (
            <div
              key={k}
              className="grid min-w-0 gap-1 sm:grid-cols-[9em_minmax(0,1fr)]"
            >
              <dt className="text-slate-500">{label}</dt>
              <dd className="min-w-0 break-words whitespace-pre-wrap text-slate-700">
                {valueText(k, m[k], currency)}
              </dd>
            </div>
          ))}
      </dl>
      {more.length > 0 && (
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-violet-600">
            Additional information
          </summary>
          <dl className="mt-3 grid gap-2">
            {more.map(([k, v]) => (
              <div key={k} className="min-w-0 break-words">
                <dt className="font-medium">{k}</dt>
                <dd>{valueText(k, v, currency)}</dd>
              </div>
            ))}
          </dl>
        </details>
      )}
    </li>
  );
}
function Fact({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-w-0">
      <dt className="mb-1 text-sm text-slate-500">{label}</dt>
      <dd className="font-medium break-words text-slate-800">
        {value || "Not recorded"}
      </dd>
    </div>
  );
}
const salesStates: Record<string, string> = {
  sent: "Sent",
  accepted: "Accepted",
  rejected: "Declined",
  booked: "Booked",
  completed: "Completed",
  cancelled: "Cancelled",
  in_progress: "In progress",
  received: "Received",
};
export default function LeadDetail({
  bundle,
  readOnly,
  edit,
  addEvent,
}: {
  bundle: LeadBundle;
  readOnly: boolean;
  edit: () => void;
  addEvent: () => void;
}) {
  const l = bundle.lead,
    [order, setOrder] = useState("oldest"),
    [limit, setLimit] = useState(50);
  const events =
    order === "oldest" ? bundle.events : [...bundle.events].reverse();
  const first = bundle.touchpoints[0],
    last = bundle.touchpoints.at(-1);
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,.95fr)_minmax(0,1.3fr)]">
      <div className="grid min-w-0 content-start gap-5">
        <section className="crm-card p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg!">Enquiry overview</h3>
            <button
              disabled={readOnly}
              className="crm-button secondary"
              onClick={edit}
            >
              Edit enquiry
            </button>
          </div>
          <dl className="grid gap-5 sm:grid-cols-2">
            <Fact
              label="Contact"
              value={[l.first_name, l.last_name].filter(Boolean).join(" ")}
            />
            <Fact label="Company" value={l.company_name} />
            <Fact label="E-mail" value={l.email} />
            <Fact label="Phone" value={l.phone} />
            <Fact label="Status" value={statusLabels[l.status]} />
            <Fact label="Postcode" value={l.postcode ?? ""} />
            <Fact label="Service" value={l.service ?? ""} />
            <Fact
              label="Urgency"
              value={l.urgency?.replaceAll("_", " ") ?? ""}
            />
            <Fact label="Contact channel" value={l.channel ?? ""} />
            <Fact label="Plumbing problem" value={l.problem ?? ""} />
            <Fact label="Source" value={l.source} />
            <Fact
              label="Estimated quote"
              value={leadMoney(l.estimated_value, l.currency ?? "PLN")}
            />
            <Fact
              label="Revenue"
              value={leadMoney(l.revenue, l.currency ?? "PLN")}
            />
          </dl>
          <p className="mt-5! text-sm leading-relaxed text-slate-500">
            Revenue includes the opening CRM balance and recorded payments.
            Completed work does not establish payment.
          </p>
        </section>
        <section className="crm-card p-6">
          <h3 className="mb-5 text-lg!">Source & attribution</h3>
          <div className="mb-5 grid gap-3 sm:grid-cols-2">
            <div className="min-w-0 rounded-2xl border border-violet-100 bg-violet-50/60 p-4">
              <p className="text-sm text-violet-600">First touch</p>
              <strong className="mt-2 block break-words">
                {l.first_touch_source || "Unknown source"}
              </strong>
              {first && (
                <p className="mt-2! text-sm text-slate-600">
                  {eventDate(first.timestamp)}
                </p>
              )}
            </div>
            <div className="min-w-0 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
              <p className="text-sm text-emerald-700">Last touch</p>
              <strong className="mt-2 block break-words">
                {l.last_touch_source || "Unknown source"}
              </strong>
              {last && (
                <p className="mt-2! text-sm text-slate-600">
                  {eventDate(last.timestamp)}
                </p>
              )}
            </div>
          </div>
          <dl className="grid gap-4">
            <Fact label="Campaign" value={l.campaign} />
            <Fact label="Medium" value={l.medium} />
            <Fact label="Keyword" value={l.keyword} />
            <Fact label="Landing page" value={l.landing_page} />
            {Object.entries(l.utm)
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <Fact key={k} label={k} value={v} />
              ))}
          </dl>
          <p className="mt-5! text-sm leading-relaxed text-slate-500">
            First and last touch come from recorded interactions; anonymous
            visits are not tracked automatically.
          </p>
        </section>
        <section className="crm-card p-6">
          <h3 className="mb-5 text-lg!">Quotes, jobs & payments</h3>
          <div className="grid gap-5">
            <div>
              <h4 className="mb-3 font-semibold">
                Quotes ({bundle.quotes.length})
              </h4>
              {bundle.quotes.length ? (
                bundle.quotes.slice(-3).map((q) => (
                  <p key={q.id} className="mb-2! text-sm leading-relaxed">
                    {leadMoney(q.amount, q.currency)} · {salesStates[q.status]}{" "}
                    · {eventDate(q.created_at)}
                  </p>
                ))
              ) : (
                <p className="text-sm text-slate-500">
                  Record a quote using Add event or the Quote Sent stage.
                </p>
              )}
            </div>
            <div>
              <h4 className="mb-3 font-semibold">
                Bookings ({bundle.appointments.length})
              </h4>
              {bundle.appointments.length ? (
                bundle.appointments.slice(-3).map((a) => (
                  <p key={a.id} className="mb-2! text-sm leading-relaxed">
                    {salesStates[a.status]} ·{" "}
                    {a.scheduled_at
                      ? eventDate(a.scheduled_at)
                      : "Time not recorded"}
                  </p>
                ))
              ) : (
                <p className="text-sm text-slate-500">
                  Record a booking using Add event or the Booked stage.
                </p>
              )}
            </div>
            <div>
              <h4 className="mb-3 font-semibold">
                Jobs ({bundle.jobs.length})
              </h4>
              {bundle.jobs.length ? (
                bundle.jobs.slice(-3).map((j) => (
                  <p key={j.id} className="mb-2! text-sm leading-relaxed">
                    {leadMoney(j.amount, j.currency)} · {salesStates[j.status]}
                  </p>
                ))
              ) : (
                <p className="text-sm text-slate-500">
                  Record job start and completion using Add event or the
                  pipeline.
                </p>
              )}
            </div>
            <div>
              <h4 className="mb-3 font-semibold">
                Payments ({bundle.payments.length})
              </h4>
              {bundle.payments.length ? (
                bundle.payments.slice(-3).map((p) => (
                  <p key={p.id} className="mb-2! text-sm leading-relaxed">
                    {leadMoney(p.amount, p.currency)} · {eventDate(p.timestamp)}
                  </p>
                ))
              ) : (
                <p className="text-sm text-slate-500">
                  No received payments recorded.
                </p>
              )}
            </div>
          </div>
          <p className="mt-5! text-sm text-slate-500">
            The latest three records of each type. See the timeline for complete
            history. The job planner uses separate service bookings.
          </p>
        </section>
        <section className="crm-card p-6">
          <h3 className="mb-4 text-lg!">Notes CRM</h3>
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-slate-700">
            {l.notes || "Dodaj ustalenia i kontekst w edycji leada."}
          </p>
        </section>
      </div>
      <section className="crm-card min-w-0 self-start p-6">
        <div className="mb-5 flex flex-wrap justify-between gap-3">
          <div>
            <h3 className="text-xl!">Customer timeline</h3>
            <p className="mt-2! text-sm text-slate-500">
              {bundle.events.length} events · Europe/London
            </p>
          </div>
          <button disabled={readOnly} className="crm-button" onClick={addEvent}>
            <Icon name="plus" size={18} />
            Add event
          </button>
        </div>
        <select
          aria-label="Timeline order"
          className="mb-6 w-full sm:w-auto"
          value={order}
          onChange={(e) => {
            setOrder(e.target.value);
            setLimit(50);
          }}
        >
          <option value="oldest">Oldest first</option>
          <option value="newest">Newest first</option>
        </select>
        <ol aria-label="Customer history" className="ml-1 grid">
          {events.slice(0, limit).map((e) => (
            <EventItem key={e.id} event={e} currency={l.currency ?? "PLN"} />
          ))}
        </ol>
        {!events.length && (
          <p className="text-sm text-slate-600">
            Use Add event to record the first interaction.
          </p>
        )}
        {events.length > limit && (
          <button
            className="crm-button secondary mt-6"
            onClick={() => setLimit((l) => l + 50)}
          >
            Show more events ({events.length - limit})
          </button>
        )}
      </section>
    </div>
  );
}
