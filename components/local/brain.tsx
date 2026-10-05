"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  CATEGORIES,
  categoryLabels,
  wikiLinks,
  type Document,
} from "@/lib/knowledge/model";
import { localDownload, localRequest } from "@/lib/local/client";
import { Empty, Icon } from "../crm/ui";
import BrainEditor from "./brain-editor";
import Markdown from "./markdown";
import BrainGenerator from "./brain-generator";
export default function Brain({
  wid,
  openAi,
}: {
  wid: string;
  openAi: () => void;
}) {
  const [documents, setDocuments] = useState<Document[]>([]),
    [selected, setSelected] = useState<Document | null>(null),
    [query, setQuery] = useState(""),
    [folder, setFolder] = useState("all"),
    [editor, setEditor] = useState<{ note?: Document } | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const upload = useRef<HTMLInputElement>(null);
  const [generator, setGenerator] = useState(false);
  const load = useCallback(async () => {
    try {
      const r = await localRequest(wid, "brain");
      setDocuments(r.documents);
      setSelected((current) =>
        current
          ? r.documents.find((d: Document) => d.id === current.id) || null
          : null,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd odczytu.");
    }
  }, [wid]);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) void load();
    });
    return () => {
      active = false;
    };
  }, [load]);
  const filtered = documents.filter(
    (d) =>
      (folder === "all" || d.category === folder) &&
      `${d.title} ${d.content}`.toLowerCase().includes(query.toLowerCase()),
  );
  async function importFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError("");
    try {
      if (files.length > 100) throw Error("Importuj do 100 notatek na raz.");
      for (const file of Array.from(files)) {
        if (!/\.md$/i.test(file.name) || file.size > 200000)
          throw Error("Wybierz pliki .md do 200 KB.");
        const content = await file.text(),
          title = file.name.replace(/\.md$/i, "");
        const current = documents.find(
          (d) =>
            d.title === title &&
            d.category === (folder === "all" ? "company" : folder),
        );
        if (current)
          throw Error(
            `Notatka „${title}” już istnieje. Edytuj ją lub zmień nazwę pliku.`,
          );
        await localRequest(wid, "brain", {
          method: "POST",
          body: JSON.stringify({
            id: "",
            revision: 0,
            title,
            category: folder === "all" ? "company" : folder,
            content,
          }),
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd importu.");
    } finally {
      setBusy(false);
      if (upload.current) upload.current.value = "";
      await load();
    }
  }
  async function remove() {
    if (!selected || !confirm(`Usunąć notatkę „${selected.title}”?`)) return;
    try {
      await localRequest(wid, "brain", {
        method: "DELETE",
        body: JSON.stringify({ id: selected.id, revision: selected.revision }),
      });
      setSelected(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd usuwania.");
    }
  }
  const backlinks = selected
    ? documents.filter(
        (d) =>
          d.id !== selected.id &&
          wikiLinks(d.content).some((link) =>
            [selected.title, `${selected.category}/${selected.title}`].includes(
              link,
            ),
          ),
      )
    : [];
  return (
    <div className="grid gap-5">
      <section className="crm-card p-6">
        <div className="flex flex-wrap justify-between gap-4">
          <div>
            <span className="crm-eyebrow">COMPANY BRAIN · NA TWOIM DYSKU</span>
            <h2>Wiedza, która zostaje w firmie.</h2>
            <p className="crm-muted">
              Notatki Markdown, powiązania i eksport skarbca do Obsidiana.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="crm-button" onClick={() => setGenerator(true)}>
              Wygeneruj ze strony
            </button>
            <button
              className="crm-button secondary"
              disabled={busy}
              onClick={() => upload.current?.click()}
            >
              Importuj .md
            </button>
            <button
              className="crm-button secondary"
              disabled={!documents.length || busy}
              onClick={() =>
                void localDownload(
                  `/api/local/workspaces/${wid}/vault`,
                  "company-brain.zip",
                ).catch((e) => setError(e.message))
              }
            >
              Eksport do Obsidiana
            </button>
            <button className="crm-button" onClick={() => setEditor({})}>
              Nowa notatka
            </button>
          </div>
        </div>
        <input
          type="file"
          ref={upload}
          multiple
          accept=".md,text/markdown"
          hidden
          onChange={(e) => void importFiles(e.target.files)}
        />
      </section>
      {error && (
        <p role="alert" className="crm-alert error">
          {error}
        </p>
      )}
      <div className="grid gap-5 lg:grid-cols-[minmax(15em,1fr)_minmax(0,2fr)]">
        <aside className="crm-card p-5">
          <input
            aria-label="Szukaj w wiedzy"
            placeholder="Szukaj w notatkach…"
            className="w-full"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select
            aria-label="Filtr folderu"
            className="my-3 w-full"
            value={folder}
            onChange={(e) => setFolder(e.target.value)}
          >
            <option value="all">Wszystkie foldery</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {categoryLabels[c]}
              </option>
            ))}
          </select>
          <div className="grid gap-2">
            {filtered.map((d) => (
              <button
                key={d.id}
                className={`rounded-lg p-3 text-left ${selected?.id === d.id ? "bg-violet-50 text-violet-700" : "hover:bg-slate-50"}`}
                onClick={() => setSelected(d)}
              >
                <strong className="block text-sm">{d.title}</strong>
                <small>{categoryLabels[d.category]}</small>
              </button>
            ))}
            {!filtered.length && (
              <p className="crm-muted">Nie znaleziono notatek.</p>
            )}
          </div>
        </aside>
        <section className="crm-card p-6">
          {selected ? (
            <>
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h2>{selected.title}</h2>
                  <p className="crm-muted">
                    {categoryLabels[selected.category]} · wersja{" "}
                    {selected.revision}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    className="crm-button secondary"
                    onClick={() => setEditor({ note: selected })}
                  >
                    Edytuj notatkę
                  </button>
                  <button
                    className="crm-icon-button danger"
                    aria-label="Usuń notatkę"
                    onClick={() => void remove()}
                  >
                    <Icon name="trash" />
                  </button>
                </div>
              </div>
              <Markdown
                content={selected.content}
                documents={documents}
                open={setSelected}
              />
              <div className="mt-8 border-t border-slate-100 pt-4">
                <h3>Linki przychodzące</h3>
                {backlinks.length ? (
                  backlinks.map((d) => (
                    <button
                      key={d.id}
                      className="crm-text-button mr-4"
                      onClick={() => setSelected(d)}
                    >
                      {d.title}
                    </button>
                  ))
                ) : (
                  <p className="crm-muted">
                    Inne notatki mogą wskazywać na tę przez [[{selected.title}
                    ]].
                  </p>
                )}
              </div>
            </>
          ) : (
            <Empty
              title={
                documents.length
                  ? "Wybierz notatkę"
                  : "Zbuduj pamięć swojej firmy"
              }
              description="Zapisz ofertę, zasady komunikacji, procesy i lokalizacje. Dane są w SQLite; eksport ZIP otworzysz jako skarbiec Obsidiana."
              action={
                <button className="crm-button" onClick={() => setEditor({})}>
                  Dodaj pierwszą notatkę
                </button>
              }
            />
          )}
        </section>
      </div>
      {editor && (
        <BrainEditor
          wid={wid}
          note={editor.note}
          close={() => setEditor(null)}
          saved={() => void load()}
        />
      )}
      {generator && (
        <BrainGenerator
          wid={wid}
          close={() => setGenerator(false)}
          saved={() => void load()}
          openAi={openAi}
        />
      )}
    </div>
  );
}
