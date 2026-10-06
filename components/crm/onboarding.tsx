"use client";
import { useState } from "react";
import { useCrm } from "@/stores/crm-store";
import { isSqlite, isCloud } from "@/lib/growth/model";
import { Modal, Icon, Badge } from "./ui";
import type { Section } from "@/lib/crm/model";
export default function Onboarding({
  finish,
}: {
  finish: (section?: Section) => void;
}) {
  const [step, setStep] = useState(0),
    s = useCrm(),
    services = s.businessMode === "services";
  const steps = [
    {
      icon: "spark",
      label: "1 / 3 · TWOJA PRZESTRZEŃ",
      title: "Jak pracuje Twoja firma?",
      text: "Choose widok dopasowany do codziennej pracy. Możesz zmienić go w dowolnej chwili w menu.",
      bullets: [],
    },
    {
      icon: services ? "clock" : "deals",
      label: "2 / 3 · PIERWSZY KROK",
      title: services
        ? "Customer. Due date. Dobrze wykonana praca."
        : "Dodaj firmę. Save kolejny krok.",
      text: services
        ? "Add customer z kontaktem i notatkami. Zarezerwuj usługę, wybierz termin oraz osobę lub stanowisko. Po realizacji zakończ pracę — historia zostanie na karcie klienta."
        : "Dodaj firmę i osobę kontaktową. Save szansę sprzedaży oraz zadanie z terminem. Owner overview pokaże wyniki Twojej pracy.",
      bullets: services
        ? [
            "Kalendarz sprawdza nakładające się aktywne rezerwacje.",
            "Jobs mają status i historię zmian.",
            "Wartości są w PLN, terminy według Europe/London.",
          ]
        : [
            "Przesuwaj szanse po etapach sprzedaży.",
            "Zaznacz wykonane zadanie, żeby zamknąć kolejny krok.",
            "Wykresy liczą wartości z Twoich danych.",
          ],
    },
    {
      icon: "agent",
      label: "3 / 3 · GDY POTRZEBUJESZ WIĘCEJ",
      title: "Możesz też podpiąć e-maile i AI.",
      text: "Email pomaga przygotować wiadomość, a agent follow-up tworzy szkice. Po podłączeniu Resend zatwierdzasz wysyłkę samodzielnie.",
      bullets: [
        isSqlite()
          ? "AI Brain: OpenRouter lub zalogowane CLI Codex / Claude Code."
          : isCloud()
            ? "W chmurze bezpośrednia wysyłka wymaga integracji dla przestrzeni."
            : "Program pocztowy otwiera szkic w Twojej aplikacji pocztowej.",
        isSqlite()
          ? "Company Brain: podaj stronę firmy i sprawdź wygenerowaną wiedzę."
          : "Owner overview i kopie działają bez dodatkowych integracji.",
        "Integracje są opcjonalne. Podłączysz je później; AI może zużywać płatny limit.",
      ],
    },
  ];
  const item = steps[step];
  return (
    <Modal title="Zacznij z Local Plumbing Services Growth OS" onClose={() => finish()}>
      <div className="crm-onboarding">
        <div className="crm-onboarding-icon">
          <Icon name={item.icon} size={36} />
        </div>
        <Badge tone="purple">{item.label}</Badge>
        <h2>{item.title}</h2>
        <p>{item.text}</p>
        {step === 0 && (
          <div
            className="growth-onboarding-choices"
            role="radiogroup"
            aria-label="Workflow firmy"
          >
            {(
              [
                {
                  mode: "crm",
                  title: "CRM i sprzedaż",
                  text: "Customers, kontakty, szanse sprzedaży i follow-upy.",
                  icon: "deals",
                },
                {
                  mode: "services",
                  title: "Plumbing services",
                  text: "Customers, zarezerwowane prace, terminy i historia realizacji.",
                  icon: "clock",
                },
              ] as const
            ).map((option) => (
              <button
                key={option.mode}
                role="radio"
                aria-checked={s.businessMode === option.mode}
                className={`growth-choice ${s.businessMode === option.mode ? "selected" : ""}`}
                onClick={() => s.setBusinessMode(option.mode)}
              >
                <Icon name={option.icon} size={24} />
                <strong>{option.title}</strong>
                <small>{option.text}</small>
                <span>
                  {s.businessMode === option.mode ? "Wybrano" : "Choose"}
                </span>
              </button>
            ))}
          </div>
        )}
        {item.bullets.length > 0 && (
          <ul>
            {item.bullets.map((b) => (
              <li key={b}>
                <Icon name="check" size={17} />
                {b}
              </li>
            ))}
          </ul>
        )}
        <div
          className="crm-onboarding-progress"
          aria-label={`Krok ${step + 1} z 3`}
        >
          {steps.map((_, i) => (
            <span key={i} className={i === step ? "active" : ""} />
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
            onClick={() => (step < 2 ? setStep(step + 1) : finish("dashboard"))}
          >
            {step < 2 ? "Dalej" : "Zaczynamy"}
            <Icon name="arrow" size={17} />
          </button>
        </div>
      </div>
    </Modal>
  );
}
