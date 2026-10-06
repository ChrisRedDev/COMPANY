import { guardLocal } from "@/lib/local/guard";
import { finishOAuth } from "@/lib/integrations/google-oauth";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const denied = guardLocal(request, true);
  if (denied) return denied;
  try {
    return await finishOAuth(request);
  } catch {
    return Response.json(
      {
        error:
          "Nieprawidłowy powrót logowania Google. Sprawdź adres aplikacji i rozpocznij logowanie ponownie.",
      },
      {
        status: 400,
        headers: {
          "Cache-Control": "no-store",
          "Referrer-Policy": "no-referrer",
        },
      },
    );
  }
}
