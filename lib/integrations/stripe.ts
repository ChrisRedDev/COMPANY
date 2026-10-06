import "server-only";
import { apiJson, IntegrationError } from "./http";
import type { IntegrationResult, PaymentsReport } from "./model";

type Money = { amount: number; currency: string };
type Charge = {
  amount: number;
  amount_refunded: number;
  currency: string;
  paid: boolean;
  status: string;
  created: number;
};

export function stripeConfigured() {
  return /^(sk|rk)_(live|test)_[A-Za-z0-9]{10,}$/.test(
    process.env.STRIPE_SECRET_KEY || "",
  );
}

function day(seconds: number) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Warsaw",
  }).format(new Date(seconds * 1000));
}

export function summarizeStripe(
  balance: { available?: Money[]; pending?: Money[] },
  charges: Charge[],
  from: number,
  to: number,
): PaymentsReport {
  const sum = (list: Money[] = [], currency: string) =>
    list
      .filter((m) => m.currency === currency)
      .reduce((s, m) => s + m.amount / 100, 0);
  const counts = new Map<string, number>();
  for (const c of charges)
    counts.set(c.currency, (counts.get(c.currency) || 0) + 1);
  const currency = counts.has("pln")
    ? "pln"
    : [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ||
      balance.available?.[0]?.currency ||
      "pln";
  const ok = charges.filter(
    (c) => c.currency === currency && c.paid && c.status === "succeeded",
  );
  const daily = new Map<string, number>();
  for (let t = from; t <= to; t += 86400) daily.set(day(t), 0);
  for (const c of ok)
    daily.set(
      day(c.created),
      (daily.get(day(c.created)) || 0) + (c.amount - c.amount_refunded) / 100,
    );
  const gross = ok.reduce((s, c) => s + c.amount / 100, 0),
    refunded = ok.reduce((s, c) => s + c.amount_refunded / 100, 0);
  return {
    currency: currency.toUpperCase(),
    from: day(from),
    to: day(to),
    gross,
    refunded,
    net: gross - refunded,
    count: ok.length,
    failed: charges.filter(
      (c) => c.currency === currency && c.status === "failed",
    ).length,
    average: ok.length ? gross / ok.length : 0,
    available: sum(balance.available, currency),
    pending: sum(balance.pending, currency),
    daily: [...daily.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, amount]) => ({ date, amount })),
    truncated: charges.length >= 100,
  };
}

export async function readStripe(): Promise<IntegrationResult> {
  if (!stripeConfigured())
    throw new IntegrationError("Ustaw STRIPE_SECRET_KEY w .env.local.", 400);
  const headers = {
    Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
  };
  const to = Math.floor(Date.now() / 1000),
    from = to - 30 * 86400;
  const balance = (await apiJson("https://api.stripe.com/v1/balance", {
    headers,
  })) as { available?: Money[]; pending?: Money[] };
  const list = (await apiJson(
    `https://api.stripe.com/v1/charges?limit=100&created[gte]=${from}`,
    { headers },
  )) as { data?: Charge[] };
  if (
    !Array.isArray(list.data) ||
    list.data.some(
      (c) =>
        !Number.isSafeInteger(c.amount) ||
        !Number.isSafeInteger(c.amount_refunded) ||
        typeof c.currency !== "string" ||
        !Number.isSafeInteger(c.created),
    )
  )
    throw new IntegrationError("Nieprawidłowa odpowiedź Stripe.");
  const payments = summarizeStripe(balance, list.data, from, to);
  return {
    summary: `Stripe: ${payments.count} udanych płatności z 30 dni (${payments.currency}).${payments.truncated ? " Odczytano pierwsze 100 transakcji." : ""}`,
    payments,
  };
}
