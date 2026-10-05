import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/local",
  workers: 1,
  timeout: 45000,
  use: {
    baseURL: "http://127.0.0.1:3002",
    locale: "pl-PL",
    viewport: { width: 1440, height: 1000 },
    launchOptions: process.env.CRM_CHROMIUM_PATH
      ? {
          executablePath: process.env.CRM_CHROMIUM_PATH,
          args: ["--no-sandbox"],
        }
      : undefined,
  },
  webServer: {
    command: "node tests/local/server.mjs",
    url: "http://127.0.0.1:3002",
    reuseExistingServer: false,
  },
  reporter: "list",
});
