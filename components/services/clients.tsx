"use client";
import { useState } from "react";
import { useCrm } from "@/stores/crm-store";
import { money, serviceLabels, type Firm, type Deal } from "@/lib/crm/model";
import { serviceTotals } from "@/lib/crm/services";
import { bookingTime } from "./jobs";
import { Empty, Icon, Modal, Badge } from "../crm/ui";
export default function Clients({
  query,
  edit,
  openJob,
  notify,
}: {
  query: string;
  edit: (f?: Firm) => void;
  openJob: (d?: Deal, companyId?: string) => void;
  notify: (s: string) => void;
}) {
  const s = useCrm(),
    [selectedId, setSelected] = useState("");
  const selected = s.firms.find((f) => f.id === selectedId);
  const visible = s.firms.filter((f) =>
    `${f.name} ${f.email || ""} ${f.phone || ""} ${f.city}`
      .toLocaleLowerCase("pl")
      .includes(query.toLocaleLowerCase("pl")),
  );
  const jobs = selected
    ? s.deals
        .filter((d) => d.companyId === selected.id && d.service)
        .sort((a, b) => b.service!.start.localeCompare(a.service!.start))
    : [];
  return (
    <div className="grid gap-5">
      <div className="crm-toolbar">
        <p className="crm-muted">
          {visible.length} klientów · kontakt, ustalenia i realizacje
        </p>
        <button className="crm-button" onClick={() => edit()}>
          <Icon name="plus" />
          Add customer
        </button>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map((f, i) => {
          const stats = serviceTotals(
              s.deals.filter((d) => d.companyId === f.id),
            ),
            contact = s.contacts.find((c) => c.companyId === f.id);
          return (
            <button
              className="crm-card service-client-card"
              key={f.id}
              onClick={() => setSelected(f.id)}
            >
              <span className={`crm-avatar tone-${i % 4}`}>
                {f.name.slice(0, 2).toUpperCase()}
              </span>
              <h3>{f.name}</h3>
              <p>{f.city || "Lokalizacja do uzupełnienia"}</p>
              <p>
                {f.phone ||
                  contact?.phone ||
                  f.email ||
                  contact?.email ||
                  "Dodaj dane kontaktowe"}
              </p>
              <div className="service-client-summary">
                <span>
                  <b>{stats.active.length}</b> zaplanowanych
                </span>
                <span>
                  <b>{stats.completed.length}</b> zakończonych
                </span>
              </div>
              <span className="crm-text-button">
                Open kartę klienta <Icon name="arrow" size={16} />
              </span>
            </button>
          );
        })}
      </div>
      {!visible.length && (
        <section className="crm-card">
          <Empty
            title="Zacznij od swojego klienta"
            description="Osoba prywatna lub firma. Save kontakt, notatki i pierwszą rezerwację pracy."
            action={
              <button className="crm-button" onClick={() => edit()}>
                Dodaj pierwszego klienta
              </button>
            }
          />
        </section>
      )}
      {selected && (
        <Modal
          title={`Customer: ${selected.name}`}
          wide
          onClose={() => setSelected("")}
        >
          <div className="grid gap-5 p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <span className="crm-eyebrow">KARTA KLIENTA</span>
                <h2>{selected.name}</h2>
                <p className="crm-muted">
                  {selected.address || selected.city} ·{" "}
                  {selected.phone || "Phone do uzupełnienia"}
                </p>
                {selected.email && (
                  <a
                    href={`mailto:${selected.email}`}
                    className="crm-text-button"
                  >
                    {selected.email}
                  </a>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  className="crm-button secondary"
                  onClick={() => {
                    edit(selected);
                    setSelected("");
                  }}
                >
                  Edit klienta
                </button>
                <button
                  className="crm-button"
                  onClick={() => {
                    openJob(undefined, selected.id);
                    setSelected("");
                  }}
                >
                  Zarezerwuj pracę
                </button>
              </div>
            </div>
            {selected.notes && (
              <div className="rounded-xl bg-violet-50/70 p-4">
                <h3>Ustalenia i notatki</h3>
                <p className="mt-2 text-sm whitespace-pre-wrap">
                  {selected.notes}
                </p>
              </div>
            )}
            <section>
              <h3>Historia współpracy</h3>
              <p className="crm-muted mb-4">
                Bookings i realizacje tego klienta. Wartości zleceń nie są
                potwierdzeniem płatności.
              </p>
              <div className="grid gap-3">
                {jobs.map((d) => (
                  <button
                    key={d.id}
                    className="rounded-xl border border-slate-200/70 bg-white/60 p-4 text-left"
                    onClick={() => {
                      openJob(d);
                      setSelected("");
                    }}
                  >
                    <div className="flex flex-wrap justify-between gap-2">
                      <strong>{d.name}</strong>
                      <Badge
                        tone={
                          d.service!.status === "completed" ? "green" : "purple"
                        }
                      >
                        {serviceLabels[d.service!.status]}
                      </Badge>
                    </div>
                    <p className="crm-muted mt-2">
                      {bookingTime(d.service!.start)} · {money(d.value)}
                    </p>
                  </button>
                ))}
                {!jobs.length && (
                  <p className="crm-muted">
                    Pierwsze zlecenie pojawi się tutaj po zapisaniu rezerwacji.
                  </p>
                )}
              </div>
            </section>
            <button
              className="crm-text-button justify-self-start text-red-600!"
              onClick={() => {
                if (
                  confirm(
                    `Usunąć klienta „${selected.name}” z jego zleceniami i zadaniami?`,
                  )
                ) {
                  s.deleteFirm(selected.id);
                  setSelected("");
                  notify("Customer i jego powiązane dane zostały usunięte.");
                }
              }}
            >
              Delete klienta i powiązane dane
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
