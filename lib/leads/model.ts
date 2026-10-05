export const LEAD_STATUSES = [
  "new",
  "contacted",
  "qualified",
  "quote",
  "booked",
  "won",
  "lost",
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];
export const statusLabels: Record<LeadStatus, string> = {
  new: "Nowy",
  contacted: "Kontakt nawiązany",
  qualified: "Zakwalifikowany",
  quote: "Oferta",
  booked: "Zarezerwowany",
  won: "Wygrany",
  lost: "Utracony",
};
export const EVENT_TYPES = [
  "ad_click",
  "page_view",
  "form_submit",
  "phone_call",
  "whatsapp",
  "email",
  "meeting",
  "quote_sent",
  "quote_accepted",
  "booking_created",
  "job_started",
  "job_completed",
  "payment_received",
  "review_received",
  "note_added",
  "lead_created",
  "status_change",
  "lead_updated",
] as const;
export type EventType = (typeof EVENT_TYPES)[number];
export const eventLabels: Record<EventType, string> = {
  ad_click: "Kliknięcie reklamy",
  page_view: "Wizyta na stronie",
  form_submit: "Wysłanie formularza",
  phone_call: "Rozmowa telefoniczna",
  whatsapp: "WhatsApp",
  email: "E-mail",
  meeting: "Spotkanie",
  quote_sent: "Wysłana oferta",
  quote_accepted: "Przyjęta oferta",
  booking_created: "Rezerwacja",
  job_started: "Rozpoczęcie pracy",
  job_completed: "Zakończenie pracy",
  payment_received: "Otrzymana płatność",
  review_received: "Opinia klienta",
  note_added: "Notatka",
  lead_created: "Utworzenie leada",
  status_change: "Zmiana statusu",
  lead_updated: "Aktualizacja danych",
};
export type Json =
  | string
  | number
  | boolean
  | null
  | Json[]
  | { [key: string]: Json };
