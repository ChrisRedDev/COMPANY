import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import { test, expect, type Page } from "@playwright/test";
async function ready(page: Page, keepGuide = false) {
  await page.goto("/");
  const formToggle = page.getByText("Nowa przestrzeń firmy", { exact: true });
  await expect(formToggle).toHaveAttribute("aria-disabled", "false");
  if (!(await page.getByLabel("Nazwa nowej przestrzeni").isVisible()))
    await page.getByText("Nowa przestrzeń firmy", { exact: true }).click();
  await page
    .getByLabel("Nazwa nowej przestrzeni")
    .fill(`Firma lokalna ${Date.now()}`);
  await page
    .getByRole("button", { name: "Utwórz przestrzeń", exact: true })
    .click();
  await expect(
    page.getByText("Zapisano w SQLite", { exact: true }),
  ).toBeVisible();
  const skip = page.getByRole("button", { name: "Pomiń przewodnik" });
  await expect(skip).toBeVisible();
  if (!keepGuide) await skip.click();
  await expect(
    page.getByText("Zapisano w SQLite", { exact: true }),
  ).toBeVisible();
}
test("SQLite zapisuje CRM, przełącza przestrzenie i pobiera spójną kopię", async ({
  page,
}) => {
  await ready(page);
  await page.getByRole("button", { name: "Firmy", exact: true }).click();
  await page
    .getByRole("button", { name: "Dodaj firmę", exact: true })
    .first()
    .click();
  await page
    .getByLabel("Nazwa firmy", { exact: true })
    .fill("Test dysku SQLite");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Zapisz", exact: true })
    .click();
  await expect(
    page.getByText("Zapisano w SQLite", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("ai-evolution-crm-v1")),
  ).toBeNull();
  await page.reload();
  await expect(
    page.getByText("Zapisano w SQLite", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Firmy", exact: true }).click();
  await expect(
    page.getByText("Test dysku SQLite", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Ustawienia", exact: true }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Pobierz całą bazę SQLite" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toContain(".sqlite");
  const copy = new DatabaseSync((await file.path())!, { readOnly: true });
  try {
    const rows = copy.prepare("SELECT snapshot FROM workspaces").all();
    expect(
      rows.some((r) => String(r.snapshot).includes("Test dysku SQLite")),
    ).toBe(true);
  } finally {
    copy.close();
  }
});
test("Company Brain: zapis, linki, import Markdown i eksport Obsidian", async ({
  page,
}) => {
  await ready(page);
  await page
    .getByRole("button", { name: "Company Brain", exact: true })
    .click();
  await page.getByRole("button", { name: "Nowa notatka", exact: true }).click();
  await page.getByLabel("Tytuł notatki").fill("Oferta firmy");
  await page
    .getByLabel("Treść Markdown", { exact: true })
    .fill("# Oferta\n\nNasze usługi. [[Proces obsługi]]");
  await page
    .getByRole("button", { name: "Zapisz notatkę", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: /Oferta firmy/ }),
  ).toBeVisible();
  await page.locator('input[type="file"]').setInputFiles({
    name: "Proces obsługi.md",
    mimeType: "text/markdown",
    buffer: Buffer.from("# Proces\n\nKontakt po zapytaniu. [[Oferta firmy]]"),
  });
  await expect(
    page.getByRole("button", { name: /Proces obsługi/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Oferta firmy/ }).click();
  await page
    .getByRole("button", { name: "Proces obsługi", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: "Proces obsługi", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Linki przychodzące", { exact: true }),
  ).toBeVisible();
  if (process.env.UPDATE_LOCAL_SCREENSHOTS)
    await page.screenshot({ path: "docs/screenshots/local-brain.png" });
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Eksport do Obsidiana" }).click();
  expect((await download).suggestedFilename()).toBe("company-brain.zip");
});
test("Import kampanii zasila dashboard; konektory i AI nie udają połączenia", async ({
  page,
}) => {
  await ready(page);
  await page.getByRole("button", { name: "Konektory", exact: true }).click();
  const date = new Date().toLocaleDateString("en-CA", {
    timeZone: "Europe/Warsaw",
  });
  await page.locator('input[type="file"]').setInputFiles({
    name: "ads.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      "date;source;campaign;spend;impressions;clicks;leads;qualified;revenue\n" +
        Array.from({ length: 30 }, (_, i) => {
          const day = new Date(date + "T12:00:00Z");
          day.setUTCDate(day.getUTCDate() - 29 + i);
          const leads = 3 + (i % 7) + Math.floor(i / 5);
          return `${day.toISOString().slice(0, 10)};${i % 3 ? "google_ads" : "microsoft_ads"};${i % 3 ? "Usługi lokalne" : "Konsultacje projektowe"};${leads * 20};1000;80;${leads};${Math.floor(leads * 0.6)};${leads * 120}\n`;
        }).join(""),
    ),
  });
  await expect(page.getByText(/Zapisano 30 wierszy/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Sprawdź odczyt" }).first(),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Pulpit", exact: true }).click();
  await expect(page.getByText("Usługi lokalne", { exact: true })).toBeVisible();
  await expect(page.getByText("6.00×", { exact: true }).first()).toBeVisible();
  if (process.env.UPDATE_LOCAL_SCREENSHOTS)
    await page.screenshot({
      path: "docs/screenshots/local-dashboard.png",
      fullPage: true,
    });
  await page.getByRole("button", { name: "AI Brain", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Analizuj", exact: true }),
  ).toBeDisabled();
  await page.getByLabel("Dostawca AI").selectOption("codex");
  await expect(page.getByText(/CLI niedostępne lub wyłączone/)).toBeVisible();
});
test("lokalna baza blokuje obcy origin i obsługuje mobilną wiedzę", async ({
  page,
  request,
}) => {
  const blocked = await request.get("/api/local/workspaces", {
    headers: { Origin: "https://evil.invalid" },
  });
  expect(blocked.status()).toBe(403);
  await page.setViewportSize({ width: 390, height: 844 });
  await ready(page);
  await page.getByRole("button", { name: "Otwórz nawigację" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Company Brain", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Company Brain", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("okno agenta: wybór modelu, odpowiedź i zatwierdzenie z testowym dostawcą", async ({
  page,
}) => {
  await ready(page);
  let executed = false;
  const message = () => ({
    id: "test-message",
    prompt: "Analiza firmy",
    answer:
      "To jest odpowiedź dostawcy testowego. Proponuję notatkę do zatwierdzenia.",
    provider: "openrouter",
    model: "test/wybrany-model",
    actions: [
      {
        id: "test-action",
        status: executed ? "executed" : "pending",
        payload: {
          type: "create_note",
          title: "Proces firmy",
          category: "processes",
          content: "# Proces\nTest",
        },
      },
    ],
  });
  await page.route("**/api/local/workspaces/*/ai**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/models")) {
      await route.fulfill({
        json: { models: [{ id: "test/wybrany-model", name: "Model testowy" }] },
      });
      return;
    }
    if (path.endsWith("/decision")) {
      expect(route.request().postDataJSON().approve).toBe(true);
      executed = true;
      await route.fulfill({ json: { messages: [message()] } });
      return;
    }
    if (route.request().method() === "POST") {
      expect(route.request().postDataJSON().model).toBe("test/wybrany-model");
      await route.fulfill({
        json: { messages: [message()], usage: { total_tokens: 10 } },
      });
      return;
    }
    await route.fulfill({
      json: {
        status: {
          openrouter: true,
          codex: false,
          claude: false,
          cliEnabled: false,
        },
        messages: executed ? [message()] : [],
      },
    });
  });
  await page.getByRole("button", { name: "AI Brain", exact: true }).click();
  await page.getByRole("button", { name: "Pobierz modele" }).click();
  await page.getByLabel("Model AI", { exact: true }).fill("test/wybrany-model");
  await page
    .getByLabel("Wiadomość do agenta", { exact: true })
    .fill("Analiza firmy");
  await page.getByRole("button", { name: "Analizuj", exact: true }).click();
  await expect(page.getByText(/odpowiedź dostawcy testowego/)).toBeVisible();
  if (process.env.UPDATE_LOCAL_SCREENSHOTS)
    await page.screenshot({
      path: "docs/screenshots/local-agent-test-provider.png",
      fullPage: true,
    });
  await page.getByRole("button", { name: "Zatwierdź i wykonaj" }).click();
  expect(executed).toBe(true);
  await expect(
    page.getByRole("heading", { name: "AI Brain", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Wykonano po zatwierdzeniu", { exact: true }),
  ).toBeVisible();
});

test("generator strony: podgląd, zatwierdzenie, zapis wiedzy i eksport z dostawcą testowym", async ({
  page,
  request,
}) => {
  await ready(page);
  const sources = [
    {
      id: "S01",
      url: "https://firma.example",
      text: "Przykładowa treść testowa.",
      checkedAt: "2026-10-05T10:00:00Z",
    },
  ];
  const { parseBrain } = await import("../../lib/knowledge/generation-model");
  const parsed = parseBrain(
    JSON.stringify({
      companyName: "Pracownia Forma",
      summary:
        "Przykład testowy: studio projektowania wnętrz dla klientów z Krakowa. Dane demonstracyjne, nie wynik researchu rzeczywistej firmy.",
      sections: [
        {
          number: 1,
          content:
            "**Marka:** Pracownia Forma · przykład testowy\n**Branża:** projektowanie wnętrz\n**Obszar:** Kraków i okolice\n**Źródło:** CONFIRMED [S01] — dane dostawcy testowego",
        },
        {
          number: 5,
          content:
            "| Usługa | Zakres | Cena |\n|---|---|---|\n| Projekt mieszkania | Koncepcja, układ i dobór materiałów | MISSING |\n| Konsultacja | Omówienie potrzeb i rozwiązań | MISSING |",
        },
        {
          number: 9,
          content:
            "TO CONFIRM: komunikacja spokojna, konkretna, z przykładami realizacji. Bez niepotwierdzonych obietnic efektów.",
        },
        {
          number: 20,
          content:
            "### Propozycje do zatwierdzenia\n- TO CONFIRM: seria poradników o układzie małego mieszkania.\n- TO CONFIRM: post pokazujący etapy współpracy.\n- TO CONFIRM: FAQ o budżecie i terminach projektu.",
        },
      ],
      questions: [
        "Która usługa jest teraz najważniejsza?",
        "Jaki budżet ma idealny klient?",
        "Jakie realizacje można pokazać publicznie?",
      ],
    }),
    sources,
  );
  const draft = {
    id: "test-brain-draft",
    ...parsed,
    sources,
    warnings: ["Przykład dostawcy testowego — bez wywołania płatnego modelu."],
    usage: { total_tokens: 400 },
  };
  await page.route("**/api/local/workspaces/*/ai", async (route) => {
    await route.fulfill({
      json: {
        status: { openrouter: true, codex: false, claude: false },
        messages: [],
      },
    });
  });
  await page.route("**/brain/generate", async (route) => {
    const body = route.request().postDataJSON();
    expect(body.url).toBe("https://firma.example");
    expect(body.model).toBe("test/brain-model");
    await route.fulfill({ json: draft });
  });
  await page.route("**/brain/save-generation", async (route) => {
    expect(route.request().postDataJSON().id).toBe(draft.id);
    const endpoint = route.request().url().replace("/save-generation", "");
    for (const d of draft.documents) {
      const result = await request.post(endpoint, {
        data: { ...d, revision: 0, id: "" },
      });
      expect(result.ok()).toBe(true);
    }
    await route.fulfill({ status: 201, json: { count: 4 } });
  });
  await page
    .getByRole("button", { name: "Company Brain", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Wygeneruj ze strony", exact: true })
    .click();
  await page
    .getByLabel("Adres strony firmy", { exact: true })
    .fill("https://firma.example");
  await page
    .getByLabel("Model generatora", { exact: true })
    .fill("test/brain-model");
  await page
    .getByRole("button", { name: "Wygeneruj mózg firmy", exact: true })
    .click();
  await expect(page.getByTestId("brain-draft-preview")).toContainText(
    "34. Historia zmian",
  );
  await expect(
    page.getByRole("button", { name: "Zatwierdź i zapisz 4 notatki" }),
  ).toBeVisible();
  if (process.env.UPDATE_LOCAL_SCREENSHOTS)
    await page.screenshot({
      path: "docs/screenshots/local-brain-generator.png",
    });
  await page
    .getByRole("button", { name: "Zatwierdź i zapisz 4 notatki" })
    .click();
  await expect(
    page.getByRole("button", { name: "Pobierz do Obsidiana" }),
  ).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Pobierz do Obsidiana" }).click();
  const file = await download;
  const fs = await import("node:fs/promises");
  const archive = await fs.readFile((await file.path())!);
  expect(
    archive.includes(Buffer.from("Pracownia Forma — COMPANY_BRAIN.md")),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Otwórz Company Brain", exact: true })
    .click();
  await page
    .getByRole("button", { name: /Pracownia Forma — COMPANY_BRAIN/ })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Pracownia Forma — COMPANY_BRAIN",
      exact: true,
    }),
  ).toBeVisible();
  if (process.env.UPDATE_LOCAL_SCREENSHOTS)
    await page.screenshot({
      path: "docs/screenshots/local-brain-generated.png",
    });
  await page.getByRole("button", { name: "Konektory", exact: true }).click();
  if (process.env.UPDATE_LOCAL_SCREENSHOTS)
    await page.screenshot({
      path: "docs/screenshots/local-connectors.png",
      fullPage: true,
    });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Otwórz nawigację" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Company Brain", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Wygeneruj ze strony", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Mózg firmy ze strony" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("firma usługowa: onboarding, klienci, terminy, kolizje, historia i trwały tryb", async ({
  page,
}) => {
  await ready(page, true);
  if (process.env.UPDATE_LOCAL_SCREENSHOTS)
    await page.screenshot({ path: "docs/screenshots/premium-onboarding.png" });
  await page.getByRole("radio", { name: /Firma usługowa/ }).click();
  await page.getByRole("button", { name: "Dalej", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "Klient. Termin. Dobrze wykonana praca.",
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Dalej", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Możesz też podpiąć e-maile i AI." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Zaczynamy", exact: true }).click();
  await page.getByRole("button", { name: "Klienci", exact: true }).click();
  await page
    .getByRole("button", { name: "Dodaj klienta", exact: true })
    .first()
    .click();
  await page
    .getByLabel("Imię i nazwisko / nazwa klienta")
    .fill("Anna Kowalska");
  await page.getByLabel("E-mail klienta").fill("anna@example.com");
  await page.getByLabel("Telefon klienta").fill("+48 500 200 300");
  await page.getByLabel("Adres klienta").fill("Warszawa, ul. Słoneczna 12");
  await page
    .getByLabel("Notatki", { exact: true })
    .fill(
      "Preferuje kontakt telefoniczny. Projekt wnętrza z naturalnymi materiałami.",
    );
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Zapisz", exact: true })
    .click();
  await page.getByRole("button", { name: "Zlecenia", exact: true }).click();
  const date = new Date().toLocaleDateString("en-CA", {
    timeZone: "Europe/Warsaw",
  });
  async function fillJob(
    name: string,
    start: string,
    end: string,
    value: string,
    resource = "Anna · projekty",
  ) {
    await page.getByLabel("Nazwa pracy").fill(name);
    await page.getByLabel("Początek pracy").fill(start);
    await page.getByLabel("Koniec pracy").fill(end);
    await page.getByLabel("Wartość zlecenia (PLN)").fill(value);
    await page.getByLabel("Osoba / stanowisko").fill(resource);
  }
  await page
    .getByRole("button", { name: "Zarezerwuj pracę", exact: true })
    .click();
  await fillJob("Projekt wnętrza", `${date}T09:00`, `${date}T11:00`, "1500");
  await page
    .getByRole("button", { name: "Zapisz zlecenie", exact: true })
    .click();
  await expect(
    page.getByText("Zapisano w SQLite", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Zarezerwuj pracę", exact: true })
    .click();
  await fillJob(
    "Konsultacja materiałowa",
    `${date}T10:00`,
    `${date}T12:00`,
    "350",
  );
  await page
    .getByRole("button", { name: "Zapisz zlecenie", exact: true })
    .click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "Ten termin jest zajęty",
  );
  await page.getByLabel("Osoba / stanowisko").fill("Piotr · konsultacje");
  await page
    .getByRole("button", { name: "Zapisz zlecenie", exact: true })
    .click();
  const first = page.getByRole("article").filter({
    has: page.getByRole("heading", { name: "Projekt wnętrza", exact: true }),
  });
  await first
    .getByRole("button", { name: "Rozpocznij pracę", exact: true })
    .click();
  await expect(first.getByText("W realizacji", { exact: true })).toBeVisible();
  await first
    .getByRole("button", { name: "Zakończ pracę", exact: true })
    .click();
  await page.getByLabel("Filtr zleceń").selectOption("all");
  await first.getByText("Historia zlecenia (3)", { exact: true }).click();
  await expect(
    first.getByText("Status: Zakończone", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Pulpit", exact: true }).click();
  await page.getByLabel("Okres realizacji").selectOption("7");
  await expect(
    page.getByRole("group", { name: "Wartość zakończonych realizacji (PLN)" }),
  ).toBeVisible();
  await expect(
    page.getByRole("img", { name: /wszystkich prac:.*Zakończone 1/ }),
  ).toBeVisible();
  const message = page.getByRole("button", { name: "Zamknij komunikat" });
  if (await message.isVisible()) await message.click();
  if (process.env.UPDATE_LOCAL_SCREENSHOTS)
    await page.screenshot({
      path: "docs/screenshots/premium-services-dashboard.png",
      fullPage: true,
    });
  await expect(
    page.getByText("Zapisano w SQLite", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Tryb pracy")).toHaveValue("services");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Klienci", exact: true }).click();
  await page.getByRole("button", { name: /Anna Kowalska/ }).click();
  const profile = page.getByRole("dialog");
  await expect(
    profile.getByRole("heading", { name: "Historia współpracy" }),
  ).toBeVisible();
  await expect(
    profile.getByText("Projekt wnętrza", { exact: true }),
  ).toBeVisible();
  await expect(profile.getByText("Zakończone", { exact: true })).toBeVisible();
  if (process.env.UPDATE_LOCAL_SCREENSHOTS)
    await page.screenshot({
      path: "docs/screenshots/premium-client-history.png",
    });
  await page.getByRole("button", { name: "Zamknij", exact: true }).click();
  await page.getByRole("button", { name: "Ustawienia", exact: true }).click();
  const backupReady = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Pobierz kopię JSON", exact: true })
    .click();
  const file = await backupReady;
  const raw = await readFile((await file.path())!, "utf8");
  const backup = JSON.parse(raw);
  expect(backup.settings.businessMode).toBe("services");
  expect(
    backup.data.deals.find(
      (d: { name: string }) => d.name === "Projekt wnętrza",
    ).service.history,
  ).toHaveLength(3);
  await page.getByLabel("Tryb pracy").selectOption("crm");
  await page.getByRole("button", { name: "Ustawienia", exact: true }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .locator('input[type="file"]')
    .setInputFiles({
      name: "kopia.json",
      mimeType: "application/json",
      buffer: Buffer.from(raw),
    });
  await expect(page.getByLabel("Tryb pracy")).toHaveValue("services");
  await expect(
    page.getByText("Zapisano w SQLite", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Tryb pracy").selectOption("crm");
  await page
    .getByRole("button", { name: "Szanse sprzedaży", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Projekt wnętrza", exact: true }),
  ).toHaveCount(0);
  await page.getByLabel("Tryb pracy").selectOption("services");
  await page.getByRole("button", { name: "Zlecenia", exact: true }).click();
  await page.getByLabel("Filtr zleceń").selectOption("all");
  await expect(
    page.getByRole("heading", { name: "Projekt wnętrza", exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("heading", { name: "Zlecenia", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Zarezerwuj pracę", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
