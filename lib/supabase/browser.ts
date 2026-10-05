"use client";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
let client: SupabaseClient | undefined;
export function configured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
export function browserSupabase() {
  if (!configured()) throw Error("Uzupełnij konfigurację Supabase.");
  return (client ??= createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  ));
}
export async function cloudRequest(path: string, init: RequestInit = {}) {
  const {
    data: { session },
  } = await browserSupabase().auth.getSession();
  if (!session) throw Error("Zaloguj się ponownie.");
  const response = await fetch(`/api/workspaces${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      ...init.headers,
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
  });
  const result = await response.json();
  if (!response.ok)
    throw Error(result.error || "Nie udało się połączyć z bazą.");
  return result;
}
