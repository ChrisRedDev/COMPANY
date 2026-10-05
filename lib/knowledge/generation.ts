import "server-only";
import { randomUUID } from "node:crypto";
import { database, readWorkspace, transaction, audit } from "../local/database";
import { generate, aiStatus } from "../ai/providers";
import type { AiProvider } from "../ai/model";
import { researchWebsite } from "./research";
import {
  brainInstruction,
  parseBrain,
  type BrainDraft,
} from "./generation-model";
import { validateDocument } from "./model";
function ensure() {
  database().exec(
    "CREATE TABLE IF NOT EXISTS brain_generations(id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id), payload TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'draft', created_at TEXT NOT NULL)",
  );
}
export async function generateBrain(
  wid: string,
  url: string,
  provider: AiProvider,
  model: string,
) {
  readWorkspace(wid);
  const status = await aiStatus(wid);
  if (!status[provider])
    throw Error("Najpierw podłącz tego dostawcę w panelu AI Brain.");
  const research = await researchWebsite(url);
  const result = await generate(
    wid,
    provider,
    model,
    "Przygotuj Company Brain na podstawie poniższych źródeł.",
    JSON.stringify(research.sources),
    { system: brainInstruction, maxTokens: 8000 },
  );
  const draft: BrainDraft = {
    id: randomUUID(),
    ...parseBrain(result.text, research.sources),
    ...research,
    usage: result.usage,
  };
  ensure();
  database()
    .prepare(
      "INSERT INTO brain_generations(id,workspace_id,payload,created_at) VALUES(?,?,?,?)",
    )
    .run(draft.id, wid, JSON.stringify(draft), new Date().toISOString());
  audit(wid, "brain.generated_draft");
  return draft;
}
export function saveGeneratedBrain(wid: string, id: string) {
  ensure();
  return transaction(() => {
    const row = database()
      .prepare(
        "SELECT payload,status FROM brain_generations WHERE id=? AND workspace_id=?",
      )
      .get(id, wid);
    if (!row || row.status !== "draft")
      throw Error("Szkic nie istnieje lub został już zapisany.");
    const draft = JSON.parse(String(row.payload)) as BrainDraft;
    const insert = database().prepare(
      "INSERT INTO documents(id,workspace_id,title,category,content,updated_at) VALUES(?,?,?,?,?,?)",
    );
    for (const value of draft.documents) {
      const d = validateDocument({ ...value, revision: 0 });
      insert.run(
        randomUUID(),
        wid,
        d.title,
        d.category,
        d.content,
        new Date().toISOString(),
      );
    }
    database()
      .prepare(
        "UPDATE brain_generations SET status='saved' WHERE id=? AND workspace_id=?",
      )
      .run(id, wid);
    audit(wid, "brain.generated_saved");
    return { count: draft.documents.length };
  });
}
export function latestBrainDraft(wid: string) {
  ensure();
  const row = database()
    .prepare(
      "SELECT payload FROM brain_generations WHERE workspace_id=? AND status='draft' ORDER BY rowid DESC LIMIT 1",
    )
    .get(wid);
  return row ? (JSON.parse(String(row.payload)) as BrainDraft) : null;
}
