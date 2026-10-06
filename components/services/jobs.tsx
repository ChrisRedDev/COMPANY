"use client";
import { useState } from "react";
import { useCrm } from "@/stores/crm-store";
import {
  SERVICE_STATUSES,
  serviceLabels,
  dateLabel,
  money,
  type Deal,
  type ServiceStatus,
} from "@/lib/crm/model";
import { bookingConflict } from "@/lib/crm/services";
import { Icon, Badge, Empty } from "../crm/ui";
export function bookingTime(value: string) {
  return `${dateLabel(value.slice(0, 10))} · ${value.slice(11)}`;
}
export default function Jobs({
  query,
  openJob,
  notify,
  openClients,
}: {
  query: string;
  openJob: (d?: Deal) => void;
  notify: (text: string) => void;
  openClients: () => void;
}) {
  const s = useCrm(),
    [filter, setFilter] = useState("active");
  const jobs = s.deals
    .filter(
      (d) =>
        d.service &&
        (filter === "all" ||
          (filter === "active" &&
            ["booked", "in_progress"].includes(d.service.status)) ||
          filter === d.service.status) &&
        `${d.name} ${s.firms.find((f) => f.id === d.companyId)?.name} ${d.service.resource}`
          .toLocaleLowerCase("pl")
          .includes(query.toLocaleLowerCase("pl")),
    )
    .sort((a, b) => a.service!.start.localeCompare(b.service!.start));
  function change(d: Deal, status: ServiceStatus) {
    const next = { ...d.service!, status };
    if (bookingConflict(s.deals, next, d.id)) {
      notify("Due date zajęty. Zmień datę lub osobę przed wznowieniem zlecenia.");
      return;
    }
    s.saveDeal({
      ...d,
      stage: status === "cancelled" ? "Przegrana" : "Wygrana",
      probability: status === "cancelled" ? 0 : 100,
      service: {
        ...next,
        history: [
          ...next.history,
          {
            at: new Date().toISOString(),
            message: `Status: ${serviceLabels[status]}`,
          },
        ].slice(-200),
      },
    });
    notify(`Zlecenie: ${serviceLabels[status].toLocaleLowerCase("pl")}.`);
  }
  return (
    <div className="grid gap-5">
      <div className="crm-toolbar">
        <div className="crm-inline">
          <select
            aria-label="Filtr zleceń"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="active">Zaplanowane i w realizacji</option>
            <option value="all">Wszystkie prace</option>
            {SERVICE_STATUSES.map((k) => (
              <option key={k} value={k}>
                {serviceLabels[k]}
              </option>
            ))}
          </select>
          <span className="crm-muted">{jobs.length} zleceń</span>
        </div>
        <button
          className="crm-button"
          onClick={() => (s.firms.length ? openJob() : openClients())}
        >
          <Icon name="plus" />
          {s.firms.length ? "Zarezerwuj pracę" : "Add customer"}
        </button>
      </div>
      {!jobs.length && (
        <section className="crm-card">
          <Empty
            title="Miejsce na kolejną realizację"
            description={
              s.firms.length
                ? "Choose klienta, usługę i termin. Completed prace pozostaną w historii."
                : "Najpierw dodaj klienta z kontaktem. Potem zarezerwuj dla niego pracę."
            }
            action={
              <button
                className="crm-button"
                onClick={() => (s.firms.length ? openJob() : openClients())}
              >
                {s.firms.length
                  ? "Dodaj pierwsze zlecenie"
                  : "Dodaj pierwszego klienta"}
              </button>
            }
          />
        </section>
      )}
      {jobs.map((d) => (
        <article className="crm-card p-6" key={d.id}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="crm-eyebrow">
                {s.firms.find((f) => f.id === d.companyId)?.name}
              </span>
              <h3 className="text-xl!">{d.name}</h3>
              <p className="crm-muted mt-2">
                {bookingTime(d.service!.start)} → {bookingTime(d.service!.end)}
                <br />
                {d.service!.resource}
                {d.service!.location && ` · ${d.service!.location}`}
              </p>
            </div>
            <div className="grid justify-items-end gap-2">
              <Badge
                tone={
                  d.service!.status === "completed"
                    ? "green"
                    : d.service!.status === "cancelled"
                      ? "neutral"
                      : "purple"
                }
              >
                {serviceLabels[d.service!.status]}
              </Badge>
              <strong className="text-xl">{money(d.value)}</strong>
            </div>
          </div>
          {d.service!.notes && (
            <p className="mt-4 text-sm whitespace-pre-wrap text-slate-600">
              {d.service!.notes}
            </p>
          )}
          <div className="mt-5 flex flex-wrap gap-2">
            <button className="crm-button secondary" onClick={() => openJob(d)}>
              Edit zlecenie
            </button>
            {d.service!.status === "booked" && (
              <button
                className="crm-button"
                onClick={() => change(d, "in_progress")}
              >
                Rozpocznij pracę
              </button>
            )}
            {["booked", "in_progress"].includes(d.service!.status) && (
              <>
                <button
                  className="crm-button secondary"
                  onClick={() => change(d, "completed")}
                >
                  Zakończ pracę
                </button>
                <button
                  className="crm-text-button"
                  onClick={() => change(d, "cancelled")}
                >
                  Cancel rezerwację
                </button>
              </>
            )}
          </div>
          <details className="mt-5 border-t border-slate-200/60 pt-4">
            <summary className="cursor-pointer text-sm font-medium">
              Historia zlecenia ({d.service!.history.length})
            </summary>
            <ol className="service-timeline mt-4">
              {[...d.service!.history].reverse().map((event, i) => (
                <li key={i}>
                  <time>
                    {new Date(event.at).toLocaleString("en-GB", {
                      timeZone: "Europe/London",
                    })}
                  </time>
                  <p>{event.message}</p>
                </li>
              ))}
            </ol>
          </details>
        </article>
      ))}
    </div>
  );
}
