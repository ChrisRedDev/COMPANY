import { guardMail, resend } from "@/lib/crm/mail-server";
export async function POST(request: Request) {
  const denied = guardMail(request);
  if (denied) return denied;
  try {
    await resend("/domains");
    return Response.json({
      ok: true,
      message:
        "Połączenie z Resend działa. Nadawca musi należeć do zweryfikowanej domeny.",
    });
  } catch {
    return Response.json(
      {
        error:
          "Nie udało się potwierdzić połączenia. Sprawdź klucz, jego uprawnienia do odczytu domen i dostęp do api.resend.com.",
      },
      { status: 502 },
    );
  }
}
