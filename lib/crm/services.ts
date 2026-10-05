import {
  SERVICE_STATUSES,
  type Deal,
  type ServiceBooking,
  type ServiceStatus,
} from "./model";
export function validLocalDateTime(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value + "Z")) &&
    new Date(value + "Z").toISOString().slice(0, 16) === value
  );
}
export function validateBooking(value: unknown): ServiceBooking {
  if (!value || typeof value !== "object")
    throw Error("Nieprawidłowa rezerwacja.");
  const b = value as ServiceBooking;
  if (
    !SERVICE_STATUSES.includes(b.status) ||
    !validLocalDateTime(b.start) ||
    !validLocalDateTime(b.end) ||
    b.end <= b.start ||
    Date.parse(b.end + "Z") - Date.parse(b.start + "Z") > 366 * 86400000 ||
    typeof b.resource !== "string" ||
    !b.resource.trim() ||
    b.resource.length > 100 ||
    typeof b.location !== "string" ||
    b.location.length > 500 ||
    typeof b.notes !== "string" ||
    b.notes.length > 5000 ||
    !Array.isArray(b.history) ||
    b.history.length > 200 ||
    b.history.some(
      (h) =>
        !h ||
        typeof h.at !== "string" ||
        !Number.isFinite(Date.parse(h.at)) ||
        typeof h.message !== "string" ||
        h.message.length > 1000,
    )
  )
    throw Error(
      "Sprawdź termin, status i opis rezerwacji. Koniec musi być po początku.",
    );
  return b;
}
export const activeBooking = (status: ServiceStatus) =>
  status === "booked" || status === "in_progress";
export function bookingConflict(
  deals: Deal[],
  booking: ServiceBooking,
  excludeId = "",
) {
  if (!activeBooking(booking.status)) return undefined;
  return deals.find(
    (d) =>
      d.id !== excludeId &&
      d.service &&
      activeBooking(d.service.status) &&
      d.service.resource.trim().toLocaleLowerCase("pl") ===
        booking.resource.trim().toLocaleLowerCase("pl") &&
      booking.start < d.service.end &&
      booking.end > d.service.start,
  );
}
export function validateSchedule(deals: Deal[]) {
  const bookings = deals
    .filter((d) => d.service && activeBooking(d.service.status))
    .sort((a, b) => a.service!.start.localeCompare(b.service!.start));
  const calendars = new Map<string, string>();
  for (const d of bookings) {
    const b = d.service!,
      key = b.resource.trim().toLocaleLowerCase("pl"),
      end = calendars.get(key);
    if (end && b.start < end)
      throw Error(
        `Nakładające się rezerwacje: ${b.resource}. Zmień termin lub przypisanie.`,
      );
    calendars.set(key, b.end);
  }
}
export function serviceTotals(deals: Deal[]) {
  const jobs = deals.filter((d) => d.service),
    active = jobs.filter((d) => activeBooking(d.service!.status)),
    completed = jobs.filter((d) => d.service!.status === "completed");
  return {
    jobs,
    active,
    completed,
    reservedValue: active.reduce((sum, d) => sum + d.value, 0),
    completedValue: completed.reduce((sum, d) => sum + d.value, 0),
  };
}
