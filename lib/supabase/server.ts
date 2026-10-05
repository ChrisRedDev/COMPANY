import "server-only";
import { createClient } from "@supabase/supabase-js";
import { isCloud } from "../growth/model";
export async function authenticated(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!isCloud() || !url || !key)
    return Response.json(
      { error: "Tryb Supabase nie jest skonfigurowany." },
      { status: 503 },
    );
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    return Response.json(
      { error: "Niedozwolone pochodzenie żądania." },
      { status: 403 },
    );
  const token = request.headers
    .get("authorization")
    ?.match(/^Bearer (.+)$/)?.[1];
  if (!token || token.length > 8192)
    return Response.json({ error: "Wymagane logowanie." }, { status: 401 });
  const db = createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user)
    return Response.json(
      { error: "Sesja wygasła. Zaloguj się ponownie." },
      { status: 401 },
    );
  return { db, user: data.user };
}
export function databaseError(error: { code?: string; message?: string }) {
  if (error.code === "40001")
    return Response.json(
      {
        error:
          "Konflikt wersji: dane zmieniono na innym urządzeniu. Pobierz kopię bieżących zmian, następnie wczytaj dane z bazy.",
      },
      { status: 409 },
    );
  if (error.code === "42501")
    return Response.json(
      { error: "Brak uprawnień do tej przestrzeni lub operacji." },
      { status: 403 },
    );
  if (error.message?.includes("last_owner"))
    return Response.json(
      { error: "Przestrzeń musi mieć co najmniej jednego właściciela." },
      { status: 400 },
    );
  return Response.json(
    { error: "Operacja bazy nie powiodła się. Sprawdź migrację i dane." },
    { status: 400 },
  );
}
export async function readBody(request: Request) {
  const text = await request.text();
  if (text.length > 5_000_000) throw Error("Dane mogą mieć maksymalnie 5 MB.");
  return JSON.parse(text);
}
