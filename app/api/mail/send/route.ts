import {
  guardMail,
  resend,
  mailConfig,
  validateMail,
} from "@/lib/crm/mail-server";
export async function POST(request: Request) {
  const denied = guardMail(request);
  if (denied) return denied;
  try {
    const body = await request.text();
    if (body.length > 30000)
      return Response.json(
        { error: "Wiadomość jest za duża." },
        { status: 413 },
      );
    const mail = JSON.parse(body);
    if (!validateMail(mail))
      return Response.json(
        { error: "Sprawdź odbiorcę, temat i treść wiadomości." },
        { status: 400 },
      );
    if (/@(?:[^@.]+\.)?example\.(com|org|net)$/i.test(mail.to))
      return Response.json(
        {
          error:
            "Adresy demonstracyjne example.com nie są odbiorcami rzeczywistej wysyłki.",
        },
        { status: 400 },
      );
    const result = await resend("/emails", {
      method: "POST",
      headers: { "Idempotency-Key": `crm-${mail.id}` },
      body: JSON.stringify({
        from: mailConfig().from,
        to: [mail.to],
        subject: mail.subject,
        text: mail.body,
      }),
    });
    return Response.json({ id: result.id, status: "accepted" });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof SyntaxError
            ? "Nieprawidłowy format wiadomości."
            : error instanceof Error && error.name !== "TimeoutError"
              ? error.message
              : "Nie udało się potwierdzić wysyłki. Ponowienie tego samego szkicu użyje tego samego klucza idempotencji.",
      },
      { status: 502 },
    );
  }
}
