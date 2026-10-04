import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  use: {
    baseURL: process.env.CRM_TEST_URL ?? "http://127.0.0.1:3000",
    locale: "pl-PL",
    timezoneId: "Europe/Warsaw",
    viewport: { width: 1440, height: 1000 },
    launchOptions: process.env.CRM_CHROMIUM_PATH
      ? {
          executablePath: process.env.CRM_CHROMIUM_PATH,
          args: ["--no-sandbox"],
        }
      : undefined,
  },
  webServer: process.env.CRM_TEST_URL
    ? undefined
    : {
        command: "npm run start -- --hostname 127.0.0.1 --port 3000",
        url: "http://127.0.0.1:3000",
        reuseExistingServer: !process.env.CI,
      },
  reporter: "list",
});
