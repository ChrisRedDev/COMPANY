"use client";
import { isSqlite } from "@/lib/growth/model";
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
import Onboarding from "./onboarding";
const NAV: { id: Section; title: string; description: string }[] = [
  {
    id: "dashboard",
    title: "Pulpit",
    description: "Twoja sprzedaż w jednym miejscu.",
  },
  {
    id: "companies",
    title: "Firmy",
    description: "Poznaj klientów i uporządkuj współpracę.",
  },
  {
    id: "deals",
    title: "Szanse sprzedaży",
    description: "Każdy dobry kontakt ma swój kolejny krok.",
  },
  {
    id: "contacts",
    title: "Kontakty",
    description: "Ludzie, z którymi budujesz relacje.",
  },
  {
    id: "tasks",
    title: "Zadania",
    description: "Plan, który zamienia rozmowy w działanie.",
  },
  {
    id: "mail",
    title: "Poczta",
    description: "Krótkie wiadomości. Dobre rozmowy.",
  },
  {
    id: "agent",
    title: "Agent follow-up",
    description: "Asystent, który pomaga wrócić do kontaktu.",
  },
  {
    id: "brain",
    title: "Company Brain",
    description: "Wiedza firmy w notatkach Markdown i linkach.",
  },
  {
    id: "connectors",
    title: "Konektory",
    description: "Połączenia, importy i stan źródeł danych.",
  },
  {
    id: "ai",
    title: "AI Brain",
    description: "Twój agent, model i propozycje do zatwierdzenia.",
  },
  {
    id: "settings",
    title: "Ustawienia",
    description: "Poczta, podpis i kopie Twoich danych.",
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
  const readOnly = cloud?.readOnly;
  const s = useCrm();
  const [ready, setReady] = useState(false);
  const [section, setSection] = useState<Section>("dashboard");
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
  const notify = useCallback((text: string) => {
    setNotice(text);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setNotice(""), 7000);
  }, []);
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
                "Poprzednia wysyłka nie została potwierdzona. Ponowienie wykorzysta ten sam identyfikator.",
            });
        setReady(true);
        setOnboarding(!readOnly && !current.onboarded);
      })
      .catch(() => {
        if (active) {
          setReady(true);
          notify(
            "Nie udało się odczytać zapisu. Sprawdź ustawienia pamięci przeglądarki.",
          );
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
        "Pamięć przeglądarki jest pełna lub niedostępna. Zmiana nie została trwale zapisana — pobierz kopię w Ustawieniach.",
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
          error: "Nie udało się odczytać statusu poczty.",
        }),
      );
  }, []);
  const navigate = (target: Section) => {
    setSection(target);
    setQuery("");
    setNavOpen(false);
  };
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
  const current = NAV.find((n) => n.id === section)!;
  const nav = (
    <>
      <div className="crm-brand">
        <Image
          src="/assets/brand/evolution-mark.png"
          alt=""
          width={44}
          height={44}
        />
        <div>
          <strong>
            Evolution
            <br />
            <span>Growth OS</span>
          </strong>
          <small>AI EVOLUTION POLSKA</small>
        </div>
      </div>
      <div className="crm-workspace-label">
        <span className="crm-workspace-dot" />
        {cloud?.name || "Mój obszar pracy"}
        <Icon name="check" size={13} />
      </div>
      <div className="crm-nav-caption">PRZESTRZEŃ SPRZEDAŻY</div>
      <nav aria-label="Menu główne">
        {NAV.slice(0, 5).map((n) => (
          <button
            key={n.id}
            aria-label={n.title}
            className={`crm-nav-item ${section === n.id ? "active" : ""}`}
            onClick={() => navigate(n.id)}
            aria-current={section === n.id ? "page" : undefined}
          >
            <Icon name={n.id} />
            <span>{n.title}</span>
            {n.id === "companies" && <small>{s.firms.length}</small>}
            {n.id === "tasks" && (
              <small>{s.tasks.filter((t) => !t.done).length}</small>
            )}
          </button>
        ))}
        <div className="crm-nav-caption">KOMUNIKACJA I AUTOMATYZACJA</div>
        {NAV.slice(5, 7).map((n) => (
          <button
            key={n.id}
            aria-label={n.title}
            className={`crm-nav-item ${section === n.id ? "active" : ""}`}
            onClick={() => navigate(n.id)}
            aria-current={section === n.id ? "page" : undefined}
          >
            <Icon name={n.id} />
            <span>{n.title}</span>
            {n.id === "agent" && <span className="crm-mini-badge">AGENT</span>}
          </button>
        ))}
        <div className="crm-nav-caption">WIEDZA I DANE</div>
        {NAV.filter((n) => ["brain", "connectors", "ai"].includes(n.id)).map(
          (n) => (
            <button
              key={n.id}
              aria-label={n.title}
              className={`crm-nav-item ${section === n.id ? "active" : ""}`}
              onClick={() => navigate(n.id)}
            >
              <Icon
                name={
                  n.id === "brain"
                    ? "companies"
                    : n.id === "ai"
                      ? "agent"
                      : "settings"
                }
              />
              <span>{n.title}</span>
            </button>
          ),
        )}
      </nav>
      <div className="crm-sidebar-bottom">
        <div className="crm-sidebar-promo">
          <Icon name="spark" />
          <strong>Twój kolejny krok z AI</strong>
          <p>
            Uporządkuj relacje.
            <br />
            Daj sobie przestrzeń na rozwój.
          </p>
          <button className="crm-text-button" onClick={() => navigate("agent")}>
            Poznaj agenta <Icon name="arrow" size={15} />
          </button>
        </div>
        <button
          className={`crm-nav-item ${section === "settings" ? "active" : ""}`}
          onClick={() => navigate("settings")}
        >
          <Icon name="settings" />
          <span>Ustawienia</span>
        </button>
        <button
          className="crm-nav-item"
          onClick={() => {
            setNavOpen(false);
            setOnboarding(true);
          }}
        >
          <Icon name="help" />
          <span>Jak to działa?</span>
        </button>
        <div className="crm-local-label">
          <span />
          {cloud
            ? isSqlite()
              ? "Tryb lokalny · SQLite"
              : "Tryb chmurowy · Supabase"
            : "Tryb lokalny · Twoja przeglądarka"}
        </div>
      </div>
    </>
  );
  if (!ready)
    return (
      <main className="crm-loading" role="status">
        <Icon name="spark" size={32} />
        <p>Przygotowujemy Twój obszar pracy…</p>
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
              aria-label="Otwórz nawigację"
              onClick={() => setNavOpen(true)}
            >
              <Icon name="menu" />
            </button>
            <span>Obszar pracy</span>
            <span>/</span>
            <strong>{current.title}</strong>
          </div>
          <div className="crm-topbar-right">
            <span className="crm-save-status">
              <span />
              {cloud
                ? isSqlite()
                  ? "Baza SQLite"
                  : "Baza Supabase"
                : "Zapis w przeglądarce"}
            </span>
            <button
              className="crm-icon-button"
              aria-label="Otwórz przewodnik"
              onClick={() => setOnboarding(true)}
            >
              <Icon name="help" />
            </button>
            <button
              className="crm-user"
              onClick={() => navigate("settings")}
              aria-label="Ustawienia mojego obszaru"
            >
              AE
            </button>
          </div>
        </header>
        <main className="crm-content" inert={readOnly}>
          <div className="crm-page-heading">
            <div>
              <span className="crm-eyebrow">EVOLUTION GROWTH OS</span>
              <h1>{current.title}</h1>
              <p>{current.description}</p>
            </div>
            <div className="crm-search">
              <Icon name="search" size={18} />
              <input
                ref={search}
                aria-label="Szukaj w CRM"
                placeholder="Szukaj w CRM…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <kbd>⌘ K</kbd>
            </div>
          </div>
          {storageWarning && (
            <div className="crm-alert error" role="alert">
              Zapis lokalny wymaga uwagi: nie udało się odczytać lub zapisać
              danych. Pobierz kopię JSON w Ustawieniach przed zamknięciem
              aplikacji.
            </div>
          )}
          {query && ["dashboard", "agent", "settings"].includes(section) && (
            <div className="crm-card crm-search-results">
              <h3>Wyniki wyszukiwania</h3>
              {[
                ...s.firms
                  .filter((f) =>
                    f.name.toLowerCase().includes(query.toLowerCase()),
                  )
                  .map((f) => ({
                    id: f.id,
                    name: f.name,
                    label: "Firma",
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
                    label: "Kontakt",
                    open: () => setEditor({ kind: "contact", item: c }),
                  })),
                ...s.deals
                  .filter((d) =>
                    d.name.toLowerCase().includes(query.toLowerCase()),
                  )
                  .map((d) => ({
                    id: d.id,
                    name: d.name,
                    label: "Szansa",
                    open: () => setEditor({ kind: "deal", item: d }),
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
                Wyświetlamy do 10 wyników. Pełne filtrowanie znajdziesz w
                odpowiednim module.
              </p>
            </div>
          )}
          {section === "dashboard" && (
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
          {["brain", "connectors", "ai"].includes(section) &&
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
          {section === "ai" && isSqlite() && cloud?.id && (
            <AiAgent
              wid={cloud.id}
              storageBusy={storageBusy}
              onApplied={() => reloadDatabase?.()}
            />
          )}
          {section === "companies" && <Firms {...props} />}{" "}
          {section === "deals" && <Deals {...props} />}{" "}
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
            <span>Stworzone dla dobrych relacji.</span>
            <span>AI Evolution Polska · PLN · Europe/Warsaw</span>
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
          onClose={() => setEditor(null)}
          onSaved={() =>
            notify(
              cloud
                ? "Zmiany wprowadzone. Sprawdź stan synchronizacji."
                : "Zmiany zapisane w CRM.",
            )
          }
        />
      )}{" "}
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
            aria-label="Zamknij komunikat"
            onClick={() => setNotice("")}
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
