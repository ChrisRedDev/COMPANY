"use client";
import { isSqlite } from "@/lib/growth/model";
import LeadHub from "../leads/hub";
import PlumbingDashboard from "../plumbing/dashboard";
import Brain from "../local/brain";
import Connectors from "../local/connectors";
import Marketing from "../local/marketing";
import AiAgent from "../local/agent";
import LocalUnavailable from "../local/unavailable";
import Image from "next/image";
import { useEffect, useState, useRef, useCallback } from "react";
import { useCrm } from "@/stores/crm-store";
import { type Section, type Contact, type Mail } from "@/lib/crm/model";
import { Icon, Modal } from "./ui";
import EntityForm, { type Editor } from "./forms";
import {
  Dashboard,
  Firms,
  Deals,
  Contacts,
  Tasks,
  type ViewProps,
} from "./views";
import { Mailbox, Composer, Agent, type MailStatus } from "./mail";
import Settings from "./settings";
import ServiceDashboard from "../services/dashboard";
import ServiceClients from "../services/clients";
import ServiceJobs from "../services/jobs";
import JobForm from "../services/job-form";
import type { Deal } from "@/lib/crm/model";
import Onboarding from "./onboarding";
import CommandCenter from "./command-center";
import StatsBoard from "../insights/stats-board";
import Reports from "../reports/reports";
import Automations from "../automation/automations";
import Copilot from "../copilot/copilot";
import { useScheduler } from "@/stores/scheduler";
import { useAgent } from "@/stores/agent-store";
const NAV: { id: Section; title: string; description: string }[] = [
  {
    id: "dashboard",
    title: "Owner overview",
    description: "Today’s leads, booked jobs and received revenue.",
  },
  {
    id: "leads",
    title: "Lead Hub",
    description: "Calls, forms and WhatsApp, through to payment.",
  },
  {
    id: "companies",
    title: "Customers",
    description: "Customer details and job history.",
  },
  {
    id: "deals",
    title: "Sales pipeline",
    description: "Quotes and opportunities with a clear next step.",
  },
  {
    id: "contacts",
    title: "Contacts",
    description: "Customer contact details.",
  },
  {
    id: "tasks",
    title: "Tasks",
    description: "Follow-ups and work that needs attention.",
  },
  {
    id: "mail",
    title: "Email",
    description: "Customer emails and drafts.",
  },
  {
    id: "agent",
    title: "Follow-up assistant",
    description: "Keep in touch with customers awaiting a response.",
  },
  {
    id: "reports",
    title: "Reports",
    description: "Owner, sales and job reports with PDF export.",
  },
  {
    id: "automations",
    title: "Schedule",
    description: "Recurring reports, follow-ups and AI briefings.",
  },
  {
    id: "brain",
    title: "Company Brain",
    description: "Company knowledge, source notes and service guidelines.",
  },
  {
    id: "connectors",
    title: "Connectors",
    description: "Connected accounts, imports and data status.",
  },
  {
    id: "ai",
    title: "AI assistant",
    description: "Daily insights and reviewable CRM actions.",
  },
  {
    id: "settings",
    title: "Settings",
    description: "Email setup, signature and data backups.",
  },
];
export default function Workspace({
  cloud,
  storageBusy,
  reloadDatabase,
}: {
  cloud?: {
    id?: string;
    storage?: "sqlite" | "supabase";
    name: string;
    readOnly: boolean;
  };
  storageBusy?: boolean;
  reloadDatabase?: () => void;
}) {
  const cloudName = cloud?.name;
  useEffect(() => {
    useAgent
      .getState()
      .setWorkspace(cloud?.id ?? "local", Boolean(cloud?.readOnly));
  }, [cloud?.id, cloud?.readOnly]);
  const readOnly = cloud?.readOnly;
  const s = useCrm();
  const serviceMode = s.businessMode === "services";
  const plumbing = isSqlite() && Boolean(cloud?.id);
  const [leadId, setLeadId] = useState("");
  const navigation = [
    ...NAV,
    ...(plumbing
      ? [
          {
            id: "ads" as const,
            title: "Paid search",
            description: "Google and Microsoft Ads through to booked jobs.",
          },
          {
            id: "calls" as const,
            title: "Call tracking",
            description: "Answered and missed calls, linked to their leads.",
          },
          {
            id: "tracking" as const,
            title: "Tracking health",
            description:
              "Compare CRM with GA4, GTM and paid search observations.",
          },
          {
            id: "localSeo" as const,
            title: "SEO Search Audit",
            description:
              "Local visibility, Google Business Profile and page checks.",
          },
        ]
      : []),
  ].map((n) =>
    serviceMode && n.id === "companies"
      ? {
          ...n,
          title: "Customers",
          description: "Contacts, details and previous jobs.",
        }
      : serviceMode && n.id === "deals"
        ? {
            ...n,
            title: "Jobs",
            description: "Booked jobs, availability and completed work.",
          }
        : serviceMode && n.id === "dashboard"
          ? { ...n, description: "Your enquiries, booked work and payments." }
          : n,
  );
  const [jobEditor, setJobEditor] = useState<{
    item?: Deal;
    companyId?: string;
  } | null>(null);
  const openJob = (item?: Deal, companyId?: string) =>
    setJobEditor({ item, companyId });
  const [ready, setReady] = useState(false);
  const [section, setSection] = useState<Section>("dashboard");
  const [agentPrompt, setAgentPrompt] = useState<{
    text: string;
    at: number;
  } | null>(null);
  const [query, setQuery] = useState("");
  const [navOpen, setNavOpen] = useState(false);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [composer, setComposer] = useState<{
    contact?: Contact;
    mail?: Mail;
  } | null>(null);
  const [onboarding, setOnboarding] = useState(false);
  const [notice, setNotice] = useState("");
  const [storageWarning, setStorageWarning] = useState(false);
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<MailStatus>({
    configured: false,
    verified: false,
  });
  const search = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notify = useCallback(
    (text: string) => {
      setNotice(text);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setNotice(""), 7000);
    },
    [setNotice],
  );
  useEffect(() => {
    let active = true;
    Promise.resolve(cloudName ? undefined : useCrm.persist.rehydrate())
      .then(() => {
        if (!active) return;
        const current = useCrm.getState();
        for (const m of current.mails)
          if (m.status === "sending")
            current.saveMail({
              ...m,
              status: "failed",
              error:
                "The previous send was not confirmed. Retrying uses the same message ID.",
            });
        if (
          isSqlite() &&
          new URLSearchParams(window.location.search).has("google")
        )
          setSection("connectors");
        setReady(true);
        setOnboarding(!readOnly && !current.onboarded);
      })
      .catch(() => {
        if (active) {
          setReady(true);
          notify("Could not read saved data. Check browser storage.");
        }
      });
    return () => {
      active = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [notify, cloudName, readOnly]);
  useEffect(() => {
    const storage = () => {
      setStorageWarning(true);
      notify(
        "Browser storage is full or unavailable. Download a backup in Settings.",
      );
    };
    const keyboard = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        search.current?.focus();
      }
    };
    window.addEventListener("crm-storage-error", storage);
    window.addEventListener("keydown", keyboard);
    return () => {
      window.removeEventListener("crm-storage-error", storage);
      window.removeEventListener("keydown", keyboard);
    };
  }, [notify]);
  useEffect(() => {
    fetch("/api/mail/status")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((result) =>
        setStatus({ configured: result.configured === true, verified: false }),
      )
      .catch(() =>
        setStatus({
          configured: false,
          verified: false,
          error: "Could not read email status.",
        }),
      );
  }, []);
  const navigate = (target: Section) => {
    setSection(target);
    setQuery("");
    setNavOpen(false);
  };
  const askAgent = (text: string) => {
    setAgentPrompt({ text, at: Date.now() });
    navigate("ai");
  };
  useScheduler(ready && !readOnly && !storageBusy, notify);
  const compose = (contact?: Contact) => {
    setSection("mail");
    setComposer({ contact });
  };
  const props: ViewProps = {
    query,
    edit: setEditor,
    notify,
    navigate,
    compose,
  };
  const current = navigation.find((n) => n.id === section)!;
  const nav = (
    <>
      <div className="crm-brand">
        <Image
          src="/assets/brand/local-plumbing-services.png"
          alt="Local Plumbing Services"
          width={215}
          height={100}
          priority
        />
        <div>
          <small>LOCAL PLUMBING · GROWTH OS</small>
        </div>
      </div>
      <div className="crm-workspace-label">
        <span className="crm-workspace-dot" />
        {cloud?.name || "My workspace"}
        <Icon name="check" size={13} />
      </div>
      <label className="growth-mode-switch">
        Workflow
        <select
          aria-label="Workflow mode"
          value={s.businessMode}
          disabled={readOnly || storageBusy}
          onChange={(e) => {
            s.setBusinessMode(e.target.value as "crm" | "services");
            navigate("dashboard");
          }}
        >
          <option value="crm">Sales CRM</option>
          <option value="services">Plumbing services</option>
        </select>
      </label>
      <div className="crm-nav-caption">
        {serviceMode ? "CUSTOMERS & JOBS" : "WORKSPACE"}
      </div>
      <nav aria-label="Main menu">
        {(plumbing
          ? [
              "dashboard",
              "leads",
              "calls",
              "ads",
              "tracking",
              "localSeo",
              "brain",
              "deals",
            ]
          : [
              "dashboard",
              "leads",
              "companies",
              "deals",
              "contacts",
              "tasks",
              "brain",
              "ai",
            ]
        ).map((id) => {
          const n = navigation.find((n) => n.id === id)!;
          return (
            <button
              key={n.id}
              aria-label={n.title}
              className={`crm-nav-item ${section === n.id ? "active" : ""}`}
              onClick={() => navigate(n.id)}
              aria-current={section === n.id ? "page" : undefined}
            >
              <Icon
                name={
                  n.id === "dashboard"
                    ? "dashboard"
                    : n.id === "deals"
                      ? "deals"
                      : n.id === "calls" || n.id === "leads"
                        ? "contacts"
                        : n.id === "ads"
                          ? "spark"
                          : n.id === "tracking"
                            ? "help"
                            : n.id === "brain" || n.id === "localSeo"
                              ? "file"
                              : n.id
                }
              />
              <span>{n.title}</span>
            </button>
          );
        })}
        <div className="crm-nav-caption">DAILY DECISIONS</div>
        {plumbing && (
          <button
            className={`crm-nav-item ${section === "ai" ? "active" : ""}`}
            onClick={() => navigate("ai")}
            aria-label="AI assistant"
          >
            <Icon name="spark" />
            <span>AI assistant</span>
            <span className="crm-mini-badge">AI</span>
          </button>
        )}
        <details className="plumbing-more-tools">
          <summary>More tools</summary>
          {navigation
            .filter(
              (n) =>
                ![
                  "dashboard",
                  "leads",
                  "calls",
                  "ads",
                  "tracking",
                  "localSeo",
                  "brain",
                  "deals",
                  "ai",
                  "settings",
                ].includes(n.id),
            )
            .map((n) => (
              <button
                key={n.id}
                aria-label={n.title}
                className={`crm-nav-item ${section === n.id ? "active" : ""}`}
                onClick={() => navigate(n.id)}
              >
                <Icon
                  name={
                    n.id === "automations"
                      ? "clock"
                      : n.id === "reports"
                        ? "file"
                        : n.id === "connectors"
                          ? "settings"
                          : n.id
                  }
                />
                <span>{n.title}</span>
              </button>
            ))}
        </details>
      </nav>
      <div className="crm-sidebar-bottom">
        <div className="crm-sidebar-promo">
          <Icon name="spark" />
          <strong>Your daily plumbing briefing</strong>
          <p>
            Follow up your enquiries.
            <br />
            Turn leads into booked work.
          </p>
          <button className="crm-text-button" onClick={() => navigate("ai")}>
            Open AI assistant <Icon name="arrow" size={15} />
          </button>
        </div>
        <button
          className={`crm-nav-item ${section === "settings" ? "active" : ""}`}
          onClick={() => navigate("settings")}
        >
          <Icon name="settings" />
          <span>Settings</span>
        </button>
        <button
          className="crm-nav-item"
          onClick={() => {
            setNavOpen(false);
            setOnboarding(true);
          }}
        >
          <Icon name="help" />
          <span>Workspace guide</span>
        </button>
        <div className="crm-local-label">
          <span />
          {cloud
            ? isSqlite()
              ? "Local workspace · SQLite"
              : "Cloud workspace · Supabase"
            : "Local browser storage"}
        </div>
      </div>
    </>
  );
  if (!ready)
    return (
      <main className="crm-loading" role="status">
        <Icon name="spark" size={32} />
        <p>Preparing your workspace…</p>
      </main>
    );
  return (
    <div className="crm">
      <aside className="crm-sidebar">{nav}</aside>
      <div className="crm-main">
        <header className="crm-topbar">
          <div className="crm-breadcrumb">
            <button
              className="crm-icon-button crm-mobile-only"
              aria-label="Open navigation"
              onClick={() => setNavOpen(true)}
            >
              <Icon name="menu" />
            </button>
            <span>Workspace</span>
            <span>/</span>
            <strong>{current.title}</strong>
          </div>
          <div className="crm-topbar-right">
            <span className="crm-save-status">
              <span />
              {cloud
                ? isSqlite()
                  ? "SQLite database"
                  : "Supabase database"
                : "Saved in browser"}
            </span>
            <button
              className="crm-icon-button"
              aria-label="Open guide"
              onClick={() => setOnboarding(true)}
            >
              <Icon name="help" />
            </button>
            <button
              className="crm-user"
              onClick={() => navigate("settings")}
              aria-label="Workspace settings"
            >
              LS
            </button>
          </div>
        </header>
        <main className="crm-content" inert={readOnly && section !== "leads"}>
          <div className="crm-page-heading">
            <div>
              <span className="crm-eyebrow">LOCAL PLUMBING SERVICES</span>
              <h1>{current.title}</h1>
              <p>{current.description}</p>
            </div>
            <div className="crm-search">
              <Icon name="search" size={18} />
              <input
                ref={search}
                aria-label="Search workspace"
                placeholder={
                  section === "leads"
                    ? "Search leads, sources and campaigns…"
                    : serviceMode
                      ? "Search customers and jobs…"
                      : "Search workspace…"
                }
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <kbd>⌘ K</kbd>
            </div>
          </div>
          {storageWarning && (
            <div className="crm-alert error" role="alert">
              Storage needs attention. Download a JSON backup in Settings before
              closing the app.
            </div>
          )}
          {query &&
            [
              "dashboard",
              "agent",
              "settings",
              "ai",
              "reports",
              "automations",
            ].includes(section) && (
              <div className="crm-card crm-search-results">
                <h3>Search results</h3>
                {[
                  ...s.firms
                    .filter((f) =>
                      f.name.toLowerCase().includes(query.toLowerCase()),
                    )
                    .map((f) => ({
                      id: f.id,
                      name: f.name,
                      label: serviceMode ? "Customer" : "Company",
                      open: () => setEditor({ kind: "firm", item: f }),
                    })),
                  ...s.contacts
                    .filter((c) =>
                      `${c.name} ${c.email}`
                        .toLowerCase()
                        .includes(query.toLowerCase()),
                    )
                    .map((c) => ({
                      id: c.id,
                      name: c.name,
                      label: "Contact",
                      open: () => setEditor({ kind: "contact", item: c }),
                    })),
                  ...s.deals
                    .filter((d) =>
                      d.name.toLowerCase().includes(query.toLowerCase()),
                    )
                    .map((d) => ({
                      id: d.id,
                      name: d.name,
                      label: d.service ? "Zlecenie" : "Szansa",
                      open: () =>
                        d.service
                          ? openJob(d)
                          : setEditor({ kind: "deal", item: d }),
                    })),
                ]
                  .slice(0, 10)
                  .map((item) => (
                    <button key={item.id} onClick={item.open}>
                      {item.name}
                      <small>{item.label}</small>
                    </button>
                  ))}
                <p className="crm-muted">
                  Showing up to 10 results. Use the section filters for more.
                  odpowiednim module.
                </p>
              </div>
            )}
          {plumbing &&
            ["dashboard", "ads", "calls", "tracking", "localSeo"].includes(
              section,
            ) && (
              <PlumbingDashboard
                wid={cloud!.id!}
                view={
                  section as
                    | "dashboard"
                    | "ads"
                    | "calls"
                    | "tracking"
                    | "localSeo"
                }
                navigate={navigate}
                openLead={(id) => {
                  setLeadId(id);
                  navigate("leads");
                }}
                askAgent={askAgent}
                notify={notify}
                readOnly={Boolean(readOnly)}
              />
            )}
          {section === "leads" &&
            (cloud?.id ? (
              <LeadHub
                initialLeadId={leadId}
                demo={cloudName === "Local Plumbing Services · DEMO"}
                wid={cloud.id}
                query={query}
                readOnly={!!readOnly}
                notify={notify}
              />
            ) : (
              <section className="crm-card p-6">
                <h2>Lead Hub potrzebuje bazy</h2>
                <p className="mt-4! text-sm leading-relaxed">
                  Run the SQLite edition or configure Supabase to persist Lead
                  Hub history.
                </p>
                <p className="mt-4! text-sm">
                  <code>npm run dev:localdb</code> · Instrukcja w README
                  repozytorium.
                </p>
              </section>
            ))}
          {section === "dashboard" && !plumbing && !query && (
            <>
              <CommandCenter
                navigate={navigate}
                askAgent={askAgent}
                serviceMode={serviceMode}
              />
              <StatsBoard navigate={navigate} serviceMode={serviceMode} />
            </>
          )}
          {section === "dashboard" && !plumbing && !serviceMode && (
            <>
              {isSqlite() && cloud?.id && (
                <Marketing
                  wid={cloud.id}
                  openConnectors={() => navigate("connectors")}
                />
              )}
              <Dashboard {...props} />
            </>
          )}{" "}
          {section === "dashboard" && !plumbing && serviceMode && (
            <>
              <ServiceDashboard openJob={openJob} navigate={navigate} />
              {isSqlite() && cloud?.id && (
                <details className="crm-card mt-6 p-6">
                  <summary className="cursor-pointer font-semibold">
                    Wyniki marketingu, Google i kampanii
                  </summary>
                  <div className="mt-5">
                    <Marketing
                      wid={cloud.id}
                      openConnectors={() => navigate("connectors")}
                    />
                  </div>
                </details>
              )}
            </>
          )}
          {["brain", "connectors"].includes(section) &&
            (!isSqlite() || !cloud?.id) && <LocalUnavailable />}
          {section === "brain" && isSqlite() && cloud?.id && (
            <Brain wid={cloud.id} openAi={() => navigate("ai")} />
          )}
          {section === "connectors" && isSqlite() && cloud?.id && (
            <Connectors
              wid={cloud.id}
              mailSettings={() => navigate("settings")}
              openAi={() => navigate("ai")}
              openBrain={() => navigate("brain")}
            />
          )}
          {section === "ai" && (
            <>
              <Copilot
                workspace={cloud?.id ?? "local"}
                readOnly={!!readOnly}
                request={agentPrompt}
              />
              {isSqlite() && cloud?.id && (
                <details className="crm-card mt-6 p-6">
                  <summary className="cursor-pointer font-semibold">
                    Company Brain assistant · knowledge and marketing analysis
                  </summary>
                  <div className="mt-5">
                    <AiAgent
                      wid={cloud.id}
                      storageBusy={storageBusy}
                      onApplied={() => reloadDatabase?.()}
                    />
                  </div>
                </details>
              )}
            </>
          )}
          {section === "reports" && (
            <Reports
              notify={notify}
              navigate={navigate}
              readOnly={!!readOnly}
            />
          )}
          {section === "automations" && (
            <Automations notify={notify} readOnly={!!readOnly} />
          )}
          {section === "companies" &&
            (serviceMode ? (
              <ServiceClients
                query={query}
                edit={(item) => setEditor({ kind: "firm", item })}
                openJob={openJob}
                notify={notify}
              />
            ) : (
              <Firms {...props} />
            ))}{" "}
          {section === "deals" &&
            (serviceMode ? (
              <ServiceJobs
                query={query}
                openJob={openJob}
                notify={notify}
                openClients={() => navigate("companies")}
              />
            ) : (
              <Deals {...props} />
            ))}{" "}
          {section === "contacts" && <Contacts {...props} />}{" "}
          {section === "tasks" && <Tasks {...props} />}{" "}
          {section === "mail" && (
            <Mailbox
              query={query}
              compose={compose}
              edit={(mail) => setComposer({ mail })}
              notify={notify}
              token={token}
              status={status}
            />
          )}{" "}
          {section === "agent" && (
            <Agent notify={notify} navigate={() => navigate("mail")} />
          )}{" "}
          {section === "settings" && (
            <Settings
              token={token}
              setToken={setToken}
              status={status}
              setStatus={setStatus}
              notify={notify}
              showOnboarding={() => setOnboarding(true)}
            />
          )}
          <footer className="crm-footer">
            <span>Your local plumbing growth workspace.</span>
            <span>Local Plumbing Services · GBP · Europe/London</span>
          </footer>
        </main>
      </div>
      {navOpen && (
        <Modal title="Nawigacja" onClose={() => setNavOpen(false)}>
          <div className="crm-mobile-nav">{nav}</div>
        </Modal>
      )}
      {editor && (
        <EntityForm
          editor={editor}
          serviceMode={serviceMode}
          onClose={() => setEditor(null)}
          onSaved={() =>
            notify(
              cloud
                ? "Changes applied. Check sync status."
                : "Zmiany zapisane w CRM.",
            )
          }
        />
      )}{" "}
      {jobEditor && (
        <JobForm
          {...jobEditor}
          close={() => setJobEditor(null)}
          saved={() => notify("Job saved. Check sync status.")}
        />
      )}
      {composer && (
        <Composer
          {...composer}
          onClose={() => setComposer(null)}
          notify={notify}
        />
      )}{" "}
      {onboarding && (
        <Onboarding
          finish={(target) => {
            s.setOnboarded(true);
            setOnboarding(false);
            if (target) navigate(target);
          }}
        />
      )}
      {notice && (
        <div className="crm-toast" role="status">
          <Icon name="help" size={18} />
          <span>{notice}</span>
          <button
            className="crm-icon-button"
            aria-label="Close komunikat"
            onClick={() => setNotice("")}
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
