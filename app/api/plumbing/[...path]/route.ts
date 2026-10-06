import { guardLocal } from "@/lib/local/guard";
import { readWorkspace, database } from "@/lib/local/database";
import { uuid } from "@/lib/leads/model";
import {
  loadDemo,
  reportFor,
  importRows,
  transitionLead,
  ensureCompanyBrain,
  plumbingInputs,
} from "@/lib/plumbing/repository";
import { readPublicHtml } from "@/lib/knowledge/research";
import { auditHtml, type SeoAuditResult } from "@/lib/plumbing/seo";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { BRAND } from "@/lib/plumbing/model";
import { csvTable, type ImportKind } from "@/lib/plumbing/imports";
import { ukDay } from "@/lib/plumbing/model";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
async function handler(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const denied = guardLocal(request);
  if (denied) return denied;
  try {
    const { path } = await context.params;
    let body: Record<string, unknown> = {};
    if (request.method === "POST") {
      const raw = await request.text();
      if (raw.length > 3_000_000)
        return json({ error: "File limit: 3 MB." }, 413);
      body = raw ? JSON.parse(raw) : {};
    }
    if (path.length === 1 && path[0] === "demo" && request.method === "POST")
      return json(await loadDemo());
    const wid = path[0];
    if (!uuid(wid)) return json({ error: "Invalid workspace." }, 400);
    readWorkspace(wid);
    if (path.length === 2 && path[1] === "brain" && request.method === "POST") {
      ensureCompanyBrain(wid);
      return json({ loaded: true });
    }
    if (path.length === 2 && path[1] === "seo") {
      const db = database();
      db.exec(
        "CREATE TABLE IF NOT EXISTS plumbing_seo(workspace_id TEXT PRIMARY KEY REFERENCES workspaces(id),payload TEXT NOT NULL)",
      );
      if (request.method === "GET") {
        const row = db
          .prepare("SELECT payload FROM plumbing_seo WHERE workspace_id=?")
          .get(wid);
        return json({ audit: row ? JSON.parse(String(row.payload)) : null });
      }
      if (request.method === "POST") {
        if (
          typeof body.url !== "string" ||
          body.url.length > 2000 ||
          typeof body.keyword !== "string" ||
          body.keyword.length > 200
        )
          return json(
            { error: "Enter a URL and search phrase (max 200 characters)." },
            400,
          );
        const demo = body.demo === true;
        if (demo && !plumbingInputs(wid).demo)
          throw Error("DEMO audits belong in the DEMO workspace.");
        const page = demo
          ? {
              html: readFileSync(
                join(process.cwd(), "public/demo/seo-audit-demo.html"),
                "utf8",
              ),
              url: BRAND.website,
              checkedAt: new Date().toISOString(),
            }
          : await readPublicHtml(body.url);
        const result: SeoAuditResult = {
          ...auditHtml(
            page.html,
            page.url,
            body.keyword.trim(),
            page.checkedAt,
          ),
          demo,
        };
        const saved = db
          .prepare(
            "SELECT payload FROM provider_data WHERE workspace_id=? AND provider='search_console'",
          )
          .get(wid);
        const report = saved ? JSON.parse(String(saved.payload))?.report : null;
        if (!demo && report) {
          result.queries = report.breakdown ?? [];
          result.queryPeriod = {
            from: report.from ?? "",
            to: report.to ?? "",
            fetchedAt: report.fetched_at ?? "",
          };
        }
        db.prepare(
          "INSERT INTO plumbing_seo VALUES(?,?) ON CONFLICT(workspace_id) DO UPDATE SET payload=excluded.payload",
        ).run(wid, JSON.stringify(result));
        return json({ audit: result });
      }
    }
    if (path.length === 2 && path[1] === "report" && request.method === "GET") {
      const p = new URL(request.url).searchParams,
        to = p.get("to") ?? ukDay(),
        from =
          p.get("from") ??
          new Date(Date.parse(`${to}T12:00:00Z`) - 29 * 86400000)
            .toISOString()
            .slice(0, 10);
      return json(await reportFor(wid, from, to));
    }
    if (path.length === 2 && path[1] === "import" && request.method === "POST")
      return json({
        count: await importRows(
          wid,
          body.kind as ImportKind,
          typeof body.csv === "string" ? csvTable(body.csv) : body.rows,
        ),
      });
    if (path.length === 3 && path[1] === "stage" && request.method === "POST")
      return json(await transitionLead(wid, path[2], body));
    return json({ error: "Not found." }, 404);
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : "Request failed." },
      400,
    );
  }
}
export const GET = handler;
export const POST = handler;
