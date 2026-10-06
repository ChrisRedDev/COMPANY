"use client";
import { useState } from "react";
import { useCrm } from "@/stores/crm-store";
import {
  SERVICE_STATUSES,
  serviceLabels,
  id,
  offsetDate,
  type Deal,
  type ServiceStatus,
} from "@/lib/crm/model";
import { validateBooking, bookingConflict } from "@/lib/crm/services";
import { Modal, Field } from "../crm/ui";
export default function JobForm({
  item,
  companyId,
  close,
  saved,
}: {
  item?: Deal;
  companyId?: string;
  close: () => void;
  saved: () => void;
}) {
  const s = useCrm(),
    b = item?.service;
  const [client, setClient] = useState(
      item?.companyId || companyId || s.firms[0]?.id || "",
    ),
    [name, setName] = useState(item?.name || ""),
    [value, setValue] = useState(item ? String(item.value) : ""),
    [start, setStart] = useState(b?.start || `${offsetDate(1)}T09:00`),
    [end, setEnd] = useState(b?.end || `${offsetDate(1)}T10:00`),
    [status, setStatus] = useState<ServiceStatus>(b?.status || "booked"),
    [resource, setResource] = useState(b?.resource || "Główny kalendarz"),
    [location, setLocation] = useState(b?.location || ""),
    [notes, setNotes] = useState(b?.notes || ""),
    [error, setError] = useState("");
  function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      if (
        !name.trim() ||
        !s.firms.some((f) => f.id === client) ||
        !value ||
        !Number.isFinite(Number(value)) ||
        Number(value) < 0 ||
        Number(value) > 1e12
      )
        throw Error("Choose klienta, nazwę pracy i wartość w PLN.");
      const changes: string[] = [];
      if (!b) changes.push("Utworzono zlecenie");
      else {
        if (b.start !== start || b.end !== end)
          changes.push(
            `Zmieniono termin: ${start.replace("T", " ")} → ${end.replace("T", " ")}`,
          );
        if (b.status !== status)
          changes.push(`Status: ${serviceLabels[status]}`);
        if (b.notes !== notes) changes.push("Zaktualizowano notatkę do pracy");
        if (b.resource !== resource) changes.push(`Przypisano: ${resource}`);
        if (
          item?.name !== name ||
          item?.value !== Number(value) ||
          item?.companyId !== client ||
          b.location !== location
        )
          changes.push("Zmieniono szczegóły zlecenia");
      }
      const booking = validateBooking({
        status,
        start,
        end,
        resource: resource.trim(),
        location,
        notes,
        history: [
          ...(b?.history || []),
          ...(changes.length
            ? [{ at: new Date().toISOString(), message: changes.join(" · ") }]
            : []),
        ].slice(-200),
      });
      const conflict = bookingConflict(s.deals, booking, item?.id);
      if (conflict)
        throw Error(
          `Ten termin jest zajęty: „${conflict.name}”. Choose inny termin lub osobę / stanowisko.`,
        );
      s.saveDeal({
        id: item?.id || id(),
        companyId: client,
        name: name.trim(),
        value: Number(value),
        probability: status === "cancelled" ? 0 : 100,
        stage: status === "cancelled" ? "Przegrana" : "Wygrana",
        closeDate: start.slice(0, 10),
        service: booking,
      });
      saved();
      close();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd zapisu.");
    }
  }
  return (
    <Modal
      title={item ? "Edit zlecenie" : "Zarezerwuj pracę"}
      onClose={close}
    >
      <form className="crm-form" onSubmit={save}>
        <p className="crm-muted">
          Due date w strefie Europe/London. Ta sama osoba lub stanowisko może mieć
          jedną aktywną rezerwację naraz.
        </p>
        <Field label="Customer zlecenia">
          <select
            required
            value={client}
            onChange={(e) => setClient(e.target.value)}
          >
            <option value="">Choose klienta</option>
            {s.firms.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </Field>
        {!s.firms.length && (
          <p className="crm-alert">
            Najpierw dodaj klienta w zakładce Customers.
          </p>
        )}
        <Field label="Name pracy">
          <input
            required
            maxLength={200}
            value={name}
            placeholder="np. Montaż, konsultacja, projekt"
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <div className="crm-form-grid">
          <Field label="Początek pracy">
            <input
              type="datetime-local"
              required
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </Field>
          <Field label="Koniec pracy">
            <input
              type="datetime-local"
              required
              min={start}
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </Field>
        </div>
        <div className="crm-form-grid">
          <Field label="Quote value zlecenia (PLN)">
            <input
              type="number"
              min="0"
              max="1000000000000"
              step="0.01"
              required
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </Field>
          <Field label="Status zlecenia">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ServiceStatus)}
            >
              {SERVICE_STATUSES.map((k) => (
                <option value={k} key={k}>
                  {serviceLabels[k]}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Osoba / stanowisko">
          <input
            required
            maxLength={100}
            value={resource}
            onChange={(e) => setResource(e.target.value)}
            list="service-resources"
          />
        </Field>
        <datalist id="service-resources">
          {[
            ...new Set(
              s.deals.flatMap((d) => (d.service ? [d.service.resource] : [])),
            ),
          ].map((r) => (
            <option key={r} value={r} />
          ))}
        </datalist>
        <Field label="Miejsce realizacji">
          <input
            maxLength={500}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </Field>
        <Field label="Notatka do zlecenia">
          <textarea
            maxLength={5000}
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Field>
        {error && (
          <p className="crm-alert error" role="alert">
            {error}
          </p>
        )}
        <div className="crm-form-actions">
          <button
            type="button"
            className="crm-button secondary"
            onClick={close}
          >
            Cancel
          </button>
          <button className="crm-button" disabled={!s.firms.length}>
            Save zlecenie
          </button>
        </div>
      </form>
    </Modal>
  );
}
