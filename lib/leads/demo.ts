import { randomUUID } from "node:crypto";
import { parseLead, type LeadBundle, type EventType, type Json } from "./model";
import { newLead, addEvent } from "./domain";
export function demoLead(wid: string): LeadBundle {
  let b = newLead(
    wid,
    "10000000-0000-4000-8000-000000000001",
    parseLead({
      first_name: "Alex",
      last_name: "Taylor · DEMO",
      email: "lead.demo@example.com",
      phone: "",
      company_name: "",
      status: "won",
      source: "Google Ads",
      campaign: "Blocked drain · Dartford",
      medium: "cpc",
      estimated_value: 280,
      revenue: 0,
      landing_page: "/blocked-drains-dartford",
      keyword: "blocked drain dartford",
      utm: {
        utm_source: "google",
        utm_medium: "cpc",
        utm_campaign: "drainage_dartford",
      },
      notes:
        "DEMO — przykładowa historia, bez live integracji i rzeczywistego klienta.",
    }),
    true,
  );
  const base = Date.now() - 2 * 86400000;
  const rows: {
    type: EventType;
    source: string;
    minutes: number;
    metadata: Record<string, Json>;
  }[] = [
    {
      type: "ad_click",
      source: "Google Ads",
      minutes: 0,
      metadata: {
        campaign: b.lead.campaign,
        keyword: b.lead.keyword,
        utm_source: "google",
        utm_campaign: "drainage_dartford",
        utm_medium: "cpc",
      },
    },
    {
      type: "page_view",
      source: "Google Ads",
      minutes: 1,
      metadata: { landing_page: b.lead.landing_page },
    },
    {
      type: "form_submit",
      source: "Strona firmy",
      minutes: 2,
      metadata: { form_name: "Pilna pomoc", landing_page: b.lead.landing_page },
    },
    {
      type: "phone_call",
      source: "Telefon",
      minutes: 3,
      metadata: {
        call_duration: 222,
        note: "Klient potwierdza zakres awarii.",
      },
    },
    {
      type: "status_change",
      source: "CRM",
      minutes: 8,
      metadata: { previous_status: "contacted", status: "qualified" },
    },
    {
      type: "quote_sent",
      source: "Firma",
      minutes: 22,
      metadata: { amount: 280, note: "Oferta udrożnienia odpływu." },
    },
    {
      type: "quote_accepted",
      source: "Klient",
      minutes: 27,
      metadata: { amount: 280 },
    },
    {
      type: "booking_created",
      source: "Firma",
      minutes: 49,
      metadata: { scheduled_at: new Date(base + 180 * 60000).toISOString() },
    },
    {
      type: "job_started",
      source: "Realizacja",
      minutes: 180,
      metadata: { job_value: 280 },
    },
    {
      type: "job_completed",
      source: "Realizacja",
      minutes: 369,
      metadata: { job_value: 280 },
    },
    {
      type: "payment_received",
      source: "Klient",
      minutes: 379,
      metadata: { amount: 280, note: "Płatność demonstracyjna." },
    },
  ];
  for (const row of rows)
    b = addEvent(b, {
      id: randomUUID(),
      workspace_id: wid,
      lead_id: b.lead.id,
      event_type: row.type,
      source: row.source,
      timestamp: new Date(base + row.minutes * 60000).toISOString(),
      metadata: row.metadata,
    });
  return b;
}
