"use client";
import { useEffect, useState } from "react";
import { isSqlite } from "@/lib/growth/model";
import Pipeline from "../plumbing/pipeline";
import { cloudRequest } from "@/lib/supabase/browser";
import {
  LEAD_STATUSES,
  statusLabels,
  leadName,
  type Lead,
  type LeadStatus,
  type LeadBundle,
  type LeadPage,
} from "@/lib/leads/model";
import { Badge, Empty, Icon } from "../crm/ui";
import { downloadFile } from "@/lib/crm/backup";
import { LeadForm, EventForm } from "./forms";
import LeadDetail, { eventDate, leadMoney } from "./detail";
export default function LeadHub({
  wid,
  initialLeadId = "",
  demo: demoWorkspace = false,
  query,
  readOnly,
  notify,
}: {
  wid: string;
  initialLeadId?: string;
  demo?: boolean;
  query: string;
  readOnly: boolean;
  notify: (message: string) => void;
}) {
  const [status, setStatus] = useState<LeadStatus | "">(""),
    [scope, setScope] = useState(demoWorkspace ? "demo" : "real"),
    [page, setPage] = useState(0),
    [refresh, setRefresh] = useState(0),
    [rows, setRows] = useState<LeadPage>({ leads: [], total: 0 }),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [selected, setSelected] = useState(initialLeadId),
    [bundle, setBundle] = useState<LeadBundle | null>(null),
    [detailError, setDetailError] = useState(""),
    [modal, setModal] = useState<"create" | "edit" | "event" | null>(null),
    [demoBusy, setDemoBusy] = useState(false);
  const [previousQuery, setPreviousQuery] = useState(query);
  if (previousQuery !== query) {
    setPreviousQuery(query);
    setPage(0);
  }
  useEffect(() => {
    let active = true;
    const timer = setTimeout(
      () => {
        setLoading(true);
        setError("");
        const params = new URLSearchParams({
          search: query,
          status,
          scope,
          page: String(page),
        });
        cloudRequest(`/${wid}/leads?${params}`)
          .then((data) => {
            if (active) setRows(data);
          })
          .catch((e) => {
            if (active) setError(e.message);
          })
          .finally(() => {
            if (active) setLoading(false);
          });
      },
      query ? 180 : 0,
    );
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [wid, query, status, scope, page, refresh]);
  useEffect(() => {
    if (!selected) return;
    let active = true;
    const timer = setTimeout(() => {
      setDetailError("");
      cloudRequest(`/${wid}/leads/${selected}`)
        .then((data) => {
          if (active) setBundle(data);
        })
        .catch((e) => {
          if (active) setDetailError(e.message);
        });
    }, 0);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [wid, selected, refresh]);
  function open(id: string) {
    setBundle(null);
    setDetailError("");
    setSelected(id);
  }
  function saved(lead: Lead, duplicate = false) {
    setModal(null);
    setScope(lead.is_demo ? "demo" : "real");
    setPage(0);
    open(lead.id);
    setRefresh((n) => n + 1);
    notify(
      duplicate
        ? "Ten kontakt już istnieje. Otwarto jego historię; dane nie zostały nadpisane."
        : "Saved in Lead Hub.",
    );
  }
  async function demo() {
    setDemoBusy(true);
    try {
      const data = await cloudRequest(`/${wid}/leads/demo`, {
        method: "POST",
        body: "{}",
      });
      saved(data.lead);
      notify(
        data.duplicate
          ? "Otwarto istniejący przykład DEMO."
          : "Dodano przykład DEMO — bez live integracji.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nie udało się otworzyć DEMO.");
    } finally {
      setDemoBusy(false);
    }
  }
  if (selected)
    return (
      <div className="grid gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            className="crm-button secondary"
            onClick={() => {
              setSelected("");
              setBundle(null);
              setDetailError("");
            }}
          >
            <Icon name="arrow" size={16} />
            Back to leads
          </button>
          <div className="flex flex-wrap gap-2">
            <button
              className="crm-button secondary"
              onClick={() => {
                setBundle(null);
                setRefresh((n) => n + 1);
              }}
            >
              Refresh lead
            </button>
            {bundle && (
              <button
                className="crm-text-button"
                onClick={() =>
                  downloadFile(
                    `lead-${bundle.lead.id}.json`,
                    JSON.stringify(
                      { version: 1, type: "lead-hub", ...bundle },
                      null,
                      2,
                    ),
                  )
                }
              >
                <Icon name="download" size={16} />
                Download history JSON
              </button>
            )}
          </div>
        </div>
        {detailError && (
          <p role="alert" className="crm-alert error">
            {detailError}
          </p>
        )}
        {!bundle && !detailError && (
          <p role="status" className="crm-card p-6">
            Loading lead history…
          </p>
        )}
        {bundle && (
          <>
            <section className="crm-welcome">
              <div className="min-w-0">
                <span className="crm-eyebrow">CUSTOMER ENQUIRY</span>
                <h2 className="break-words">{leadName(bundle.lead)}</h2>
                <p>
                  {bundle.lead.company_name ||
                    "Local Plumbing Services enquiry"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge tone={bundle.lead.status === "won" ? "green" : "purple"}>
                  {statusLabels[bundle.lead.status]}
                </Badge>
                {bundle.lead.is_demo && <Badge tone="purple">DEMO</Badge>}
              </div>
            </section>
            {bundle.lead.is_demo && (
              <p className="crm-alert">
                DEMO — synthetic customers and history. Events are illustrative;
                no live accounts are connected.
              </p>
            )}
            {isSqlite() && (
              <Pipeline
                key={`${bundle.lead.id}:${bundle.lead.revision}`}
                wid={wid}
                lead={bundle.lead}
                readOnly={readOnly}
                saved={saved}
              />
            )}
            <LeadDetail
              key={bundle.lead.id}
              bundle={bundle}
              readOnly={readOnly}
              edit={() => setModal("edit")}
              addEvent={() => setModal("event")}
            />
            {modal === "edit" && (
              <LeadForm
                wid={wid}
                lead={bundle.lead}
                close={() => setModal(null)}
                saved={saved}
              />
            )}
            {modal === "event" && (
              <EventForm
                wid={wid}
                lead={bundle.lead}
                close={() => setModal(null)}
                saved={saved}
              />
            )}
          </>
        )}
      </div>
    );
  return (
    <div className="grid gap-6">
      <section className="crm-welcome">
        <div>
          <span className="crm-eyebrow">ONE ENQUIRY · COMPLETE HISTORY</span>
          <h2>From the first call to a paid job.</h2>
          <p>
            Sources, calls, quotes, jobs and payments in one customer history.
          </p>
        </div>
        <button
          disabled={readOnly}
          className="crm-button"
          onClick={() => setModal("create")}
        >
          <Icon name="plus" size={18} />
          Add enquiry
        </button>
      </section>
      <section className="crm-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-3">
            <select
              aria-label="Pipeline stage"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as LeadStatus | "");
                setPage(0);
              }}
            >
              <option value="">All stages</option>
              {LEAD_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {statusLabels[s]}
                </option>
              ))}
            </select>
            <select
              aria-label="Lead data scope"
              value={scope}
              onChange={(e) => {
                setScope(e.target.value);
                setPage(0);
              }}
            >
              <option value="real">Real enquiries</option>
              <option value="demo">DEMO enquiries</option>
              <option value="all">All enquiries</option>
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-slate-600">
              {rows.total} enquiries
            </span>
            <button
              disabled={loading}
              className="crm-text-button"
              onClick={() => setRefresh((n) => n + 1)}
            >
              Refresh enquiries
            </button>
            <button
              disabled={readOnly || demoBusy}
              hidden={demoWorkspace}
              className="crm-button secondary"
              onClick={demo}
            >
              {demoBusy ? "Loading DEMO…" : "Add example enquiry"}
            </button>
          </div>
        </div>
        <p className="mt-4! text-sm leading-relaxed text-slate-500">
          Record calls, website forms and WhatsApp enquiries here. Stable
          phone/email identities keep the customer history together.
        </p>
      </section>
      {error && (
        <p role="alert" className="crm-alert error">
          {error}
        </p>
      )}
      <section className="crm-card min-w-0 overflow-hidden">
        {loading ? (
          <p role="status" className="p-6 text-slate-600">
            Loading enquiries…
          </p>
        ) : rows.leads.length ? (
          <>
            <div className="hidden grid-cols-[minmax(0,1.4fr)_minmax(0,.95fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,.8fr)_minmax(0,.8fr)] gap-4 border-b border-slate-200/70 bg-violet-50/30 px-6 py-4 text-sm font-medium text-slate-500 lg:grid">
              {[
                "Lead",
                "Status",
                "Source",
                "Campaign",
                "Last activity",
                "Quote value",
                "Revenue",
              ].map((h) => (
                <span key={h}>{h}</span>
              ))}
            </div>
            {rows.leads.map((l) => (
              <button
                key={l.id}
                aria-label={`Open enquiry: ${leadName(l)}`}
                className="grid w-full min-w-0 gap-4 border-b border-slate-100 px-6 py-5 text-left transition-colors last:border-b-0 hover:bg-violet-50/50 focus-visible:outline-2 focus-visible:outline-violet-500 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,.95fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,.8fr)_minmax(0,.8fr)]"
                onClick={() => open(l.id)}
              >
                <div className="min-w-0">
                  <strong className="block text-base break-words">
                    {leadName(l)}
                  </strong>
                  <p className="mt-1! truncate text-sm text-slate-500">
                    {l.email ||
                      l.phone ||
                      l.company_name ||
                      "Contact details needed"}
                  </p>
                  {l.is_demo && <Badge tone="purple">DEMO</Badge>}
                </div>
                <div className="self-start">
                  <Badge
                    tone={
                      l.status === "won"
                        ? "green"
                        : l.status === "lost"
                          ? "red"
                          : "purple"
                    }
                  >
                    {statusLabels[l.status]}
                  </Badge>
                </div>
                <div className="min-w-0 text-sm break-words">
                  <span className="block text-slate-500 lg:hidden">Source</span>
                  {l.source || "Unknown"}
                </div>
                <div className="min-w-0 text-sm break-words">
                  <span className="block text-slate-500 lg:hidden">
                    Campaign
                  </span>
                  {l.campaign || "Unassigned"}
                </div>
                <div className="text-sm">
                  <span className="block text-slate-500 lg:hidden">
                    Last activity
                  </span>
                  {eventDate(l.last_activity_at || l.updated_at)}
                </div>
                <div className="min-w-0 text-sm font-medium break-words">
                  <span className="block font-normal text-slate-500 lg:hidden">
                    Quote value
                  </span>
                  {leadMoney(l.estimated_value, l.currency ?? "PLN")}
                </div>
                <div className="min-w-0 text-sm font-semibold break-words text-emerald-700">
                  <span className="block font-normal text-slate-500 lg:hidden">
                    Revenue
                  </span>
                  {leadMoney(l.revenue, l.currency ?? "PLN")}
                </div>
              </button>
            ))}
          </>
        ) : (
          !error && (
            <Empty
              title="Your next customer enquiry"
              description="Add enquiry i jego źródło. Kolejne rozmowy, oferty i realizacje zapiszesz na jednej osi czasu."
              action={
                <button
                  disabled={readOnly}
                  className="crm-button secondary"
                  onClick={() => setModal("create")}
                >
                  Add your first enquiry
                </button>
              }
            />
          )
        )}
      </section>
      {rows.total > 50 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            disabled={page === 0 || loading}
            className="crm-button secondary"
            onClick={() => setPage((n) => n - 1)}
          >
            Previous page
          </button>
          <p className="text-sm text-slate-600">
            Page {page + 1} of {Math.ceil(rows.total / 50)}
          </p>
          <button
            disabled={(page + 1) * 50 >= rows.total || loading}
            className="crm-button secondary"
            onClick={() => setPage((n) => n + 1)}
          >
            Next page
          </button>
        </div>
      )}
      {modal === "create" && (
        <LeadForm wid={wid} close={() => setModal(null)} saved={saved} />
      )}
    </div>
  );
}
