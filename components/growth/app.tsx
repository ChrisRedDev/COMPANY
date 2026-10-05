"use client";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import Workspace from "../crm/workspace";
import Auth from "./auth";
import CloudWorkspace from "./cloud-workspace";
import { browserSupabase, configured } from "@/lib/supabase/browser";
import { isCloud } from "@/lib/growth/model";
export default function GrowthApp() {
  const [user, setUser] = useState<User | null>(null),
    [ready, setReady] = useState(() => !isCloud() || !configured());
  useEffect(() => {
    if (!isCloud() || !configured()) {
      return;
    }
    const client = browserSupabase();
    let active = true;
    client.auth
      .getSession()
      .then((r) => {
        if (active) {
          setUser(r.data.session?.user ?? null);
          setReady(true);
        }
      })
      .catch(() => {
        if (active) setReady(true);
      });
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      if (active) {
        setUser(session?.user ?? null);
        setReady(true);
      }
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);
  if (!isCloud()) return <Workspace />;
  if (!configured())
    return (
      <main className="crm min-h-screen flex-col gap-4 p-8">
        <h1>Skonfiguruj Supabase</h1>
        <p className="my-4">
          Tryb chmurowy wymaga NEXT_PUBLIC_SUPABASE_URL i
          NEXT_PUBLIC_SUPABASE_ANON_KEY. Uruchom migrację z supabase/migrations
          i zrestartuj aplikację.
        </p>
        <p>
          Dane lokalnego CRM pozostają w przeglądarce. Nie zostały automatycznie
          przeniesione do chmury.
        </p>
      </main>
    );
  if (!ready)
    return (
      <main className="crm p-8" role="status">
        Sprawdzanie sesji…
      </main>
    );
  return user ? <CloudWorkspace key={user.id} user={user} /> : <Auth />;
}
