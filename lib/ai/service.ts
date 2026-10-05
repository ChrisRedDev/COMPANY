import "server-only";
import { randomUUID } from "node:crypto";
import { database, readWorkspace, transaction, audit } from "../local/database";
import { listDocuments } from "../knowledge/repository";
import { marketingRows } from "../integrations/repository";
import { metrics } from "../integrations/marketing";
import { today } from "../crm/model";
import { validateSnapshot } from "../growth/model";
import { parseAnswer, type AiProvider, type Proposal } from "./model";
import { generate } from "./providers";
function ensure() {
  database().exec(
    "CREATE TABLE IF NOT EXISTS agent_messages(id TEXT PRIMARY KEY,workspace_id TEXT NOT NULL REFERENCES workspaces(id),prompt TEXT NOT NULL,answer TEXT NOT NULL,provider TEXT NOT NULL,model TEXT NOT NULL,created_at TEXT NOT NULL);CREATE TABLE IF NOT EXISTS agent_actions(id TEXT PRIMARY KEY,workspace_id TEXT NOT NULL REFERENCES workspaces(id),message_id TEXT NOT NULL REFERENCES agent_messages(id),payload TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending',base_revision INTEGER NOT NULL);",
  );
}
export function history(wid: string) {
  ensure();
  return database()
    .prepare(
      "SELECT * FROM agent_messages WHERE workspace_id=? ORDER BY rowid DESC LIMIT 10",
    )
    .all(wid)
    .reverse()
    .map((m) => ({
      id: String(m.id),
      prompt: String(m.prompt),
      answer: String(m.answer),
      provider: String(m.provider),
      model: String(m.model),
      created_at: String(m.created_at),
      actions: database()
        .prepare(
          "SELECT id,payload,status FROM agent_actions WHERE message_id=? AND workspace_id=?",
        )
        .all(String(m.id), wid)
        .map((a) => ({
          id: String(a.id),
          status: String(a.status),
          payload: JSON.parse(String(a.payload)) as Proposal,
        })),
    }));
}
export function buildContext(wid: string, prompt: string) {
  const s = readWorkspace(wid);
  const terms = prompt
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 3);
  const score = (d: { title: string; content: string }) =>
    terms.reduce(
      (sum, t) =>
        sum + ((d.title + " " + d.content).toLowerCase().includes(t) ? 1 : 0),
      0,
    );
  const notes = listDocuments(wid)
    .sort(
      (a, b) =>
        Number(b.title.endsWith("COMPANY_BRAIN")) -
          Number(a.title.endsWith("COMPANY_BRAIN")) || score(b) - score(a),
    )
    .slice(0, 5)
    .map((d) => ({
      title: d.title,
      content: d.content.slice(
        0,
        d.title.endsWith("COMPANY_BRAIN") ? 12000 : 2500,
      ),
    }));
  const rows = marketingRows(wid).filter(
    (r) =>
      r.date >=
        new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10) &&
      r.date <= today(),
  );
  return {
    revision: s.revision,
    text: JSON.stringify({
      date: today(),
      businessMode: s.settings.businessMode ?? "crm",
      scope:
        "Importy marketingowe ostatnich 30 dni; CRM i wybrane notatki. Brak potwierdzenia live trackingu.",
      marketing: metrics(rows),
      companies: s.data.firms
        .slice(0, 20)
        .map((f) => ({ id: f.id, name: f.name, industry: f.industry })),
      deals: s.data.deals
        .slice(0, 20)
        .map((d) =>
          d.service
            ? {
                ...d,
                service: { ...d.service, history: d.service.history.slice(-3) },
              }
            : d,
        ),
      tasks: s.data.tasks.filter((t) => !t.done).slice(0, 20),
      notes,
      recentConversation: history(wid)
        .slice(-3)
        .map((m) => ({
          question: String(m.prompt).slice(0, 800),
          answer: String(m.answer).slice(0, 1200),
        })),
    }),
  };
}
export async function ask(
  wid: string,
  provider: AiProvider,
  model: string,
  prompt: string,
) {
  if (typeof prompt !== "string" || !prompt.trim() || prompt.length > 2000)
    throw Error("Pytanie może mieć 1–2000 znaków.");
  ensure();
  const context = buildContext(wid, prompt),
    result = await generate(wid, provider, model, prompt, context.text),
    parsed = parseAnswer(result.text),
    messageId = randomUUID();
  transaction(() => {
    database()
      .prepare("INSERT INTO agent_messages VALUES(?,?,?,?,?,?,?)")
      .run(
        messageId,
        wid,
        prompt,
        parsed.answer,
        provider,
        model,
        new Date().toISOString(),
      );
    for (const action of parsed.actions) {
      if (
        action.type === "create_task" &&
        !readWorkspace(wid).data.firms.some((f) => f.id === action.companyId)
      )
        throw Error("Model wskazał nieistniejącą firmę.");
      database()
        .prepare(
          "INSERT INTO agent_actions(id,workspace_id,message_id,payload,base_revision) VALUES(?,?,?,?,?)",
        )
        .run(
          randomUUID(),
          wid,
          messageId,
          JSON.stringify(action),
          context.revision,
        );
    }
    audit(wid, "agent.analyzed");
  });
  return { messages: history(wid), usage: result.usage };
}
export function decide(wid: string, id: string, approve: boolean) {
  ensure();
  transaction(() => {
    const row = database()
      .prepare("SELECT * FROM agent_actions WHERE id=? AND workspace_id=?")
      .get(id, wid);
    if (!row || row.status !== "pending")
      throw Error("Propozycja nie jest już oczekująca.");
    if (approve) {
      const current = readWorkspace(wid);
      if (current.revision !== row.base_revision)
        throw Error(
          "Konflikt wersji: CRM zmienił się od analizy. Poproś agenta o nową propozycję.",
        );
      const action = JSON.parse(String(row.payload)) as Proposal;
      if (action.type === "create_task") {
        current.data.tasks.unshift({
          id: randomUUID(),
          companyId: action.companyId,
          title: action.title,
          date: action.date,
          done: false,
        });
        validateSnapshot(current);
        database()
          .prepare(
            "UPDATE workspaces SET snapshot=?,revision=revision+1 WHERE id=?",
          )
          .run(JSON.stringify(current), wid);
        database()
          .prepare(
            "UPDATE agent_actions SET base_revision=? WHERE workspace_id=? AND message_id=? AND status='pending' AND base_revision=?",
          )
          .run(
            current.revision + 1,
            wid,
            String(row.message_id),
            current.revision,
          );
      } else
        database()
          .prepare(
            "INSERT INTO documents(id,workspace_id,title,category,content,updated_at) VALUES(?,?,?,?,?,?)",
          )
          .run(
            randomUUID(),
            wid,
            action.title,
            action.category,
            action.content,
            new Date().toISOString(),
          );
    }
    database()
      .prepare("UPDATE agent_actions SET status=? WHERE id=?")
      .run(approve ? "executed" : "rejected", id);
    audit(wid, approve ? "agent.approved" : "agent.rejected");
  });
}
