import "server-only";
import { database, transaction, audit } from "../local/database";
import { parseCsv, type CampaignDay } from "./marketing";
export function marketingRows(wid: string) {
  return database()
    .prepare(
      "SELECT payload FROM campaign_days WHERE workspace_id=? ORDER BY date DESC",
    )
    .all(wid)
    .map((r) => JSON.parse(String(r.payload)) as CampaignDay);
}
export function importMarketing(wid: string, csv: string) {
  const rows = parseCsv(csv);
  transaction(() => {
    const q = database().prepare(
      "INSERT INTO campaign_days VALUES(?,?,?,?,?) ON CONFLICT(workspace_id,date,source,campaign) DO UPDATE SET payload=excluded.payload",
    );
    for (const row of rows)
      q.run(wid, row.date, row.source, row.campaign, JSON.stringify(row));
    audit(wid, "marketing.imported");
  });
  return rows.length;
}
export function connectionRows(wid: string) {
  return database()
    .prepare(
      "SELECT provider,status,last_sync,error FROM connections WHERE workspace_id=?",
    )
    .all(wid);
}
export function connectionState(
  wid: string,
  provider: string,
  status: string,
  error: string | null = null,
) {
  database()
    .prepare(
      "INSERT INTO connections VALUES(?,?,?,?,?) ON CONFLICT(workspace_id,provider) DO UPDATE SET status=excluded.status,last_sync=excluded.last_sync,error=excluded.error",
    )
    .run(
      wid,
      provider,
      status,
      status === "checked" ? new Date().toISOString() : null,
      error,
    );
}
