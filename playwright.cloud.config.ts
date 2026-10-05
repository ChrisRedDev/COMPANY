import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/cloud",
  workers: 1,
  timeout: 45000,
  use: {
    baseURL: "http://127.0.0.1:3001",
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
    command: "npm run dev -- --hostname 127.0.0.1 --port 3001",
    url: "http://127.0.0.1:3001",
    reuseExistingServer: false,
    env: {
      NEXT_PUBLIC_CRM_MODE: "cloud",
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54329",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "public-test-only",
    },
  },
  reporter: "list",
});
