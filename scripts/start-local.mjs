import { spawn } from "node:child_process";
if (Number(process.versions.node.split(".")[0]) < 24) {
  console.error("Lokalna baza wymaga Node.js 24 lub nowszego.");
  process.exit(1);
}
const build = process.argv.includes("--build"),
  production = process.argv.includes("--production");
const task = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    build ? "build" : production ? "start" : "dev",
    ...(build
      ? []
      : [
          "--hostname",
          "127.0.0.1",
          "--port",
          process.env.CRM_LOCAL_PORT || "3000",
        ]),
  ],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      NEXT_PUBLIC_CRM_MODE: "sqlite",
      LOCAL_DATABASE_ENABLED: "1",
    },
  },
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => task.kill(signal));
task.on("exit", (code) => process.exit(code ?? 1));
