import { authenticated, databaseError, readBody } from "@/lib/supabase/server";
import { validUuid, validateSnapshot } from "@/lib/growth/model";
type Context = { params: Promise<{ id: string }> };
export const dynamic = "force-dynamic";
export async function GET(request: Request, context: Context) {
  const auth = await authenticated(request);
  if (auth instanceof Response) return auth;
  const { id } = await context.params;
  if (!validUuid(id))
    return Response.json(
      { error: "Nieprawidłowa przestrzeń." },
      { status: 400 },
    );
  const { data, error } = await auth.db.rpc("read_workspace", { wid: id });
  if (error) return databaseError(error);
  return Response.json(data, { headers: { "Cache-Control": "no-store" } });
}
export async function PUT(request: Request, context: Context) {
  const auth = await authenticated(request);
  if (auth instanceof Response) return auth;
  const { id } = await context.params;
  if (!validUuid(id))
    return Response.json(
      { error: "Nieprawidłowa przestrzeń." },
      { status: 400 },
    );
  try {
    const state = validateSnapshot(await readBody(request));
    const { data, error } = await auth.db.rpc("save_workspace", {
      wid: id,
      expected_revision: state.revision,
      crm: state.data,
      prefs: state.settings,
    });
    if (error) return databaseError(error);
    return Response.json({ revision: data });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Nieprawidłowe dane." },
      { status: 400 },
    );
  }
}
