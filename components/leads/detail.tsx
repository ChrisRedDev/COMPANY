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
export const leadMoney = (v: number) =>
  new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    maximumFractionDigits: 2,
  }).format(v);
export const eventDate = (v: string) =>
  new Date(v).toLocaleString("pl-PL", {
    timeZone: "Europe/Warsaw",
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
  campaign: "Kampania",
  keyword: "Słowo kluczowe",
  landing_page: "Strona wejścia",
  call_duration: "Długość rozmowy",
  form_name: "Formularz",
  amount: "Kwota",
  job_value: "Wartość pracy",
  scheduled_at: "Umówiony termin",
  note: "Opis",
  utm_source: "utm_source",
  utm_medium: "utm_medium",
  utm_campaign: "utm_campaign",
  utm_term: "utm_term",
  utm_content: "utm_content",
};
function valueText(key: string, v: Json) {
  if (typeof v === "number" && ["amount", "job_value"].includes(key))
    return leadMoney(v);
  if (key === "call_duration" && typeof v === "number")
    return `${Math.floor(v / 60)}:${String(v % 60).padStart(2, "0")}`;
  if (key === "scheduled_at" && typeof v === "string") return eventDate(v);
  return typeof v === "string" ? v : JSON.stringify(v);
}
function EventItem({ event }: { event: LeadEvent }) {
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
                {valueText(k, m[k])}
              </dd>
            </div>
          ))}
      </dl>
      {more.length > 0 && (
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-violet-600">
            Pozostałe informacje
          </summary>
          <dl className="mt-3 grid gap-2">
            {more.map(([k, v]) => (
              <div key={k} className="min-w-0 break-words">
                <dt className="font-medium">{k}</dt>
                <dd>{valueText(k, v)}</dd>
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
        {value || "Do uzupełnienia"}
      </dd>
    </div>
  );
}
const salesStates: Record<string, string> = {
  sent: "Wysłana",
  accepted: "Przyjęta",
  rejected: "Odrzucona",
  booked: "Zarezerwowana",
  completed: "Zakończona",
  cancelled: "Anulowana",
  in_progress: "W realizacji",
  received: "Otrzymana",
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
            <h3 className="text-lg!">Przegląd leada</h3>
            <button
              disabled={readOnly}
              className="crm-button secondary"
              onClick={edit}
            >
              Edytuj leada
            </button>
          </div>
          <dl className="grid gap-5 sm:grid-cols-2">
            <Fact
              label="Kontakt"
              value={[l.first_name, l.last_name].filter(Boolean).join(" ")}
            />
            <Fact label="Firma" value={l.company_name} />
            <Fact label="E-mail" value={l.email} />
            <Fact label="Telefon" value={l.phone} />
            <Fact label="Status" value={statusLabels[l.status]} />
            <Fact label="Źródło" value={l.source} />
            <Fact
              label="Szacowana wartość"
              value={leadMoney(l.estimated_value)}
            />
            <Fact label="Revenue" value={leadMoney(l.revenue)} />
          </dl>
          <p className="mt-5! text-sm leading-relaxed text-slate-500">
            Revenue to zapis CRM i wpłaty zadeklarowane w zdarzeniach.
            Zakończenie pracy nie oznacza płatności.
          </p>
        </section>
        <section className="crm-card p-6">
          <h3 className="mb-5 text-lg!">Źródła i atrybucja</h3>
          <div className="mb-5 grid gap-3 sm:grid-cols-2">
            <div className="min-w-0 rounded-2xl border border-violet-100 bg-violet-50/60 p-4">
              <p className="text-sm text-violet-600">First touch</p>
              <strong className="mt-2 block break-words">
                {l.first_touch_source || "Źródło nieznane"}
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
                {l.last_touch_source || "Źródło nieznane"}
              </strong>
              {last && (
                <p className="mt-2! text-sm text-slate-600">
                  {eventDate(last.timestamp)}
                </p>
              )}
            </div>
          </div>
          <dl className="grid gap-4">
            <Fact label="Kampania" value={l.campaign} />
            <Fact label="Medium" value={l.medium} />
            <Fact label="Słowo kluczowe" value={l.keyword} />
            <Fact label="Landing page" value={l.landing_page} />
            {Object.entries(l.utm)
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <Fact key={k} label={k} value={v} />
              ))}
          </dl>
          <p className="mt-5! text-sm leading-relaxed text-slate-500">
            First/last touch wynikają z czasu zapisanych interakcji. To
            fundament atrybucji, bez automatycznego śledzenia anonimowych wizyt.
          </p>
        </section>
        <section className="crm-card p-6">
          <h3 className="mb-5 text-lg!">Sprzedaż i realizacja</h3>
          <div className="grid gap-5">
            <div>
              <h4 className="mb-3 font-semibold">
                Oferty ({bundle.quotes.length})
              </h4>
              {bundle.quotes.length ? (
                bundle.quotes.slice(-3).map((q) => (
                  <p key={q.id} className="mb-2! text-sm leading-relaxed">
                    {leadMoney(q.amount)} · {salesStates[q.status]} ·{" "}
                    {eventDate(q.created_at)}
                  </p>
                ))
              ) : (
                <p className="text-sm text-slate-500">
                  Zapisz zdarzenie „Wysłana oferta”.
                </p>
              )}
            </div>
            <div>
              <h4 className="mb-3 font-semibold">
                Rezerwacje ({bundle.appointments.length})
              </h4>
              {bundle.appointments.length ? (
                bundle.appointments.slice(-3).map((a) => (
                  <p key={a.id} className="mb-2! text-sm leading-relaxed">
                    {salesStates[a.status]} ·{" "}
                    {a.scheduled_at
                      ? eventDate(a.scheduled_at)
                      : "Termin do uzupełnienia"}
                  </p>
                ))
              ) : (
                <p className="text-sm text-slate-500">
                  Zapisz zdarzenie „Rezerwacja”.
                </p>
              )}
            </div>
            <div>
              <h4 className="mb-3 font-semibold">
                Prace ({bundle.jobs.length})
              </h4>
              {bundle.jobs.length ? (
                bundle.jobs.slice(-3).map((j) => (
                  <p key={j.id} className="mb-2! text-sm leading-relaxed">
                    {leadMoney(j.amount)} · {salesStates[j.status]}
                  </p>
                ))
              ) : (
                <p className="text-sm text-slate-500">
                  Rozpoczęcie i zakończenie pracy zapiszesz w zdarzeniach.
                </p>
              )}
            </div>
            <div>
              <h4 className="mb-3 font-semibold">
                Wpłaty ({bundle.payments.length})
              </h4>
              {bundle.payments.length ? (
                bundle.payments.slice(-3).map((p) => (
                  <p key={p.id} className="mb-2! text-sm leading-relaxed">
                    {leadMoney(p.amount)} · {eventDate(p.timestamp)}
                  </p>
                ))
              ) : (
                <p className="text-sm text-slate-500">
                  Nie zapisano otrzymanej płatności.
                </p>
              )}
            </div>
          </div>
          <p className="mt-5! text-sm text-slate-500">
            Ostatnie 3 rekordy każdego rodzaju. Pełna historia jest na osi
            czasu. Zlecenia w trybie usługowym pozostają osobnym modułem.
          </p>
        </section>
        <section className="crm-card p-6">
          <h3 className="mb-4 text-lg!">Notatki CRM</h3>
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-slate-700">
            {l.notes || "Dodaj ustalenia i kontekst w edycji leada."}
          </p>
        </section>
      </div>
      <section className="crm-card min-w-0 self-start p-6">
        <div className="mb-5 flex flex-wrap justify-between gap-3">
          <div>
            <h3 className="text-xl!">Oś kontaktu</h3>
            <p className="mt-2! text-sm text-slate-500">
              {bundle.events.length} zdarzeń · Europe/Warsaw
            </p>
          </div>
          <button disabled={readOnly} className="crm-button" onClick={addEvent}>
            <Icon name="plus" size={18} />
            Dodaj zdarzenie
          </button>
        </div>
        <select
          aria-label="Kolejność osi czasu"
          className="mb-6 w-full sm:w-auto"
          value={order}
          onChange={(e) => {
            setOrder(e.target.value);
            setLimit(50);
          }}
        >
          <option value="oldest">Od najstarszych</option>
          <option value="newest">Od najnowszych</option>
        </select>
        <ol aria-label="Historia kontaktu leada" className="ml-1 grid">
          {events.slice(0, limit).map((e) => (
            <EventItem key={e.id} event={e} />
          ))}
        </ol>
        {!events.length && (
          <p className="text-sm text-slate-600">
            Pierwsze zdarzenie zapiszesz przyciskiem powyżej.
          </p>
        )}
        {events.length > limit && (
          <button
            className="crm-button secondary mt-6"
            onClick={() => setLimit((l) => l + 50)}
          >
            Pokaż kolejne zdarzenia ({events.length - limit})
          </button>
        )}
      </section>
    </div>
  );
}