export type LeadInput = {
  first_name: string;
  last_name: string;
  company_name: string;
  email: string;
  phone: string;
  status: LeadStatus;
  source: string;
  campaign: string;
  medium: string;
  estimated_value: number;
  revenue: number;
  notes: string;
  landing_page: string;
  keyword: string;
  utm: Record<string, string>;
};
export type Lead = LeadInput & {
  id: string;
  workspace_id: string;
  email_key: string;
  phone_key: string;
  first_touch_source: string;
  last_touch_source: string;
  created_at: string;
  updated_at: string;
  revision: number;
  is_demo: boolean;
  crm_links: {
    company_id?: string;
    contact_id?: string;
    deal_id?: string;
    customer_id?: string;
  };
};
export type LeadEvent = {
  id: string;
  workspace_id: string;
  lead_id: string;
  event_type: EventType;
  source: string;
  timestamp: string;
  metadata: Record<string, Json>;
};
export type Touchpoint = {
  id: string;
  workspace_id: string;
  lead_id: string;
  event_id: string;
  source: string;
  campaign: string;
  medium: string;
  keyword: string;
  landing_page: string;
  utm: Record<string, string>;
  timestamp: string;
};
export type Conversion = {
  id: string;
  workspace_id: string;
  lead_id: string;
  event_id: string;
  kind: string;
  value: number;
  currency: "PLN";
  timestamp: string;
};
export type Appointment = {
  id: string;
  workspace_id: string;
  lead_id: string;
  event_id: string;
  status: "booked" | "completed" | "cancelled";
  scheduled_at: string | null;
  created_at: string;
};
export type Quote = {
  id: string;
  workspace_id: string;
  lead_id: string;
  event_id: string;
  status: "sent" | "accepted" | "rejected";
  amount: number;
  currency: "PLN";
  created_at: string;
  updated_at: string;
};
export type Job = {
  id: string;
  workspace_id: string;
  lead_id: string;
  event_id: string;
  status: "in_progress" | "completed" | "cancelled";
  amount: number;
  currency: "PLN";
  created_at: string;
  updated_at: string;
};
export type Payment = {
  id: string;
  workspace_id: string;
  lead_id: string;
  event_id: string;
  amount: number;
  currency: "PLN";
  status: "received";
  timestamp: string;
};
export type LeadBundle = {
  lead: Lead;
  events: LeadEvent[];
  touchpoints: Touchpoint[];
  conversions: Conversion[];
  appointments: Appointment[];
  quotes: Quote[];
  jobs: Job[];
  payments: Payment[];
};
export const CHILD_TABLES = [
  "lead_events",
  "touchpoints",
  "conversions",
  "appointments",
  "quotes",
  "jobs",
  "payments",
] as const;
export const BUNDLE_KEYS = [
  "events",
  "touchpoints",
  "conversions",
  "appointments",
  "quotes",
  "jobs",
  "payments",
] as const;
export type LeadFilters = {
  search: string;
  status: LeadStatus | "";
  scope: "all" | "real" | "demo";
  page: number;
};
export type LeadPage = { leads: Lead[]; total: number };
export class LeadError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export const uuid = (v: unknown): v is string =>
  typeof v === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new LeadError("Nieprawidłowe dane.");
  return value as Record<string, unknown>;
}
function text(value: unknown, max: number, label: string) {
  if (value === undefined) return "";
  if (typeof value !== "string" || value.length > max)
    throw new LeadError(`Sprawdź pole: ${label}.`);
  return value.trim();
}
export function amount(value: unknown, label = "Wartość") {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > 1e12
  )
    throw new LeadError(`${label}: podaj wartość od 0 do 1 biliona PLN.`);
  return Math.round(value * 100) / 100;
}
export function emailKey(value: string) {
  const normalized = value.trim().toLowerCase();
  if (
    normalized &&
    (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) || normalized.length > 254)
  )
    throw new LeadError("Wpisz poprawny e-mail.");
  return normalized;
}
export function phoneKey(value: string) {
  if (!value.trim()) return "";
  if (!/^[+\d\s().-]+$/.test(value))
    throw new LeadError("Wpisz telefon bez liter i numeru wewnętrznego.");
  let normalized = value.replace(/[\s().-]/g, "");
  if (normalized.startsWith("00")) normalized = "+" + normalized.slice(2);
  if (/^\d{9}$/.test(normalized)) normalized = "+48" + normalized;
  else if (/^48\d{9}$/.test(normalized)) normalized = "+" + normalized;
  if (!/^\+[1-9]\d{7,14}$/.test(normalized))
    throw new LeadError(
      "Podaj 9-cyfrowy polski telefon albo numer z prefiksem kraju, np. +44.",
    );
  return normalized;
}
export function timestamp(value: unknown) {
  if (
    typeof value !== "string" ||
    value.length > 40 ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/.test(
      value,
    ) ||
    !Number.isFinite(Date.parse(value))
  )
    throw new LeadError("Sprawdź datę zdarzenia.");
  const date = value.slice(0, 10);
  if (new Date(date + "T12:00:00Z").toISOString().slice(0, 10) !== date)
    throw new LeadError("Nieprawidłowy dzień zdarzenia.");
  return new Date(value).toISOString();
}
function utm(value: unknown) {
  if (value === undefined) return {};
  const record = object(value),
    result: Record<string, string> = {};
  for (const [key, v] of Object.entries(record)) {
    if (
      ![
        "utm_source",
        "utm_medium",
        "utm_campaign",
        "utm_term",
        "utm_content",
      ].includes(key)
    )
      throw new LeadError("Nieznany parametr UTM.");
    result[key] = text(v, 500, key);
  }
  return result;
}
export function parseLead(value: unknown): LeadInput {
  const v = object(value);
  const result: LeadInput = {
    first_name: text(v.first_name, 100, "Imię"),
    last_name: text(v.last_name, 100, "Nazwisko"),
    company_name: text(v.company_name, 200, "Firma"),
    email: emailKey(text(v.email, 254, "E-mail")),
    phone: text(v.phone, 50, "Telefon"),
    status: (v.status ?? "new") as LeadStatus,
    source: text(v.source, 100, "Źródło"),
    campaign: text(v.campaign, 200, "Kampania"),
    medium: text(v.medium, 100, "Medium"),
    estimated_value: amount(v.estimated_value ?? 0),
    revenue: amount(v.revenue ?? 0, "Revenue"),
    notes: text(v.notes, 5000, "Notatki"),
    landing_page: text(v.landing_page, 1000, "Landing page"),
    keyword: text(v.keyword, 500, "Słowo kluczowe"),
    utm: utm(v.utm),
  };
  phoneKey(result.phone);
  if (
    !result.first_name &&
    !result.last_name &&
    !result.company_name &&
    !result.email &&
    !result.phone
  )
    throw new LeadError("Podaj nazwę, e-mail lub telefon leada.");
  if (!LEAD_STATUSES.includes(result.status))
    throw new LeadError("Nieprawidłowy status leada.");
  return result;
}
function json(value: unknown, depth = 0): Json {
  if (depth > 4) throw new LeadError("Dane zdarzenia są zbyt złożone.");
  if (
    value === null ||
    typeof value === "boolean" ||
    (typeof value === "string" && value.length <= 5000) ||
    (typeof value === "number" && Number.isFinite(value))
  )
    return value as Json;
  if (Array.isArray(value) && value.length <= 50)
    return value.map((v) => json(v, depth + 1));
  if (value && typeof value === "object" && Object.keys(value).length <= 50) {
    const out: Record<string, Json> = Object.create(null);
    for (const [k, v] of Object.entries(value)) {
      if (
        k.length > 100 ||
        ["__proto__", "prototype", "constructor"].includes(k)
      )
        throw new LeadError("Nieprawidłowy klucz danych zdarzenia.");
      out[k] = json(v, depth + 1);
    }
    return out;
  }
  throw new LeadError("Sprawdź dane zdarzenia.");
}
export function parseEvent(
  value: unknown,
  wid: string,
  lid: string,
): LeadEvent {
  const v = object(value);
  if (!uuid(v.id) || !EVENT_TYPES.includes(v.event_type as EventType))
    throw new LeadError("Sprawdź identyfikator i rodzaj zdarzenia.");
  const source = text(v.source, 100, "Źródło"),
    metadata = json(object(v.metadata ?? {})) as Record<string, Json>;
  if (JSON.stringify(metadata).length > 20000)
    throw new LeadError("Opis zdarzenia jest zbyt duży.");
  if (!source) throw new LeadError("Podaj źródło zdarzenia.");
  if (metadata.amount !== undefined) amount(metadata.amount);
  if (metadata.job_value !== undefined) amount(metadata.job_value);
  if (
    v.event_type === "payment_received" &&
    (metadata.amount === undefined || amount(metadata.amount) <= 0)
  )
    throw new LeadError("Płatność wymaga dodatniej kwoty w PLN.");
  if (metadata.scheduled_at !== undefined) timestamp(metadata.scheduled_at);
  if (
    metadata.call_duration !== undefined &&
    (typeof metadata.call_duration !== "number" ||
      !Number.isInteger(metadata.call_duration) ||
      metadata.call_duration < 0 ||
      metadata.call_duration > 86400)
  )
    throw new LeadError(
      "Długość rozmowy musi być liczbą sekund od 0 do 86400.",
    );
  return {
    id: v.id,
    workspace_id: wid,
    lead_id: lid,
    event_type: v.event_type as EventType,
    source,
    timestamp: timestamp(v.timestamp),
    metadata,
  };
}
export function parseFilters(params: URLSearchParams): LeadFilters {
  const status = params.get("status") ?? "",
    scope = params.get("scope") ?? "all",
    page = Number(params.get("page") ?? 0),
    search = params.get("search") ?? "";
  if (
    (status && !LEAD_STATUSES.includes(status as LeadStatus)) ||
    !["all", "real", "demo"].includes(scope) ||
    !Number.isInteger(page) ||
    page < 0 ||
    page > 100000 ||
    search.length > 200
  )
    throw new LeadError("Nieprawidłowy filtr leadów.");
  return {
    status: status as LeadFilters["status"],
    scope: scope as LeadFilters["scope"],
    page,
    search: search.trim(),
  };
}
export const leadName = (lead: LeadInput) =>
  [lead.first_name, lead.last_name].filter(Boolean).join(" ") ||
  lead.company_name ||
  lead.email ||
  lead.phone;
