import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
async function enter(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Pomiń przewodnik" }).click();
}
async function navigate(page: import("@playwright/test").Page, name: string) {
  await page
    .locator("aside")
    .getByRole("button", { name, exact: true })
    .click();
}
test("onboarding wyjaśnia pocztę i agenta, a po ukończeniu nie wraca", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Dalej", exact: true }).click();
  await page.getByRole("button", { name: "Dalej", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Możesz też podpiąć e-maile i AI." }),
  ).toBeVisible();
  await expect(page.getByText(/agent follow-up tworzy szkice/)).toBeVisible();
  await page.getByRole("button", { name: "Zaczynamy" }).click();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Pulpit", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
test("pełny CRM: firma, kontakt, szansa, zadanie, agent i trwały zapis", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await enter(page);
  await navigate(page, "Firmy");
  await page.getByRole("button", { name: "Dodaj firmę", exact: true }).click();
  await page.getByLabel("Nazwa firmy").fill("Żółć Studio");
  await page.getByLabel("NIP (opcjonalnie)").fill("123");
  await page.getByRole("button", { name: "Zapisz", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "NIP",
  );
  await page.getByLabel("NIP (opcjonalnie)").fill("5260250995");
  await page.getByLabel("Miasto").fill("Łódź");
  await page.getByRole("button", { name: "Zapisz", exact: true }).click();
  await expect(page.getByText("Żółć Studio", { exact: true })).toBeVisible();
  await page.reload();
  await navigate(page, "Kontakty");
  await page
    .getByRole("button", { name: "Dodaj kontakt", exact: true })
    .click();
  await page
    .getByLabel("Firma", { exact: true })
    .selectOption({ label: "Żółć Studio" });
  await page.getByLabel("Imię i nazwisko").fill("Anna Żółć");
  await page.getByLabel("E-mail", { exact: true }).fill("anna@example.com");
  await page.getByLabel("Mam podstawę").check();
  await page.getByRole("button", { name: "Zapisz", exact: true }).click();
  await navigate(page, "Szanse sprzedaży");
  await page.getByRole("button", { name: "Dodaj szansę", exact: true }).click();
  await page
    .getByLabel("Firma", { exact: true })
    .selectOption({ label: "Żółć Studio" });
  await page.getByLabel("Nazwa szansy").fill("Nowe wdrożenie");
  await page.getByLabel("Wartość (PLN)").fill("12000");
  await page.getByRole("button", { name: "Zapisz", exact: true }).click();
  await page.getByLabel("Etap: Nowe wdrożenie").selectOption("Oferta");
  await expect(
    page
      .locator(".crm-kanban-column")
      .filter({ has: page.getByRole("heading", { name: /Oferta/ }) }),
  ).toContainText("Nowe wdrożenie");
  await navigate(page, "Zadania");
  await page
    .getByRole("button", { name: "Dodaj zadanie", exact: true })
    .click();
  await page.getByLabel("Treść zadania").fill("Przygotuj analizę");
  await page.getByRole("button", { name: "Zapisz", exact: true }).click();
  await page
    .getByRole("checkbox", { name: "Ukończ: Przygotuj analizę" })
    .click();
  await page.getByRole("button", { name: "Ukończone", exact: true }).click();
  await expect(page.getByText("Przygotuj analizę")).toBeVisible();
  await navigate(page, "Agent follow-up");
  await page.getByLabel("Włącz agenta follow-up").check();
  await page.getByRole("button", { name: "Przygotuj follow-upy" }).click();
  await page.getByRole("button", { name: "Przygotuj follow-upy" }).click();
  await navigate(page, "Poczta");
  await expect(
    page.getByText("Żółć Studio — kolejny krok we współpracy", { exact: true }),
  ).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Zatwierdź i wyślij" }),
  ).toBeDisabled();
  await page.reload();
  await navigate(page, "Poczta");
  await expect(
    page.getByText("Żółć Studio — kolejny krok we współpracy", { exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("kopie i eksport zawierają polskie dane, usuwanie działa", async ({
  page,
}) => {
  await enter(page);
  await navigate(page, "Firmy");
  const csv = page.waitForEvent("download");
  await page.getByRole("button", { name: "Eksportuj CSV" }).click();
  const csvDownload = await csv;
  expect(csvDownload.suggestedFilename()).toMatch(/^firmy-/);
  expect(await readFile((await csvDownload.path())!, "utf8")).toContain(
    "Firma;NIP;Miasto;Branża",
  );
  await navigate(page, "Ustawienia");
  const backup = page.waitForEvent("download");
  await page.getByRole("button", { name: "Pobierz kopię JSON" }).click();
  const backupDownload = await backup;
  expect(backupDownload.suggestedFilename()).toMatch(/^ai-evolution-crm-/);
  const contents = await readFile((await backupDownload.path())!);
  expect(JSON.parse(contents.toString()).data.firms).toHaveLength(5);
  page.on("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Wyczyść dane demonstracyjne / bieżące" })
    .click();
  await navigate(page, "Firmy");
  await expect(
    page.getByRole("heading", { name: "Brak firm w tym widoku" }),
  ).toBeVisible();
  await navigate(page, "Ustawienia");
  await page.locator('input[type="file"]').setInputFiles({
    name: "kopia.json",
    mimeType: "application/json",
    buffer: contents,
  });
  await navigate(page, "Firmy");
  await expect(page.getByText("Nova Studio", { exact: true })).toBeVisible();
});
test("telefon: nawigacja, formularz i brak poziomego przepełnienia", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await enter(page);
  await page.getByRole("button", { name: "Otwórz nawigację" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Firmy", exact: true })
    .click();
  await page.getByRole("button", { name: "Dodaj firmę", exact: true }).click();
  await page.getByLabel("Nazwa firmy").fill("Mobilna firma");
  await page.getByRole("button", { name: "Zapisz", exact: true }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
test("API blokuje wysyłkę bez konfiguracji, polska strona 404 działa", async ({
  request,
}) => {
  const status = await request.get("/api/mail/status");
  expect(status.status()).toBe(200);
  const info = await status.json();
  if (!info.configured) {
    const send = await request.post("/api/mail/send", {
      data: { to: "someone@example.com" },
    });
    expect(send.status()).toBe(503);
  }
  const missing = await request.get("/brak-strony");
  expect(missing.status()).toBe(404);
  expect(await missing.text()).toContain("Nie znaleziono strony");
});

test("błędny zapis przeglądarki nie blokuje uruchomienia CRM", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "ai-evolution-crm-v1",
      JSON.stringify({ version: 1, state: { firms: "bad" } }),
    ),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Pomiń przewodnik" }).click();
  await expect(
    page.getByRole("heading", { name: "Pulpit", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("alert").filter({ hasText: "Zapis lokalny wymaga uwagi" }),
  ).toBeVisible();
});
test("tryb usługowy w przeglądarce zachowuje rezerwację, także z wartością zero", async ({
  page,
}) => {
  await enter(page);
  await page.getByLabel("Tryb pracy").selectOption("services");
  await navigate(page, "Zlecenia");
  await page
    .getByRole("button", { name: "Zarezerwuj pracę", exact: true })
    .click();
  await page.getByLabel("Nazwa pracy").fill("Konsultacja wstępna");
  await page.getByLabel("Wartość zlecenia (PLN)").fill("0");
  await page
    .getByRole("button", { name: "Zapisz zlecenie", exact: true })
    .click();
  await page.reload();
  await expect(page.getByLabel("Tryb pracy")).toHaveValue("services");
  await navigate(page, "Zlecenia");
  await expect(
    page.getByRole("heading", { name: "Konsultacja wstępna", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Edytuj zlecenie", exact: true })
    .click();
  await expect(page.getByLabel("Wartość zlecenia (PLN)")).toHaveValue("0");
  await page.getByRole("button", { name: "Zamknij", exact: true }).click();
  await page.getByLabel("Tryb pracy").selectOption("crm");
  await navigate(page, "Szanse sprzedaży");
  await expect(
    page.getByRole("heading", { name: "Konsultacja wstępna", exact: true }),
  ).toHaveCount(0);
});
