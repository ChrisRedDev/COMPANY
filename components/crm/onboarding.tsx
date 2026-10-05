"use client";
import { isCloud, isSqlite, isDatabase } from "@/lib/growth/model";
import { useState } from "react";
import { Modal, Icon, Badge } from "./ui";
import type { Section } from "@/lib/crm/model";
const STEPS = [
  {
    icon: "spark",
    label: "WITAJ W AI EVOLUTION POLSKA",
    title: "Mniej chaosu. Więcej dobrych relacji.",
    text: "To Twoje miejsce na firmy, kontakty, szanse sprzedaży i kolejne kroki. Krótki przewodnik pokaże, od czego zacząć.",
    bullets: [
      "Polski interfejs, złotówki i lokalne daty.",
      isDatabase()
        ? isSqlite()
          ? "Każda firma ma osobną przestrzeń i dane."
          : "Każda przestrzeń ma osobne dane i role zespołu."
        : "Dane startowe są demonstracyjne — możesz je usunąć.",
      isDatabase()
        ? isSqlite()
          ? "Zmiany zapisują się w lokalnym pliku SQLite."
          : "Zmiany zapisują się w Supabase — sprawdzaj stan synchronizacji."
        : "Zmiany zapisują się w tej przeglądarce.",
    ],
  },
  {
    icon: "deals",
    label: "OD KONTAKTU DO WSPÓŁPRACY",
    title: "Dodaj firmę. Poznaj osobę. Zapisz szansę.",
    text: "Firmy porządkują Twoich klientów. Kontakty przechowują dane osób, a szanse pokazują projekty i ich wartość.",
    bullets: [
      "Zmień etap na tablicy lub przeciągnij kartę.",
      "Dodaj zadanie, żeby pamiętać o kolejnym kroku.",
      "Pulpit liczy prognozę z Twoich danych.",
    ],
  },
  {
    icon: "mail",
    label: "POCZTA, KTÓRA JEST POD RĘKĄ",
    title: "Możesz też podpiąć e-maile.",
    text: isCloud()
      ? "W chmurze możesz przygotować szkic lub otworzyć program pocztowy. Bezpośrednia wysyłka wymaga przyszłej integracji poczty przypisanej do przestrzeni."
      : "Resend pozwala wysyłać wiadomości z własnej domeny. Gmail lub Outlook możesz otworzyć przez swój program pocztowy.",
    bullets: [
      "Do bezpośredniej wysyłki potrzebujesz konfiguracji dostawcy.",
      "Niepodłączona poczta nie wysyła wiadomości.",
      "CRM nie synchronizuje skrzynki odbiorczej.",
    ],
  },
  {
    icon: "agent",
    label: "TWÓJ AGENT FOLLOW-UP",
    title: "Agent przygotuje. Ty zatwierdzisz.",
    text: "Włącz agenta, żeby przygotować krótkie follow-upy na podstawie otwartych szans. Edytuj szkic i zatwierdź go w Poczcie.",
    bullets: [
      "Agent działa po kliknięciu i korzysta z polskiego szablonu.",
      "Wysyłka wymaga podłączonej poczty i potwierdzonej podstawy kontaktu.",
      "Kopie danych pobierzesz w Ustawieniach.",
    ],
  },
  ...(isSqlite()
    ? [
        {
          icon: "file",
          label: "PAMIĘĆ FIRMY",
          title: "Ze strony firmy do Company Brain.",
          text: "W Company Brain podaj link do strony. Wybrany model przygotuje ofertę, kontekst marki i propozycje marketingowe. Sprawdź źródła i zapisz szkic.",
          bullets: [
            "Braki danych są oznaczone, a nie zgadywane.",
            "Uzupełnij wiedzę notatkami i odpowiedziami właściciela.",
            "Eksport ZIP otworzysz jako skarbiec Obsidiana.",
          ],
        },
        {
          icon: "spark",
          label: "AI I TWOJE DANE",
          title: "Podłącz model. Zapytaj. Zatwierdź zmianę.",
          text: "W AI Brain podłącz OpenRouter API lub lokalne CLI Codex / Claude Code. Agent analizuje dane bieżącej firmy i proponuje zadania lub notatki.",
          bullets: [
            "Subskrypcja ChatGPT działa przez zalogowane Codex CLI.",
            "W Konektorach zaimportujesz kampanie i podłączysz WordPress lub PostHog.",
            "Model może zużywać płatne API lub limit subskrypcji.",
          ],
        },
      ]
    : []),
];
export default function Onboarding({
  finish,
}: {
  finish: (section?: Section) => void;
}) {
  const [step, setStep] = useState(0);
  const item = STEPS[step];
  return (
    <Modal title="Jak działa Evolution Growth OS" onClose={() => finish()}>
      <div className="crm-onboarding">
        <div className="crm-onboarding-icon">
          <Icon name={item.icon} size={40} />
        </div>
        <Badge tone="purple">{item.label}</Badge>
        <h2>{item.title}</h2>
        <p>{item.text}</p>
        <ul>
          {item.bullets.map((b) => (
            <li key={b}>
              <Icon name="check" size={17} />
              {b}
            </li>
          ))}
        </ul>
        <div
          className="crm-onboarding-progress"
          aria-label={`Krok ${step + 1} z ${STEPS.length}`}
        >
          {STEPS.map((_, i) => (
            <span className={i === step ? "active" : ""} key={i} />
          ))}
        </div>
        <div className="crm-form-actions">
          {step > 0 ? (
            <button
              className="crm-button secondary"
              onClick={() => setStep(step - 1)}
            >
              Wstecz
            </button>
          ) : (
            <button className="crm-text-button" onClick={() => finish()}>
              Pomiń przewodnik
            </button>
          )}
          <button
            className="crm-button"
            onClick={() =>
              step < STEPS.length - 1 ? setStep(step + 1) : finish("dashboard")
            }
          >
            {step < STEPS.length - 1 ? "Dalej" : "Zaczynamy"}
            <Icon name="arrow" size={17} />
          </button>
        </div>
      </div>
    </Modal>
  );
}
