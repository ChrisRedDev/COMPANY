import "server-only";
import { randomUUID } from "node:crypto";
import { audit, database, transaction } from "../local/database";
import { validateDocument, type Document } from "./model";
export function listDocuments(wid: string) {
  return database()
    .prepare(
      "SELECT id,title,category,content,revision,updated_at FROM documents WHERE workspace_id=? ORDER BY title COLLATE NOCASE",
    )
    .all(wid) as Document[];
}
export function saveDocument(wid: string, value: unknown) {
  const d = validateDocument(value),
    id = d.id || randomUUID(),
    now = new Date().toISOString();
  transaction(() => {
    if (d.id) {
      const result = database()
        .prepare(
          "UPDATE documents SET title=?,category=?,content=?,revision=revision+1,updated_at=? WHERE id=? AND workspace_id=? AND revision=?",
        )
        .run(d.title, d.category, d.content, now, id, wid, d.revision);
      if (!result.changes)
        throw Error("Konflikt notatki. Wczytaj ją ponownie przed zapisem.");
    } else
      database()
        .prepare(
          "INSERT INTO documents(id,workspace_id,title,category,content,updated_at) VALUES(?,?,?,?,?,?)",
        )
        .run(id, wid, d.title, d.category, d.content, now);
    audit(wid, "brain.saved");
  });
  return id;
}
export function deleteDocument(wid: string, id: string, revision: number) {
  transaction(() => {
    const r = database()
      .prepare(
        "DELETE FROM documents WHERE workspace_id=? AND id=? AND revision=?",
      )
      .run(wid, id, revision);
    if (!r.changes) throw Error("Konflikt notatki. Odśwież listę.");
    audit(wid, "brain.deleted");
  });
}
