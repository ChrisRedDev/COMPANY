import { test, expect, type Page } from "@playwright/test";
const ids = [
  "00000000-0000-0000-0000-000000000001",
  "00000000-0000-0000-0000-000000000002",
];
async function provider(page: Page, role = "owner") {
  const saved: Record<
    string,
    {
      data: {
        firms: unknown[];
        contacts: unknown[];
        deals: unknown[];
        tasks: unknown[];
        mails: unknown[];
      };
      settings: { onboarded: boolean; sender: string; agentEnabled: boolean };
      revision: number;
    }
  > = {};
  for (const id of ids)
    saved[id] = {
      data: { firms: [], contacts: [], deals: [], tasks: [], mails: [] },
      settings: { onboarded: true, sender: "Firma", agentEnabled: false },
      revision: 0,
    };
  const user = {
    id: "00000000-0000-0000-0000-000000000003",
    email: "test@example.com",
    aud: "authenticated",
    role: "authenticated",
    app_metadata: {},
    user_metadata: {},
    created_at: new Date().toISOString(),
  };
  const jwt = `${Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url")}.${Buffer.from(JSON.stringify({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")}.test`;
  await page.route("http://127.0.0.1:54329/**", async (route) => {
    if (route.request().method() === "OPTIONS") {
      await route.fulfill({
        status: 204,
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-headers": "*",
          "access-control-allow-methods": "*",
        },
      });
      return;
    }
    const path = new URL(route.request().url()).pathname;
    await route.fulfill({
      json: path.endsWith("/token")
        ? {
            access_token: jwt,
            refresh_token: "refresh-test",
            expires_in: 3600,
            token_type: "bearer",
            user,
          }
        : path.endsWith("/user")
          ? user
          : {},
      headers: { "access-control-allow-origin": "*" },
    });
  });
  let conflict = false;
  await page.route("**/api/workspaces**", async (route) => {
    const request = route.request(),
      path = new URL(request.url()).pathname,
      id = path.split("/")[3];
    if (path === "/api/workspaces") {
      await route.fulfill({
        json: {
          workspaces: ids.map((id, i) => ({
            id,
            name: `Firma ${i ? "B" : "A"}`,
            role,
          })),
        },
      });
      return;
    }
    if (path.endsWith("/members")) {
      await route.fulfill({ json: { members: [{ user_id: user.id, role }] } });
      return;
    }
    if (request.method() === "PUT") {
      const value = request.postDataJSON();
      if (conflict) {
        await route.fulfill({
          status: 409,
          json: { error: "Konflikt wersji — pobierz kopię zmian." },
        });
        return;
      }
      saved[id] = { ...value, revision: saved[id].revision + 1 };
      await route.fulfill({ json: { revision: saved[id].revision } });
      return;
    }
    await route.fulfill({ json: saved[id] });
  });
  return {
    saved,
    conflict: () => {
      conflict = true;
    },
  };
}
async function login(page: Page) {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Zaloguj się", exact: true }),
  ).toBeVisible();
  if (process.env.UPDATE_GROWTH_SCREENSHOTS)
    await page.screenshot({
      path:
        page.viewportSize()!.width < 500
          ? "docs/screenshots/growth-login-mobile.png"
          : "docs/screenshots/growth-login.png",
    });
  await page.getByLabel("Adres e-mail").fill("test@example.com");
  await page.getByLabel("Hasło", { exact: true }).fill("test-password-123");
  await page.getByRole("button", { name: "Zaloguj się", exact: true }).click();
  await expect(page.getByLabel("Przestrzeń robocza")).toHaveValue(ids[0]);
  await expect(
    page.getByText("Zapisano w Supabase", { exact: true }),
  ).toBeVisible();
}
async function createFirm(page: Page) {
  await page.getByRole("button", { name: "Firmy", exact: true }).click();
  await page
    .getByRole("button", { name: "Dodaj firmę", exact: true })
    .first()
    .click();
  await page.getByLabel("Nazwa firmy", { exact: true }).fill("Firma testowa");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Zapisz", exact: true })
    .click();
}
test("logowanie, zapis, odświeżenie i przełączenie nie mieszają danych", async ({
  page,
}) => {
  const p = await provider(page);
  await login(page);
  await createFirm(page);

  await expect.poll(() => p.saved[ids[0]].data.firms.length).toBe(1);
  await expect(
    page.getByText("Zapisano w Supabase", { exact: true }),
  ).toBeVisible();
  if (process.env.UPDATE_GROWTH_SCREENSHOTS)
    await page.screenshot({ path: "docs/screenshots/growth-workspace.png" });
  await expect(
    page.getByText("Zapisano w Supabase", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("ai-evolution-crm-v1")),
  ).toBeNull();
  await page.reload();
  await expect(
    page.getByText("Zapisano w Supabase", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Firmy", exact: true }).click();
  await expect(page.getByText("Firma testowa", { exact: true })).toBeVisible();
  await page.getByLabel("Przestrzeń robocza").selectOption(ids[1]);
  await expect(
    page.getByText("Zapisano w Supabase", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Firmy", exact: true }).click();
  await expect(page.getByText("Firma testowa", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Wyloguj", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Zaloguj się", exact: true }),
  ).toBeVisible();
});
test("viewer ma nawigację i odczyt, ale brak edycji", async ({ page }) => {
  await provider(page, "viewer");
  await login(page);
  await expect(
    page.getByText("Dostęp tylko do odczytu.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Firmy", exact: true }).click();
  expect(
    await page
      .getByRole("button", { name: "Dodaj firmę", exact: true })
      .first()
      .evaluate((el) => Boolean(el.closest("[inert]"))),
  ).toBe(true);
});
test("konflikt chroni niezapisane dane, oferuje backup i blokuje przełączenie", async ({
  page,
}) => {
  const p = await provider(page);
  await login(page);
  p.conflict();
  await createFirm(page);
  await expect(
    page.getByRole("alert").filter({ hasText: "Konflikt wersji" }),
  ).toBeVisible();
  await expect(page.getByLabel("Przestrzeń robocza")).toBeDisabled();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Pobierz kopię zmian" }).click();
  expect((await download).suggestedFilename()).toContain("niezapisane");
});
test("mobilne logowanie i wybór przestrzeni nie wychodzą poza ekran", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await provider(page);
  await login(page);
  await page.getByRole("button", { name: "Otwórz nawigację" }).click();
  await expect(page.getByRole("dialog", { name: "Nawigacja" })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
