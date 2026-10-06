"use client";
import { useState } from "react";
import {
  CATEGORIES,
  categoryLabels,
  type Document,
} from "@/lib/knowledge/model";
import { Field, Modal } from "../crm/ui";
import { localRequest } from "@/lib/local/client";
export default function BrainEditor({
  wid,
  note,
  close,
  saved,
}: {
  wid: string;
  note?: Document;
  close: () => void;
  saved: () => void;
}) {
  const [content, setContent] = useState(note?.content || "# Company knowledge\n\n"),
    [title, setTitle] = useState(note?.title || ""),
    [category, setCategory] = useState(note?.category || "company"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await localRequest(wid, "brain", {
        method: "POST",
        body: JSON.stringify({
          id: note?.id || "",
          revision: note?.revision || 0,
          title,
          category,
          content,
        }),
      });
      saved();
      close();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Nie udało się zapisać notatki.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={note ? "Edit note" : "New note"}
      onClose={() => {
        if (!busy) close();
      }}
    >
      <form onSubmit={submit}>
        <Field label="Title notatki">
          <input
            autoFocus
            value={title}
            required
            maxLength={100}
            onChange={(e) => setTitle(e.target.value)}
          />
        </Field>
        <Field label="Category wiedzy">
          <select
            value={category}
            onChange={(e) =>
              setCategory(e.target.value as Document["category"])
            }
          >
            {CATEGORIES.map((c) => (
              <option value={c} key={c}>
                {categoryLabels[c]}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label="Content Markdown"
          hint="Łącz notatki przez [[Title]] lub [[services/Title]]."
        >
          <textarea
            className="font-mono text-sm"
            rows={14}
            value={content}
            maxLength={200000}
            onChange={(e) => setContent(e.target.value)}
          />
        </Field>
        {error && (
          <p className="crm-alert error" role="alert">
            {error}
          </p>
        )}
        <div className="crm-form-actions">
          <button
            type="button"
            className="crm-button secondary"
            disabled={busy}
            onClick={close}
          >
            Cancel
          </button>
          <button className="crm-button" disabled={busy}>
            {busy ? "Saving…" : "Save notatkę"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
