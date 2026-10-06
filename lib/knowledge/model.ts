export const CATEGORIES = [
  "company",
  "services",
  "locations",
  "marketing",
  "tracking",
  "web",
  "processes",
  "competitors",
] as const;
export type Category = (typeof CATEGORIES)[number];
export const categoryLabels: Record<Category, string> = {
  company: "Company & brand",
  services: "Services & quotes",
  locations: "Locations",
  marketing: "Marketing",
  tracking: "Tracking",
  web: "Website",
  processes: "Processes & guidance",
  competitors: "Competitors",
};
export type Document = {
  id: string;
  title: string;
  category: Category;
  content: string;
  revision: number;
  updated_at: string;
};
export function validateDocument(value: unknown) {
  if (!value || typeof value !== "object")
    throw Error("Nieprawidłowa notatka.");
  const d = value as Document;
  if (
    typeof d.title !== "string" ||
    !d.title.trim() ||
    d.title.length > 100 ||
    /[\[\]<>:"|?*\\/\x00-\x1f]/.test(d.title) ||
    /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(d.title.trim()) ||
    d.title.trim().endsWith(".") ||
    !CATEGORIES.includes(d.category) ||
    typeof d.content !== "string" ||
    d.content.length > 200000 ||
    !Number.isSafeInteger(d.revision) ||
    d.revision < 0
  )
    throw Error("Sprawdź tytuł, kategorię i treść (do 200 tys. znaków).");
  return { ...d, title: d.title.trim() };
}
export function wikiLinks(content: string) {
  return [
    ...new Set(
      [...content.matchAll(/\[\[([^\]\n]+)\]\]/g)].map((m) =>
        m[1].split("|")[0].trim(),
      ),
    ),
  ];
}
export function noteFilename(d: Pick<Document, "id" | "title" | "category">) {
  const name = d.title
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "-")
    .replace(/[. ]+$/g, "")
    .trim();
  return `${d.category}/${name || d.id}.md`;
}
