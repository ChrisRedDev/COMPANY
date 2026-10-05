import { authenticated, databaseError, readBody } from "@/lib/supabase/server";
import { validUuid, ROLES } from "@/lib/growth/model";
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) {
  const auth = await authenticated(request);
  if (auth instanceof Response) return auth;
  const { id } = await context.params;
  if (!validUuid(id))
    return Response.json(
      { error: "Nieprawidłowa przestrzeń." },
      { status: 400 },
    );
  const { data, error } = await auth.db
    .from("workspace_members")
    .select("user_id,role")
    .eq("workspace_id", id);
  if (error) return databaseError(error);
  return Response.json(
    { members: data },
    { headers: { "Cache-Control": "no-store" } },
  );
}
export async function POST(request: Request, context: Context) {
  const auth = await authenticated(request);
  if (auth instanceof Response) return auth;
  const { id } = await context.params;
  try {
    const { userId, role } = await readBody(request);
    if (
      !validUuid(id) ||
      typeof userId !== "string" ||
      !validUuid(userId) ||
      !ROLES.includes(role)
    )
      return Response.json(
        { error: "Sprawdź UUID użytkownika i rolę." },
        { status: 400 },
      );
    const { error } = await auth.db.rpc("set_workspace_member", {
      wid: id,
      member_id: userId,
      member_role: role,
    });
    if (error) return databaseError(error);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Nieprawidłowe dane." }, { status: 400 });
  }
}
