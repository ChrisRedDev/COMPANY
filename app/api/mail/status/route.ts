import { mailConfig } from "@/lib/crm/mail-server";
export const dynamic = "force-dynamic";
export async function GET() {
  const c = mailConfig();
  return Response.json(
    {
      configured:
        process.env.NEXT_PUBLIC_CRM_MODE !== "cloud" &&
        !!(c.key && c.from && c.token),
      provider: "Resend",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
