import { authenticated, readBody } from "@/lib/supabase/server";
import { cloudLeads } from "@/lib/leads/cloud";
import { leadHandler } from "@/lib/leads/http";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string; path?: string[] }> };
async function handler(request: Request, context: Context) {
  const auth = await authenticated(request);
  if (auth instanceof Response) return auth;
  const { id, path = [] } = await context.params;
  try {
    const body = request.method === "GET" ? {} : await readBody(request);
    return await leadHandler(request, id, path, body, cloudLeads(auth.db));
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Nieprawidłowe dane." },
      { status: 400 },
    );
  }
}
export const GET = handler,
  POST = handler,
  PUT = handler;
