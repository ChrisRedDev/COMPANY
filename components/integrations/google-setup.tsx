"use client";
import { useState } from "react";
import type { GoogleProvider, Resource } from "@/lib/integrations/model";
import { Field } from "../crm/ui";
export default function GoogleSetup({
  provider,
  resource,
  busy,
  save,
}: {
  provider: GoogleProvider;
  resource: Resource;
  busy: boolean;
  save: (resource: Resource) => Promise<void>;
}) {
  const [value, setValue] = useState(
    provider === "ga4" ? resource.propertyId || "" : resource.siteUrl || "",
  );
  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        void save(
          provider === "ga4" ? { propertyId: value } : { siteUrl: value },
        );
      }}
    >
      <Field
        label={
          provider === "ga4"
            ? "Identyfikator usługi GA4"
            : "Usługa Search Console"
        }
      >
        <input
          required
          disabled={busy}
          maxLength={provider === "ga4" ? 20 : 1000}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={
            provider === "ga4"
              ? "123456789 — nie G-…"
              : "sc-domain:twoja-firma.pl lub https://twoja-firma.pl/"
          }
        />
      </Field>
      <p className="crm-muted">
        {provider === "ga4"
          ? "Numer znajdziesz w GA4 → Administracja → Szczegóły usługi. Konto Google musi mieć co najmniej rolę Przeglądający."
          : "Wpisz dokładną nazwę usługi widoczną w Search Console, łącznie z prefiksem lub końcowym ukośnikiem. Konto musi mieć dostęp do tej witryny."}{" "}
        Zapis dotyczy tylko bieżącej przestrzeni.
      </p>
      <button
        className="crm-button secondary justify-self-start"
        disabled={busy || !value.trim()}
      >
        Zapisz usługę {provider === "ga4" ? "GA4" : "Search Console"}
      </button>
    </form>
  );
}
