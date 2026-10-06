const { test } = require("node:test");
const assert = require("node:assert/strict");
const { load } = require("./helpers/load-ts.cjs");
const model = load("lib/crm/model.ts"),
  insights = load("lib/crm/insights.ts"),
  builtin = load("lib/ai/builtin.ts"),
  ai = load("lib/ai/model.ts"),
  stripe = load("lib/integrations/stripe.ts", {
    "./http": { apiJson: async () => ({}), IntegrationError: Error },
  });

function data() {
  const d = model.seedData();
  d.tasks.push({
    id: "late",
    companyId: "f2",
    title: "Zaległy telefon",
    date: "2026-01-02",
    done: false,
  });
  d.deals[2].closeDate = "2026-01-05";
  return d;
}

test("insighty wskazują zaległości, ryzyka i sortują je od najważniejszych", () => {
  const list = insights.insights(data(), "2026-10-06");
  const ids = list.map((i) => i.id);
  assert.equal(ids[0], "tasks-overdue");
  assert.ok(ids.includes("deals-late"));
  assert.ok(ids.includes("deals-no-task"));
  const score = insights.healthScore(data(), "2026-10-06");
  assert.ok(score >= 0 && score < 100);
  assert.equal(
    insights.insights(
      { firms: [], contacts: [], deals: [], tasks: [], mails: [] },
      "2026-10-06",
    )[0].id,
    "all-good",
  );
  assert.equal(
    insights.healthScore(
      { firms: [], contacts: [], deals: [], tasks: [], mails: [] },
      "2026-10-06",
    ),
    null,
  );
});

test("przychód miesięczny liczy wygrane i prognozę ważoną", () => {
  const d = model.seedData();
  d.deals = [
    {
      id: "a",
      companyId: "f1",
      name: "A",
      value: 1000,
      probability: 100,
      stage: "Wygrana",
      closeDate: "2026-09-10",
    },
    {
      id: "b",
      companyId: "f1",
      name: "B",
      value: 2000,
      probability: 50,
      stage: "Oferta",
      closeDate: "2026-10-20",
    },
    {
      id: "c",
      companyId: "f1",
      name: "C",
      value: 9000,
      probability: 0,
      stage: "Przegrana",
      closeDate: "2026-10-20",
    },
  ];
  const months = insights.monthlyRevenue(d, "2026-10-06");
  assert.equal(months.length, 7);
  assert.equal(months.find((m) => m.key === "2026-09").won, 1000);
  assert.equal(months.find((m) => m.key === "2026-10").forecast, 1000);
  assert.equal(months.at(-1).key, "2026-11");
  const stats = insights.pipelineStats(d);
  assert.equal(stats.winRate, 50);
  assert.equal(stats.forecast, 1000);
});

function context(extra = {}) {
  const d = data();
  return JSON.stringify({
    date: "2026-10-06",
    marketing: {
      spend: 1000,
      clicks: 500,
      leads: 50,
      qualified: 10,
      revenue: 1500,
      cpa: 20,
      roas: 1.5,
      cvr: 10,
    },
    companies: d.firms.map((f) => ({
      id: f.id,
      name: f.name,
      industry: f.industry,
    })),
    deals: d.deals,
    tasks: d.tasks.filter((t) => !t.done),
    notes: [],
    ...extra,
  });
}

test("wbudowany agent zwraca poprawny format i propozycje dla istniejących firm", () => {
  for (const prompt of [
    "Co powinienem zrobić dzisiaj?",
    "Pokaż ryzyka w sprzedaży",
    "Przeanalizuj lejek i prognozę",
    "Jak idzie marketing?",
    "Zaproponuj notatkę z podsumowaniem",
    "Opowiedz o Nova Studio",
    "cześć",
  ]) {
    const parsed = ai.parseAnswer(builtin.builtinAnswer(prompt, context()));
    assert.ok(parsed.answer.length > 10, prompt);
    const ids = new Set(JSON.parse(context()).companies.map((c) => c.id));
    for (const a of parsed.actions)
      if (a.type === "create_task") assert.ok(ids.has(a.companyId));
  }
  const plan = ai.parseAnswer(
    builtin.builtinAnswer("Co powinienem zrobić dzisiaj?", context()),
  );
  assert.match(plan.answer, /Zaległy telefon/);
  const marketing = ai.parseAnswer(
    builtin.builtinAnswer("Jak idzie marketing?", context()),
  );
  assert.match(marketing.answer, /ROAS poniżej 2/);
  const empty = ai.parseAnswer(
    builtin.builtinAnswer("marketing", context({ marketing: null })),
  );
  assert.match(empty.answer, /Importuj CSV/);
  assert.ok(ai.AGENT_PROVIDERS.includes("builtin"));
  assert.ok(!ai.AI_PROVIDERS.includes("builtin"));
});

test("Stripe: podsumowanie płatności w walucie PLN bez nieudanych i ze zwrotami", () => {
  const from = Date.parse("2026-09-06T10:00:00Z") / 1000,
    to = Date.parse("2026-10-06T10:00:00Z") / 1000;
  const charge = (amount, extra = {}) => ({
    amount,
    amount_refunded: 0,
    currency: "pln",
    paid: true,
    status: "succeeded",
    created: to - 3600,
    ...extra,
  });
  const report = stripe.summarizeStripe(
    { available: [{ amount: 50000, currency: "pln" }], pending: [] },
    [
      charge(10000),
      charge(20000, { amount_refunded: 5000 }),
      charge(99999, { paid: false, status: "failed" }),
      charge(70000, { currency: "eur" }),
    ],
    from,
    to,
  );
  assert.equal(report.currency, "PLN");
  assert.equal(report.count, 2);
  assert.equal(report.gross, 300);
  assert.equal(report.refunded, 50);
  assert.equal(report.net, 250);
  assert.equal(report.failed, 1);
  assert.equal(report.available, 500);
  assert.equal(
    report.daily.reduce((s, d) => s + d.amount, 0),
    250,
  );
  const prev = process.env.STRIPE_SECRET_KEY;
  process.env.STRIPE_SECRET_KEY = "rk_test_abcdefghijkl";
  assert.equal(stripe.stripeConfigured(), true);
  process.env.STRIPE_SECRET_KEY = "pk_test_abc";
  assert.equal(stripe.stripeConfigured(), false);
  if (prev === undefined) delete process.env.STRIPE_SECRET_KEY;
  else process.env.STRIPE_SECRET_KEY = prev;
});
