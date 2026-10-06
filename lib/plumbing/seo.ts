import { pageText } from "../knowledge/research";
export type SeoCheck = {
  id: string;
  label: string;
  status: "pass" | "review" | "fail";
  detail: string;
};
export type SeoAuditResult = {
  url: string;
  checkedAt: string;
  title: string;
  description: string;
  canonical: string;
  h1: string[];
  keyword: string;
  score: number;
  checks: SeoCheck[];
  demo: boolean;
  queries: { label: string; values: Record<string, number> }[];
  queryPeriod: { from: string; to: string; fetchedAt: string } | null;
  limitations: string[];
};
function attributes(tag: string) {
  return Object.fromEntries(
    [...tag.matchAll(/([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)].map(
      (m) => [m[1].toLowerCase(), m[2] ?? m[3] ?? m[4] ?? ""],
    ),
  );
}
export function auditHtml(
  html: string,
  url: string,
  keyword: string,
  checkedAt = new Date().toISOString(),
): SeoAuditResult {
  const title = pageText(
    html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "",
  );
  const meta = [...html.matchAll(/<meta\b[^>]*>/gi)].map((m) =>
    attributes(m[0]),
  );
  const description =
      meta.find((a) => a.name?.toLowerCase() === "description")?.content ?? "",
    robots =
      meta.find((a) => a.name?.toLowerCase() === "robots")?.content ?? "";
  const canonical =
    [...html.matchAll(/<link\b[^>]*>/gi)]
      .map((m) => attributes(m[0]))
      .find((a) => a.rel?.toLowerCase() === "canonical")?.href ?? "";
  const h1 = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) =>
    pageText(m[1]),
  );
  const text = pageText(html),
    location = /dartford|maidstone|kent|gravesend|bexley|swanley/i.test(
      title + " " + h1.join(" "),
    );
  let localSchema = false;
  for (const match of html.matchAll(
    /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    try {
      const json = JSON.parse(match[1]);
      localSchema ||=
        /"@type"\s*:\s*(?:"(?:LocalBusiness|Plumber|HomeAndConstructionBusiness)"|\[[^\]]*"(?:LocalBusiness|Plumber)")/.test(
          JSON.stringify(json),
        );
    } catch {}
  }
  const images = [...html.matchAll(/<img\b[^>]*>/gi)].map((m) =>
      attributes(m[0]),
    ),
    missingAlt = images.filter((a) => a.alt === undefined).length;
  const checks: SeoCheck[] = [
    {
      id: "title",
      label: "Search title",
      status: !title
        ? "fail"
        : /draft|lightweight test|test page/i.test(title) || title.length > 65
          ? "review"
          : "pass",
      detail: title
        ? `${title} (${title.length} characters)`
        : "No title element found.",
    },
    {
      id: "description",
      label: "Meta description",
      status: !description
        ? "fail"
        : description.length < 70 || description.length > 170
          ? "review"
          : "pass",
      detail: description
        ? `${description} (${description.length} characters)`
        : "No description found. Search engines may generate their own snippet.",
    },
    {
      id: "heading",
      label: "Page heading",
      status: h1.length === 1 ? "pass" : "review",
      detail: `${h1.length} H1 headings: ${h1.join(" · ") || "none"}. Check that the main service and location are clear.`,
    },
    {
      id: "indexing",
      label: "Indexing instruction",
      status: /noindex/i.test(robots) ? "fail" : "review",
      detail: /noindex/i.test(robots)
        ? "HTML robots meta contains noindex."
        : "No noindex meta found. robots.txt, HTTP X-Robots-Tag and Search Console indexing still need verification.",
    },
    {
      id: "canonical",
      label: "Canonical URL",
      status: canonical === url ? "pass" : canonical ? "review" : "fail",
      detail: canonical || "No canonical link found.",
    },
    {
      id: "local-intent",
      label: "Local service intent",
      status: location ? "pass" : "review",
      detail: location
        ? "A supported local area appears in the title or heading."
        : "Make the served location clear in the title or main heading where relevant.",
    },
    {
      id: "call",
      label: "Call conversion path",
      status: /href\s*=\s*["']tel:/i.test(html) ? "pass" : "fail",
      detail: /href\s*=\s*["']tel:/i.test(html)
        ? "Telephone link found. Clicks are not proof of answered calls."
        : "No click-to-call link found in server HTML.",
    },
    {
      id: "whatsapp",
      label: "WhatsApp contact",
      status: /wa\.me|api\.whatsapp\.com/i.test(html) ? "pass" : "review",
      detail: /wa\.me|api\.whatsapp\.com/i.test(html)
        ? "WhatsApp link found. Message receipt still needs channel tracking."
        : "No WhatsApp link found in server HTML.",
    },
    {
      id: "schema",
      label: "Local business structured data",
      status: localSchema ? "pass" : "review",
      detail: localSchema
        ? "Recognisable local-business/plumber JSON-LD found. This is not Google's Rich Results validation."
        : "No recognisable LocalBusiness/Plumber JSON-LD found.",
    },
    {
      id: "alt",
      label: "Image descriptions",
      status: missingAlt ? "review" : "pass",
      detail: `${images.length} images; ${missingAlt} without an alt attribute. Decorative empty alt text is valid.`,
    },
  ];
  if (keyword)
    checks.push({
      id: "keyword",
      label: "Target search phrase",
      status: (title + " " + h1.join(" "))
        .toLowerCase()
        .includes(keyword.toLowerCase())
        ? "pass"
        : "review",
      detail: `Checking “${keyword}” in the title and H1. Phrase presence alone does not establish rankings.`,
    });
  if (
    /demo (only|form)|nothing is sent or saved|not connected to booking/i.test(
      text,
    )
  )
    checks.push({
      id: "demo-form",
      label: "Callback form availability",
      status: "fail",
      detail:
        "Page text identifies a demo form or disconnected booking flow. Verify lead delivery before paying for traffic.",
    });
  return {
    url,
    checkedAt,
    title,
    description,
    canonical,
    h1,
    keyword,
    score: Math.round(
      (checks.filter((c) => c.status === "pass").length / checks.length) * 100,
    ),
    checks,
    demo: false,
    queries: [],
    queryPeriod: null,
    limitations: [
      "Server HTML inspection only; no JavaScript rendering, Core Web Vitals, Google SERP/rank measurement or complete crawl.",
      "Score is the fraction of these checks that pass, not a prediction of Google rankings.",
      "Search Console queries are separately dated saved connector data, if available.",
    ],
  };
}
