import "server-only";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync, chmodSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { validateSnapshot, type Snapshot } from "../growth/model";
let db: DatabaseSync | undefined;
export function closeDatabase() {
  if (db) {
    db.close();
    db = undefined;
  }
}
export function databasePath() {
  return resolve(
    /* turbopackIgnore: true */ process.env.CRM_DATABASE_PATH ||
      "data/evolution.sqlite",
  );
}
export function database() {
  if (db) return db;
  const path = databasePath();
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  db = new DatabaseSync(path);
  chmodSync(path, 0o600);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
 CREATE TABLE IF NOT EXISTS workspaces(id TEXT PRIMARY KEY,name TEXT NOT NULL,snapshot TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 0);
 CREATE TABLE IF NOT EXISTS documents(id TEXT PRIMARY KEY,workspace_id TEXT NOT NULL REFERENCES workspaces(id),title TEXT NOT NULL,category TEXT NOT NULL,content TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 1,updated_at TEXT NOT NULL,UNIQUE(workspace_id,category,title));
 CREATE TABLE IF NOT EXISTS campaign_days(workspace_id TEXT NOT NULL REFERENCES workspaces(id),date TEXT NOT NULL,source TEXT NOT NULL,campaign TEXT NOT NULL,payload TEXT NOT NULL,PRIMARY KEY(workspace_id,date,source,campaign));
 CREATE TABLE IF NOT EXISTS connections(workspace_id TEXT NOT NULL REFERENCES workspaces(id),provider TEXT NOT NULL,status TEXT NOT NULL,last_sync TEXT,error TEXT,PRIMARY KEY(workspace_id,provider));
 CREATE TABLE IF NOT EXISTS provider_data(workspace_id TEXT NOT NULL REFERENCES workspaces(id),provider TEXT NOT NULL,payload TEXT NOT NULL,PRIMARY KEY(workspace_id,provider));
 CREATE TABLE IF NOT EXISTS audit_log(id INTEGER PRIMARY KEY,workspace_id TEXT,action TEXT NOT NULL,created_at TEXT NOT NULL);
 PRAGMA user_version=1;`);
  return db;
}
export function transaction<T>(run: () => T): T {
  const d = database();
  d.exec("BEGIN IMMEDIATE");
  try {
    const result = run();
    d.exec("COMMIT");
    return result;
  } catch (e) {
    d.exec("ROLLBACK");
    throw e;
  }
}
export function audit(workspaceId: string, action: string) {
  database()
    .prepare(
      "INSERT INTO audit_log(workspace_id,action,created_at) VALUES(?,?,?)",
    )
    .run(workspaceId, action, new Date().toISOString());
}
export function listWorkspaces() {
  return database()
    .prepare("SELECT id,name,'owner' as role FROM workspaces ORDER BY rowid")
    .all();
}
export function createWorkspace(name: string) {
  if (!name.trim() || name.trim().length > 120)
    throw Error("Podaj nazwę przestrzeni (do 120 znaków).");
  const id = randomUUID();
  const state: Snapshot = {
    revision: 0,
    data: { firms: [], contacts: [], deals: [], tasks: [], mails: [] },
    settings: {
      onboarded: false,
      sender: name.trim(),
      agentEnabled: false,
      businessMode: "crm",
    },
  };
  transaction(() => {
    database()
      .prepare("INSERT INTO workspaces(id,name,snapshot) VALUES(?,?,?)")
      .run(id, name.trim(), JSON.stringify(state));
    audit(id, "workspace.created");
  });
  return id;
}
export function readWorkspace(id: string): Snapshot {
  const row = database()
    .prepare("SELECT snapshot,revision FROM workspaces WHERE id=?")
    .get(id);
  if (!row) throw Error("Nie znaleziono przestrzeni.");
  return {
    ...JSON.parse(String(row.snapshot)),
    revision: Number(row.revision),
  };
}
export function saveWorkspace(id: string, value: unknown) {
  const state = validateSnapshot(value);
  return transaction(() => {
    const result = database()
      .prepare(
        "UPDATE workspaces SET snapshot=?,revision=revision+1 WHERE id=? AND revision=?",
      )
      .run(JSON.stringify(state), id, state.revision);
    if (!result.changes)
      throw Error(
        "Konflikt wersji: wczytaj aktualne dane z bazy. Pobierz wcześniej kopię zmian.",
      );
    audit(id, "crm.saved");
    return state.revision + 1;
  });
}
