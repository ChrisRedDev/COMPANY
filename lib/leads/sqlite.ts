import "server-only";
import { database, transaction, audit, readWorkspace } from "../local/database";
import {
  LeadError,
  CHILD_TABLES,
  BUNDLE_KEYS,
  resolveIdentity,
  chronological,
  type Lead,
  type LeadBundle,
  type LeadFilters,
} from "./model";
import type { LeadRepository } from "./repository";
const initialized = new WeakSet<object>();
export const LEAD_COLUMNS = [
  "id",
  "workspace_id",
  "first_name",
  "last_name",
  "company_name",
  "email",
  "phone",
  "email_key",
  "phone_key",
  "status",
  "source",
  "campaign",
  "medium",
  "first_touch_source",
  "last_touch_source",
  "estimated_value",
  "revenue",
  "created_at",
  "updated_at",
  "revision",
  "is_demo",
  "notes",
  "landing_page",
  "keyword",
  "utm",
  "crm_links",
  "postcode",
  "service",
  "urgency",
  "channel",
  "problem",
  "currency",
] as const;
const extra: Record<(typeof CHILD_TABLES)[number], string> = {
  lead_events:
    "event_type TEXT NOT NULL,source TEXT NOT NULL,timestamp TEXT NOT NULL,metadata TEXT NOT NULL,",
  touchpoints:
    "event_id TEXT NOT NULL,source TEXT NOT NULL,campaign TEXT NOT NULL,medium TEXT NOT NULL,timestamp TEXT NOT NULL,",
  conversions:
    "event_id TEXT NOT NULL,kind TEXT NOT NULL,value REAL NOT NULL,currency TEXT NOT NULL,timestamp TEXT NOT NULL,",
  appointments:
    "event_id TEXT NOT NULL,status TEXT NOT NULL,scheduled_at TEXT,created_at TEXT NOT NULL,",
  quotes:
    "event_id TEXT NOT NULL,status TEXT NOT NULL,amount REAL NOT NULL,currency TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,",
  jobs: "event_id TEXT NOT NULL,status TEXT NOT NULL,amount REAL NOT NULL,currency TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,",
  payments:
    "event_id TEXT NOT NULL,status TEXT NOT NULL,amount REAL NOT NULL,currency TEXT NOT NULL,timestamp TEXT NOT NULL,",
};
export function leadDatabase() {
  const db = database();
  if (initialized.has(db)) return db;
  const fields = LEAD_COLUMNS.map(
    (k) =>
      `${k} ${["estimated_value", "revenue"].includes(k) ? "REAL" : ["revision", "is_demo"].includes(k) ? "INTEGER" : "TEXT"} NOT NULL`,
  ).join(",");
  const schema = db
    .prepare(
      "SELECT sql FROM sqlite_master WHERE type='table' AND name='leads'",
    )
    .get();
  if (schema && !String(schema.sql).includes("'paid'")) {
    const oldColumns = LEAD_COLUMNS.filter(
      (k) =>
        ![
          "postcode",
          "service",
          "urgency",
          "channel",
          "problem",
          "currency",
        ].includes(k),
    );
    // SQLite cannot alter a CHECK constraint. Keep children referencing the same
    // final table name and verify all foreign keys before committing the swap.
    db.exec("PRAGMA foreign_keys=OFF; BEGIN IMMEDIATE;");
    try {
      db.exec(`CREATE TABLE leads_plumbing(${fields},PRIMARY KEY(workspace_id,id),FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,CHECK(status IN ('new','contacted','qualified','quote','booked','in_progress','completed','paid','won','lost')),CHECK(estimated_value>=0 AND revenue>=0));
        INSERT INTO leads_plumbing SELECT ${oldColumns.join(",")},'','','','','','PLN' FROM leads;
        DROP TABLE leads; ALTER TABLE leads_plumbing RENAME TO leads;`);
      if (db.prepare("PRAGMA foreign_key_check").all().length)
        throw Error("Lead migration failed foreign-key validation.");
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    } finally {
      db.exec("PRAGMA foreign_keys=ON");
    }
  }
  try {
    db.exec(`BEGIN IMMEDIATE;
 CREATE TABLE IF NOT EXISTS leads(${fields},PRIMARY KEY(workspace_id,id),FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,CHECK(status IN ('new','contacted','qualified','quote','booked','in_progress','completed','paid','won','lost')),CHECK(estimated_value>=0 AND revenue>=0));
 CREATE UNIQUE INDEX IF NOT EXISTS lead_email_identity ON leads(workspace_id,email_key) WHERE email_key<>'';
 CREATE UNIQUE INDEX IF NOT EXISTS lead_phone_identity ON leads(workspace_id,phone_key) WHERE phone_key<>'';
 CREATE INDEX IF NOT EXISTS lead_updated ON leads(workspace_id,updated_at DESC,id);
 ${CHILD_TABLES.map((t) => `CREATE TABLE IF NOT EXISTS ${t}(id TEXT NOT NULL,workspace_id TEXT NOT NULL,lead_id TEXT NOT NULL,${extra[t]}payload TEXT NOT NULL,PRIMARY KEY(workspace_id,id),FOREIGN KEY(workspace_id,lead_id) REFERENCES leads(workspace_id,id) ON DELETE CASCADE,${t === "lead_events" ? "UNIQUE(workspace_id,lead_id,id)" : "FOREIGN KEY(workspace_id,lead_id,event_id) REFERENCES lead_events(workspace_id,lead_id,id) ON DELETE CASCADE"});CREATE INDEX IF NOT EXISTS ${t}_lead ON ${t}(workspace_id,lead_id);`).join("\n")}
 CREATE INDEX IF NOT EXISTS lead_event_time ON lead_events(workspace_id,lead_id,timestamp,id);
 PRAGMA user_version=2; COMMIT;`);
  } catch (error) {
    try {
      db.exec("ROLLBACK");
    } catch {}
    throw error;
  }
  db.function("lead_lower", { deterministic: true }, (v) =>
    String(v).toLocaleLowerCase("pl"),
  );
  initialized.add(db);
  return db;
}
function decode(row: Record<string, unknown>): Lead {
  return {
    ...row,
    utm: JSON.parse(String(row.utm)),
    crm_links: JSON.parse(String(row.crm_links)),
    is_demo: !!row.is_demo,
  } as Lead;
}
function conditions(wid: string, f: LeadFilters) {
  let sql = "workspace_id=?";
  const args: (string | number)[] = [wid];
  if (f.status) {
    sql += " AND status=?";
    args.push(f.status);
  }
  if (f.scope !== "all") {
    sql += " AND is_demo=?";
    args.push(f.scope === "demo" ? 1 : 0);
  }
  if (f.search) {
    sql +=
      " AND lead_lower(first_name || ' ' || last_name || ' ' || company_name || ' ' || email || ' ' || phone || ' ' || phone_key || ' ' || source || ' ' || campaign || ' ' || keyword) LIKE ? ESCAPE '\\'";
    args.push("%" + f.search.toLowerCase().replace(/[\\%_]/g, "\\$&") + "%");
  }
  return { sql, args };
}
export const sqliteLeads: LeadRepository = {
  async list(wid, f) {
    readWorkspace(wid);
    const d = leadDatabase(),
      { sql, args } = conditions(wid, f);
    return {
      leads: d
        .prepare(
          `SELECT leads.*,(SELECT max(timestamp) FROM lead_events WHERE lead_events.workspace_id=leads.workspace_id AND lead_events.lead_id=leads.id) AS last_activity_at FROM leads WHERE ${sql} ORDER BY updated_at DESC,id LIMIT 50 OFFSET ?`,
        )
        .all(...args, f.page * 50)
        .map(decode),
      total: Number(
        d.prepare(`SELECT count(*) AS n FROM leads WHERE ${sql}`).get(...args)!
          .n,
      ),
    };
  },
  async identity(wid, email, phone) {
    readWorkspace(wid);
    return leadDatabase()
      .prepare(
        "SELECT * FROM leads WHERE workspace_id=? AND ((email_key<>'' AND email_key=?) OR (phone_key<>'' AND phone_key=?))",
      )
      .all(wid, email, phone)
      .map(decode);
  },
  async read(wid, lid) {
    readWorkspace(wid);
    const d = leadDatabase(),
      row = d
        .prepare("SELECT * FROM leads WHERE workspace_id=? AND id=?")
        .get(wid, lid);
    if (!row)
      throw new LeadError("Nie znaleziono leada w tej przestrzeni.", 404);
    const bundle = { lead: decode(row) } as LeadBundle;
    CHILD_TABLES.forEach((t, i) => {
      const rows = d
        .prepare(
          `SELECT payload FROM ${t} WHERE workspace_id=? AND lead_id=? ORDER BY id`,
        )
        .all(wid, lid)
        .map((r) => JSON.parse(String(r.payload)));
      Object.assign(bundle, { [BUNDLE_KEYS[i]]: rows });
    });
    bundle.events = chronological(bundle.events);
    bundle.touchpoints = chronological(bundle.touchpoints);
    return bundle;
  },
  async write(wid, b, expected, create) {
    if (JSON.stringify(b).length > 5_000_000)
      throw new LeadError("Historia leada jest zbyt duża. Pobierz kopię bazy.");
    const d = leadDatabase();
    return transaction(() => {
      readWorkspace(wid);
      if (b.lead.workspace_id !== wid || b.lead.revision !== expected + 1)
        throw new LeadError("Nieprawidłowa przestrzeń lub wersja leada.");
      const row = d
        .prepare("SELECT * FROM leads WHERE workspace_id=? AND id=?")
        .get(wid, b.lead.id);
      const matches = d
        .prepare(
          "SELECT * FROM leads WHERE workspace_id=? AND ((email_key<>'' AND email_key=?) OR (phone_key<>'' AND phone_key=?))",
        )
        .all(wid, b.lead.email_key, b.lead.phone_key)
        .map(decode);
      const match = resolveIdentity(
        matches,
        b.lead.email,
        b.lead.phone,
        create ? "" : b.lead.id,
      );
      if (create && (match || row))
        return { lead: match ?? decode(row!), duplicate: true };
      if (!create && (!row || Number(row.revision) !== expected))
        throw new LeadError(
          "Konflikt wersji leada. Odśwież szczegóły przed ponownym zapisem.",
          409,
        );
      if (match)
        throw new LeadError(
          "Ten e-mail lub telefon należy do innego leada. Sprawdź oba rekordy.",
          409,
        );
      const values = LEAD_COLUMNS.map((k) =>
        k === "utm" || k === "crm_links"
          ? JSON.stringify(b.lead[k])
          : k === "is_demo"
            ? Number(b.lead[k])
            : (b.lead[k] ?? (k === "currency" ? "PLN" : "")),
      );
      d.prepare(
        `INSERT INTO leads(${LEAD_COLUMNS.join(",")}) VALUES(${LEAD_COLUMNS.map(() => "?").join(",")}) ON CONFLICT(workspace_id,id) DO UPDATE SET ${LEAD_COLUMNS.filter(
          (k) => k !== "id" && k !== "workspace_id",
        )
          .map((k) => `${k}=excluded.${k}`)
          .join(",")}`,
      ).run(...values);
      [...CHILD_TABLES]
        .reverse()
        .forEach((t) =>
          d
            .prepare(`DELETE FROM ${t} WHERE workspace_id=? AND lead_id=?`)
            .run(wid, b.lead.id),
        );
      CHILD_TABLES.forEach((t, i) => {
        const columns = [
          "id",
          "workspace_id",
          "lead_id",
          ...extra[t]
            .split(",")
            .filter(Boolean)
            .map((s) => s.trim().split(" ")[0]),
          "payload",
        ];
        const insert = d.prepare(
          `INSERT INTO ${t}(${columns.join(",")}) VALUES(${columns.map(() => "?").join(",")})`,
        );
        for (const child of b[BUNDLE_KEYS[i]]) {
          if (child.workspace_id !== wid || child.lead_id !== b.lead.id)
            throw new LeadError("Nieprawidłowa relacja zdarzenia.");
          const r = child as unknown as Record<string, unknown>;
          insert.run(
            ...columns.map((k) =>
              k === "payload"
                ? JSON.stringify(r)
                : k === "metadata"
                  ? JSON.stringify(r[k])
                  : (r[k] as string | number | null),
            ),
          );
        }
      });
      audit(wid, create ? "lead.created" : "lead.updated");
      return { lead: b.lead, duplicate: false };
    });
  },
};
