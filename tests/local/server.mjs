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
