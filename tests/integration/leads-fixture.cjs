const { readFileSync } = require("node:fs");
const { load } = require("../helpers/load-ts.cjs");
const model = load("lib/leads/model.ts"),
  domain = load("lib/leads/domain.ts", { "./model": model }),
  demo = load("lib/leads/demo.ts", { "./model": model, "./domain": domain });
process.stdout.write(
  readFileSync("tests/integration/leads.sql", "utf8").replace(
    "__LEAD_BUNDLE__",
    () => JSON.stringify(demo.demoLead("__WORKSPACE__")),
  ),
);