export function chronological<T extends { timestamp: string; id: string }>(
  rows: T[],
) {
  return [...rows].sort(
    (a, b) =>
      a.timestamp.localeCompare(b.timestamp) || a.id.localeCompare(b.id),
  );
}
export function resolveIdentity(
  leads: Lead[],
  email: string,
  phone: string,
  exclude = "",
) {
  const ek = emailKey(email),
    pk = phoneKey(phone);
  const matches = leads.filter(
    (l) =>
      l.id !== exclude &&
      ((ek && l.email_key === ek) || (pk && l.phone_key === pk)),
  );
  if (matches.length > 1)
    throw new LeadError(
      "E-mail i telefon wskazują różnych leadów. Sprawdź oba rekordy; nie połączymy ich automatycznie.",
      409,
    );
  return matches[0];
}

export function sameEvent(a: LeadEvent, b: LeadEvent) {
  const stable = (v: Json): string =>
    Array.isArray(v)
      ? "[" + v.map(stable).join(",") + "]"
      : v && typeof v === "object"
        ? "{" +
          Object.keys(v)
            .sort()
            .map((k) => JSON.stringify(k) + ":" + stable(v[k]))
            .join(",") +
          "}"
        : JSON.stringify(v);
  return (
    a.id === b.id &&
    a.workspace_id === b.workspace_id &&
    a.lead_id === b.lead_id &&
    a.event_type === b.event_type &&
    a.source === b.source &&
    a.timestamp === b.timestamp &&
    stable(a.metadata) === stable(b.metadata)
  );
}
