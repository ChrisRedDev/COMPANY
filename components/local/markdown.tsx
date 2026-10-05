import type { ReactNode } from "react";
import type { Document } from "@/lib/knowledge/model";
export default function Markdown({
  content,
  documents,
  open,
}: {
  content: string;
  documents: Document[];
  open: (d: Document) => void;
}) {
  function inline(line: string): ReactNode {
    return line
      .split(
        /(\[\[[^\]\n]+\]\]|\*\*[^*]+\*\*|`[^`]+`|\[[^\]\n]+\]\(https:\/\/[^\s)]+\)|https:\/\/[^\s<>]+)/g,
      )
      .map((part, i) => {
        if (part.startsWith("[[")) {
          const [target, alias] = part.slice(2, -2).split("|"),
            doc = documents.find(
              (d) =>
                `${d.category}/${d.title}` === target || d.title === target,
            );
          return doc ? (
            <button
              key={i}
              className="text-violet-700 underline decoration-violet-300 underline-offset-4"
              onClick={() => open(doc)}
            >
              {alias || target}
            </button>
          ) : (
            <span
              key={i}
              className="text-slate-400"
              title="Notatka nie istnieje"
            >
              {alias || target}
            </span>
          );
        }
        if (part.startsWith("**"))
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        if (part.startsWith("`"))
          return (
            <code key={i} className="rounded bg-slate-100 px-1.5 text-sm">
              {part.slice(1, -1)}
            </code>
          );
        const link = part.match(/^\[([^\]]+)\]\((https:\/\/[^\s)]+)\)$/);
        const href = link?.[2] || (part.startsWith("https://") ? part : "");
        if (href)
          return (
            <a
              key={i}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="break-all text-violet-700 underline underline-offset-4"
            >
              {link?.[1] || href}
            </a>
          );
        return part;
      });
  }
  const lines = content.split("\n"),
    blocks: ReactNode[] = [];
  const cells = (line: string) =>
    line
      .trim()
      .replace(/^\||\|$/g, "")
      .split("|")
      .slice(0, 15)
      .map((cell) => cell.trim());
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("```")) {
      const code: string[] = [];
      while (++i < lines.length && !lines[i].startsWith("```"))
        code.push(lines[i]);
      blocks.push(
        <pre
          key={i}
          className="overflow-auto rounded-lg bg-slate-50 p-4 text-sm"
        >
          <code>{code.join("\n")}</code>
        </pre>,
      );
    } else if (
      line.includes("|") &&
      /^\s*\|?\s*:?-{3,}/.test(lines[i + 1] || "")
    ) {
      const headers = cells(line),
        rows: string[][] = [];
      i += 2;
      for (; i < lines.length && lines[i].includes("|") && lines[i].trim(); i++)
        rows.push(cells(lines[i]));
      i--;
      blocks.push(
        <div
          key={i}
          className="min-w-0 overflow-x-auto rounded-lg border border-slate-200"
        >
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50">
              <tr>
                {headers.map((h, c) => (
                  <th key={c} className="min-w-28 px-4 py-3">
                    {inline(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, r) => (
                <tr key={r} className="border-t border-slate-100">
                  {headers.map((_, c) => (
                    <td key={c} className="px-4 py-3 align-top">
                      {inline(row[c] || "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
    } else if (/^#{1,6} /.test(line)) {
      const match = line.match(/^(#+) (.*)$/)!;
      blocks.push(
        match[1].length <= 2 ? (
          <h2 key={i} className="mt-5 text-xl!">
            {inline(match[2])}
          </h2>
        ) : (
          <h3 key={i} className="mt-3 text-lg!">
            {inline(match[2])}
          </h3>
        ),
      );
    } else if (/^---+$/.test(line))
      blocks.push(<hr key={i} className="my-3 border-slate-100" />);
    else if (line.startsWith("- "))
      blocks.push(
        <p key={i} className="pl-2">
          • {inline(line.slice(2))}
        </p>,
      );
    else if (line.startsWith("> "))
      blocks.push(
        <blockquote
          key={i}
          className="rounded-r-lg border-l-2 border-violet-300 bg-violet-50/50 py-2 pl-4 text-slate-600"
        >
          {inline(line.slice(2))}
        </blockquote>,
      );
    else if (line.trim())
      blocks.push(
        <p key={i} className="whitespace-pre-wrap">
          {inline(line)}
        </p>,
      );
  }
  return (
    <div className="grid min-w-0 gap-3 text-[15px] leading-7 break-words">
      {blocks}
    </div>
  );
}
