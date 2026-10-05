"use client";
import { useState } from "react";
import Image from "next/image";
import { browserSupabase } from "@/lib/supabase/browser";
import { Field } from "../crm/ui";
export default function Auth() {
  const [signup, setSignup] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const values = new FormData(event.currentTarget),
      credentials = {
        email: String(values.get("email")).trim(),
        password: String(values.get("password")),
      };
    try {
      const client = browserSupabase();
      const result = signup
        ? await client.auth.signUp({
            ...credentials,
            options: { emailRedirectTo: window.location.origin },
          })
        : await client.auth.signInWithPassword(credentials);
      if (result.error) throw result.error;
      if (signup && !result.data.session)
        setMessage("Sprawdź e-mail i potwierdź konto. Następnie zaloguj się.");
    } catch {
      setMessage(
        "Operacja nie powiodła się. Sprawdź dane, potwierdzenie konta i konfigurację Auth.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="crm flex min-h-screen items-center justify-center bg-slate-50 p-5">
      <section className="crm-card w-full max-w-[30em] p-8">
        <Image
          src="/assets/brand/evolution-mark.png"
          alt="AI Evolution Polska"
          width={52}
          height={52}
        />
        <p className="crm-eyebrow mt-5">AI EVOLUTION POLSKA</p>
        <h1 className="my-3 text-3xl">Evolution Growth OS</h1>
        <p className="crm-muted mb-6">
          Jedna przestrzeń dla Twojej firmy. Bezpieczny dostęp do CRM, zespołu i
          danych.
        </p>
        <form onSubmit={submit} className="grid gap-4">
          <Field label="Adres e-mail">
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
            />
          </Field>
          <Field label="Hasło">
            <input
              name="password"
              type="password"
              autoComplete={signup ? "new-password" : "current-password"}
              required
              minLength={signup ? 12 : 1}
              maxLength={128}
            />
          </Field>
          <button className="crm-button" disabled={busy}>
            {busy ? "Łączenie…" : signup ? "Utwórz konto" : "Zaloguj się"}
          </button>
        </form>
        {message && (
          <p role="status" className="crm-alert mt-4">
            {message}
          </p>
        )}
        <button
          className="crm-text-button mt-4"
          disabled={busy}
          onClick={() => {
            setSignup(!signup);
            setMessage("");
          }}
        >
          {signup ? "Mam już konto" : "Utwórz nowe konto"}
        </button>
        <p className="crm-muted mt-5">
          Dane przestrzeni są przechowywane w Supabase. Nigdy nie wpisuj tu
          kluczy API.
        </p>
      </section>
    </div>
  );
}
