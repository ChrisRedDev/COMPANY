"use client";
import { useState, useRef, type FormEvent } from "react";
import { useCrm } from "@/stores/crm-store";
import {
  id,
  validEmail,
  draftFollowup,
  type Contact,
  type Mail,
} from "@/lib/crm/model";
import { Icon, Badge, Empty, Modal, Field } from "./ui";
export type MailStatus = {
  configured: boolean;
  verified: boolean;
  error?: string;
};
export function Mailbox({
  query,
  compose,
  edit,
  notify,
  token,
  status,
}: {
  query: string;
  compose: (contact?: Contact) => void;
  edit: (mail: Mail) => void;
  notify: (s: string) => void;
  token: string;
  status: MailStatus;
}) {
  const s = useCrm();
  const [filter, setFilter] = useState("all");
  const [busy, setBusy] = useState<string | null>(null);
  const running = useRef(new Set<string>());
  const [view, setView] = useState<Mail | null>(null);
  const visible = s.mails.filter(
    (m) =>
      (filter === "all" ||
        (filter === "draft" &&
          (m.status === "draft" || m.status === "failed")) ||
        (filter === "sent" &&
          (m.status === "accepted" || m.status === "external"))) &&
      `${m.to} ${m.subject} ${m.body}`
        .toLocaleLowerCase("pl")
        .includes(query.toLocaleLowerCase("pl")),
  );
  async function send(mail: Mail) {
    if (running.current.has(mail.id)) return;
    if (!token) {
      notify("Wpisz token dostępu do poczty w Ustawieniach.");
      return;
    }
    if (!status.configured) {
      notify("Najpierw skonfiguruj pocztę w Ustawieniach.");
      return;
    }
    if (!confirm(`Wysłać wiadomość „${mail.subject}” do ${mail.to}?`)) return;
    const contact = s.contacts.find((c) => c.id === mail.contactId);
    if (!contact?.consent || mail.to !== contact.email) {
      notify("Najpierw potwierdź podstawę kontaktu w edycji osoby.");
      return;
    }
    running.current.add(mail.id);
    setBusy(mail.id);
    s.saveMail({ ...mail, status: "sending", error: undefined });
    try {
      const response = await fetch("/api/mail/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: mail.id,
          to: mail.to,
          subject: mail.subject,
          body: mail.body,
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw Error(result.error || "Nie udało się wysłać wiadomości.");
      s.saveMail({
        ...mail,
        status: "accepted",
        providerId: result.id,
        sentAt: new Date().toISOString(),
        error: undefined,
      });
      notify(
        "Resend przyjął wiadomość. Status nie oznacza potwierdzonego doręczenia.",
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Wysyłka nie została potwierdzona.";
      s.saveMail({ ...mail, status: "failed", error: message });
      notify(message);
    } finally {
      running.current.delete(mail.id);
      setBusy(null);
    }
  }
  function external(mail: Mail) {
    window.location.href = `mailto:${encodeURIComponent(mail.to)}?subject=${encodeURIComponent(mail.subject)}&body=${encodeURIComponent(mail.body)}`;
    s.saveMail({ ...mail, status: "external" });
    notify(
      "Otwarto program pocztowy. CRM nie potwierdza wysłania tej wiadomości.",
    );
  }
  const labels: Record<Mail["status"], string> = {
    draft: "Szkic",
    sending: "Wysyłanie…",
    accepted: "Przyjęta przez Resend",
    failed: "Błąd wysyłki",
    external: "Otwarta w programie pocztowym",
  };
  return (
    <>
      <div className="crm-info-bar">
        <Icon name="mail" />
        <div>
          <strong>
            {status.configured
              ? "Resend skonfigurowany"
              : "Podłącz swoją pocztę"}
          </strong>
          <span>
            {status.configured
              ? "Możesz wysyłać po podaniu tokenu sesji. Doręczenie sprawdzisz u dostawcy."
              : "Pracuj na szkicach, otwórz Gmail/Outlook przez program pocztowy lub skonfiguruj Resend w Ustawieniach."}
          </span>
        </div>
        <Badge tone={status.configured ? "green" : "neutral"}>
          {status.configured ? "Konfiguracja gotowa" : "Brak integracji"}
        </Badge>
      </div>
      <div className="crm-toolbar">
        <div className="crm-segmented">
          {[
            ["all", "Wszystkie"],
            ["draft", "Do zatwierdzenia"],
            ["sent", "Historia"],
          ].map(([value, label]) => (
            <button
              key={value}
              className={filter === value ? "active" : ""}
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <button className="crm-button" onClick={() => compose()}>
          <Icon name="plus" size={18} />
          Nowa wiadomość
        </button>
      </div>
      <section className="crm-card">
        {visible.length ? (
          visible.map((m) => (
            <article className="crm-mail-item" key={m.id}>
              <span className="crm-avatar tone-0">
                <Icon name={m.agent ? "agent" : "mail"} />
              </span>
              <div className="crm-mail-text">
                <button className="crm-deal-title" onClick={() => setView(m)}>
                  {m.subject}
                </button>
                <small>Do: {m.to}</small>
                <p>{m.body.slice(0, 110)}…</p>
                {m.error && <p className="crm-error">{m.error}</p>}
                <Badge
                  tone={
                    m.status === "accepted"
                      ? "green"
                      : m.status === "failed"
                        ? "red"
                        : "neutral"
                  }
                >
                  {labels[m.status]}
                </Badge>
              </div>
              <div className="crm-mail-actions">
                {["draft", "failed"].includes(m.status) && (
                  <>
                    <button
                      className="crm-button secondary"
                      onClick={() => edit(m)}
                    >
                      Edytuj
                    </button>
                    <button
                      className="crm-button secondary"
                      onClick={() => external(m)}
                    >
                      Program pocztowy
                    </button>
                    <button
                      className="crm-button"
                      disabled={busy !== null || !status.configured}
                      onClick={() => void send(m)}
                    >
                      {busy === m.id ? "Wysyłanie…" : "Zatwierdź i wyślij"}
                    </button>
                  </>
                )}
                <button
                  className="crm-icon-button danger"
                  disabled={m.status === "sending"}
                  aria-label={`Usuń wiadomość ${m.subject}`}
                  onClick={() => {
                    if (confirm("Usunąć tę wiadomość z historii CRM?"))
                      s.deleteMail(m.id);
                  }}
                >
                  <Icon name="trash" size={16} />
                </button>
              </div>
            </article>
          ))
        ) : (
          <Empty
            title="Tutaj zaczyna się rozmowa"
            description="Napisz wiadomość lub poproś agenta o przygotowanie follow-upów."
            action={
              <button className="crm-button" onClick={() => compose()}>
                Utwórz wiadomość
              </button>
            }
          />
        )}
      </section>
      {view && (
        <Modal title="Podgląd wiadomości" onClose={() => setView(null)}>
          <div className="crm-form">
            <Badge>{labels[view.status]}</Badge>
            <h3>{view.subject}</h3>
            <p className="crm-muted">Do: {view.to}</p>
            <p className="crm-mail-body">{view.body}</p>
            {view.providerId && <small>ID dostawcy: {view.providerId}</small>}
          </div>
        </Modal>
      )}
    </>
  );
}
export function Composer({
  contact,
  mail,
  onClose,
  notify,
}: {
  contact?: Contact;
  mail?: Mail;
  onClose: () => void;
  notify: (s: string) => void;
}) {
  const s = useCrm();
  const [contactId, setContactId] = useState(
    mail?.contactId ?? contact?.id ?? s.contacts[0]?.id ?? "",
  );
  const initial = s.contacts.find((c) => c.id === contactId);
  const [to, setTo] = useState(mail?.to ?? initial?.email ?? "");
  const [subject, setSubject] = useState(mail?.subject ?? "");
  const [body, setBody] = useState(mail?.body ?? "");
  const [error, setError] = useState("");
  function template() {
    const person = s.contacts.find((c) => c.id === contactId),
      firm = s.firms.find((f) => f.id === person?.companyId);
    if (!person || !firm)
      return setError("Wybierz kontakt przypisany do firmy.");
    const draft = draftFollowup(
      person,
      firm,
      s.deals.find(
        (d) =>
          d.companyId === firm.id &&
          !["Wygrana", "Przegrana"].includes(d.stage),
      ),
      s.sender,
    );
    setSubject(draft.subject);
    setBody(draft.body);
  }
  function save(e: FormEvent) {
    e.preventDefault();
    if (!validEmail(to) || !subject.trim() || !body.trim())
      return setError("Uzupełnij poprawnego odbiorcę, temat i treść.");
    s.saveMail({
      id: mail?.id ?? id(),
      contactId,
      to: to.trim(),
      subject: subject.trim(),
      body: body.trim(),
      status: "draft",
      created: mail?.created ?? new Date().toISOString(),
      agent: mail?.agent ?? false,
    });
    notify("Szkic zapisany. Wiadomość nie została wysłana.");
    onClose();
  }
  return (
    <Modal
      title={mail ? "Edytuj szkic" : "Nowa wiadomość"}
      wide
      onClose={onClose}
    >
      <form className="crm-form" onSubmit={save}>
        {error && (
          <div className="crm-alert error" role="alert">
            {error}
          </div>
        )}
        <Field label="Kontakt">
          <select
            required
            value={contactId}
            onChange={(e) => {
              setContactId(e.target.value);
              setTo(
                s.contacts.find((c) => c.id === e.target.value)?.email ?? "",
              );
            }}
          >
            <option value="">Wybierz kontakt</option>
            {s.contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} · {s.firms.find((f) => f.id === c.companyId)?.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Do">
          <input
            type="email"
            required
            maxLength={254}
            value={to}
            readOnly
            onChange={(e) => setTo(e.target.value)}
          />
        </Field>
        <div className="crm-inline">
          <Badge tone="purple">POLSKI FOLLOW-UP</Badge>
          <button type="button" className="crm-text-button" onClick={template}>
            <Icon name="spark" size={16} />
            Użyj szablonu agenta
          </button>
        </div>
        <Field label="Temat">
          <input
            required
            maxLength={200}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </Field>
        <Field label="Treść">
          <textarea
            required
            maxLength={20000}
            rows={9}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </Field>
        <p className="crm-muted">
          Szkic można wysłać po zatwierdzeniu, gdy poczta jest podłączona.
          Adresy example.com są demonstracyjne.
        </p>
        <div className="crm-form-actions">
          <button
            className="crm-button secondary"
            type="button"
            onClick={onClose}
          >
            Anuluj
          </button>
          <button className="crm-button" type="submit">
            Zapisz szkic
          </button>
        </div>
      </form>
    </Modal>
  );
}
export function Agent({
  notify,
  navigate,
}: {
  notify: (s: string) => void;
  navigate: () => void;
}) {
  const s = useCrm();
  const [generated, setGenerated] = useState<number | null>(null);
  const eligible = s.contacts.filter(
    (c) =>
      c.consent &&
      s.deals.some(
        (d) =>
          d.companyId === c.companyId &&
          !["Wygrana", "Przegrana"].includes(d.stage),
      ),
  );
  const pending = s.mails.filter(
    (m) => m.agent && ["draft", "failed"].includes(m.status),
  );
  function generate() {
    if (!s.agentEnabled) return;
    let n = 0;
    for (const c of eligible) {
      if (
        s.mails.some(
          (m) =>
            m.contactId === c.id &&
            m.agent &&
            ["draft", "failed", "sending"].includes(m.status),
        )
      )
        continue;
      const f = s.firms.find((f) => f.id === c.companyId);
      if (!f) continue;
      const d = s.deals.find(
        (d) =>
          d.companyId === f.id && !["Wygrana", "Przegrana"].includes(d.stage),
      );
      const draft = draftFollowup(c, f, d, s.sender);
      s.saveMail({
        id: id(),
        contactId: c.id,
        to: c.email,
        ...draft,
        status: "draft",
        created: new Date().toISOString(),
        agent: true,
      });
      n++;
    }
    setGenerated(n);
    notify(
      n
        ? `Agent przygotował ${n} szkiców do zatwierdzenia.`
        : "Brak nowych szkiców. Sprawdź kontakty lub istniejącą kolejkę.",
    );
  }
  return (
    <>
      <section className="crm-agent-hero">
        <span className="crm-agent-symbol">
          <Icon name="agent" size={36} />
        </span>
        <Badge tone="purple">TWÓJ ASYSTENT RELACJI</Badge>
        <h2>Follow-up, o którym nie zapomnisz.</h2>
        <p>
          Agent regułowy przygotowuje polskie wiadomości na podstawie kontaktów
          i otwartych szans. Ty sprawdzasz treść i zatwierdzasz wysyłkę.
        </p>
        <label className="crm-toggle-label">
          <input
            type="checkbox"
            checked={s.agentEnabled}
            onChange={(e) => s.setAgent(e.target.checked)}
          />
          <span>
            {s.agentEnabled ? "Agent włączony" : "Włącz agenta follow-up"}
          </span>
        </label>
      </section>
      <div className="crm-agent-steps">
        {[
          {
            n: "01",
            title: "Wybiera kontakty",
            text: "Tylko osoby z potwierdzoną podstawą kontaktu i otwartą szansą.",
          },
          {
            n: "02",
            title: "Przygotowuje szkice",
            text: "Łączy nazwę firmy, projekt i Twój podpis w krótkiej wiadomości.",
          },
          {
            n: "03",
            title: "Czeka na zatwierdzenie",
            text: "W Poczcie edytujesz tekst i wysyłasz przez podłączonego dostawcę.",
          },
        ].map((step) => (
          <article className="crm-card" key={step.n}>
            <span className="crm-step-number">{step.n}</span>
            <h3>{step.title}</h3>
            <p>{step.text}</p>
          </article>
        ))}
      </div>
      <section className="crm-card crm-agent-control">
        <div>
          <h3>Przygotuj kolejną serię wiadomości</h3>
          <p>
            {eligible.length} kwalifikujących się kontaktów · {pending.length}{" "}
            szkiców czeka na decyzję.
          </p>
          <small>
            Agent działa po kliknięciu. Nie uruchamia wysyłki w tle ani
            generatywnego modelu AI.
          </small>
        </div>
        <div className="crm-inline">
          <button className="crm-button secondary" onClick={navigate}>
            Przejdź do poczty
          </button>
          <button
            className="crm-button"
            disabled={!s.agentEnabled || !eligible.length}
            onClick={generate}
          >
            <Icon name="spark" size={18} />
            Przygotuj follow-upy
          </button>
        </div>
      </section>
      {!eligible.length && (
        <div className="crm-alert">
          W Kontaktach zaznacz potwierdzenie podstawy kontaktu i przypisz
          otwartą szansę do firmy. Dane demonstracyjne nie mają tego
          potwierdzenia.
        </div>
      )}
      {generated !== null && (
        <div className="crm-alert success">
          Nowe szkice: {generated}. Agent pomija kontakty z już oczekującym
          szkicem.
        </div>
      )}
    </>
  );
}
