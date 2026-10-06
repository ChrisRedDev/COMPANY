import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
const folder = mkdtempSync(join(tmpdir(), "evolution-e2e-"));
const server = spawn(
  process.execPath,
  [
    "scripts/start-local.mjs",
    ...(process.env.CRM_LOCAL_TEST_PRODUCTION === "1" ? ["--production"] : []),
  ],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      CRM_LOCAL_PORT: "3002",
      CRM_DATABASE_PATH: join(folder, "test.sqlite"),
      LOCAL_AI_CLI_ENABLED: "0",
      OPENROUTER_API_KEY: "",
      // Explicit dummy OAuth client only for local tests; no external login/API calls.
      GOOGLE_OAUTH_CLIENT_ID: "playwright-client-demo",
      GOOGLE_OAUTH_CLIENT_SECRET: "playwright-secret-demo",
      GOOGLE_OAUTH_REFRESH_TOKEN: "",
      GOOGLE_SERVICE_ACCOUNT_FILE: "",
      GOOGLE_OAUTH_REDIRECT_URI: "",
      GOOGLE_ADS_DEVELOPER_TOKEN: "playwright-developer-demo",
      WP_BASE_URL: "",
      POSTHOG_PERSONAL_API_KEY: "",
    },
  },
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => server.kill(signal));
server.on("exit", (code) => {
  rmSync(folder, { recursive: true, force: true });
  process.exit(code ?? 1);
});
