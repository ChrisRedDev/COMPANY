import { authenticated, databaseError, readBody } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const auth = await authenticated(request);
  if (auth instanceof Response) return auth;
  const { data, error } = await auth.db
    .from("workspace_members")
    .select("role,workspaces(id,name)")
    .eq("user_id", auth.user.id);
  if (error) return databaseError(error);
  return Response.json(
    { workspaces: data.map((row) => ({ ...row.workspaces, role: row.role })) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
export async function POST(request: Request) {
  const auth = await authenticated(request);
  if (auth instanceof Response) return auth;
  try {
    const { name } = await readBody(request);
    if (typeof name !== "string" || !name.trim() || name.trim().length > 120)
      return Response.json(
        { error: "Podaj nazwę przestrzeni (do 120 znaków)." },
        { status: 400 },
      );
    const { data, error } = await auth.db.rpc("create_workspace", {
      workspace_name: name.trim(),
    });
    if (error) return databaseError(error);
    return Response.json({ id: data }, { status: 201 });
  } catch {
    return Response.json({ error: "Nieprawidłowe dane." }, { status: 400 });
  }
}
