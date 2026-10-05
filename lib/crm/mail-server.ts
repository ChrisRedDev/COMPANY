import "server-only";
import { timingSafeEqual } from "node:crypto";
import { validEmail } from "./model";
export function mailConfig() {
  return {
    key: process.env.RESEND_API_KEY,
    from: process.env.CRM_MAIL_FROM,
    token: process.env.CRM_MAIL_ACCESS_TOKEN,
  };
}
export function guardMail(request: Request) {
  if (process.env.NEXT_PUBLIC_CRM_MODE === "cloud")
    return Response.json(
      {
        error:
          "Wysyłka w chmurze wymaga integracji poczty przypisanej do przestrzeni. Dostępna w kolejnej fazie.",
      },
      { status: 503 },
    );
  const config = mailConfig();
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    return Response.json(
      { error: "Niedozwolone źródło żądania." },
      { status: 403 },
    );
  if (!config.key || !config.from || !config.token)
    return Response.json(
      {
        error:
          "Uzupełnij konfigurację poczty w .env.local i uruchom serwer ponownie.",
      },
      { status: 503 },
    );
  const token =
    request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  const a = Buffer.from(token),
    b = Buffer.from(config.token);
  if (a.length !== b.length || !timingSafeEqual(a, b))
    return Response.json(
      { error: "Nieprawidłowy token dostępu do poczty." },
      { status: 401 },
    );
  return null;
}
export async function resend(path: string, options: RequestInit = {}) {
  const response = await fetch(`https://api.resend.com${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${mailConfig().key}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
    signal: AbortSignal.timeout(15000),
  });
  const data = await response.json();
  if (!response.ok)
    throw Error(
      response.status === 401
        ? "Dostawca odrzucił klucz API."
        : response.status === 429
          ? "Limit dostawcy został przekroczony. Spróbuj później."
          : "Dostawca odrzucił żądanie. Sprawdź zweryfikowaną domenę, nadawcę i limity konta.",
    );
  return data;
}
export function validateMail(
  value: unknown,
): value is { id: string; to: string; subject: string; body: string } {
  if (typeof value !== "object" || !value) return false;
  const m = value as Record<string, unknown>;
  return (
    typeof m.id === "string" &&
    /^[a-zA-Z0-9-]{1,100}$/.test(m.id) &&
    typeof m.to === "string" &&
    validEmail(m.to) &&
    typeof m.subject === "string" &&
    m.subject.trim().length > 0 &&
    m.subject.length <= 200 &&
    !/[\r\n]/.test(m.subject) &&
    typeof m.body === "string" &&
    m.body.trim().length > 0 &&
    m.body.length <= 20000
  );
}
