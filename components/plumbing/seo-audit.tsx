"use client";
import { useEffect, useState } from "react";
import { BRAND } from "@/lib/plumbing/model";
import type { SeoAuditResult } from "@/lib/plumbing/seo";
import { Icon } from "../crm/ui";
export default function SeoAudit({
  wid,
  demo,
}: {
  wid: string;
  demo: boolean;
}) {
  const [url, setUrl] = useState<string>(BRAND.website),
    [keyword, setKeyword] = useState("emergency plumber dartford"),
    [result, setResult] = useState<SeoAuditResult | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    fetch(`/api/plumbing/${wid}/seo`, { cache: "no-store" })
      .then((r) => r.json())
      .then((r) => {
        if (active && r.audit) setResult(r.audit);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [wid]);
  async function run(useDemo = false) {
    setBusy(true);
    setError("");
    try {
      const r = await fetch(`/api/plumbing/${wid}/seo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, keyword, demo: useDemo }),
      });
      const data = await r.json();
      if (!r.ok) throw Error(data.error);
      setResult(data.audit);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Audit failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="plumbing-card">
      <div className="plumbing-card-heading">
        <div>
          <span className="plumbing-kicker">SEARCH VISIBILITY</span>
          <h2>SEO Search Audit</h2>
        </div>
        <span className="plumbing-chip">Website + Search Console</span>
      </div>
      <p className="plumbing-note">
        Check a company landing page, its local search phrase and its lead
        contact paths. Use the existing Search Console connector for observed
        query performance.
      </p>
      <form
        className="plumbing-seo-form"
        onSubmit={(e) => {
          e.preventDefault();
          void run();
        }}
      >
        <label>
          Company page URL
          <input
            required
            type="url"
            aria-label="SEO page URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </label>
        <label>
          Target search phrase
          <input
            maxLength={200}
            aria-label="SEO target phrase"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </label>
        <button className="crm-button" disabled={busy}>
          <Icon name="search" size={16} />
          {busy ? "Checking page…" : "Run live page audit"}
        </button>
        {demo && (
          <button
            type="button"
            className="crm-button secondary"
            disabled={busy}
            onClick={() => void run(true)}
          >
            Preview DEMO audit
          </button>
        )}
      </form>
      {error && (
        <p role="alert" className="crm-alert error">
          {error}
        </p>
      )}
      {result && (
        <>
          <div className="plumbing-seo-summary">
            <strong>
              {result.score}
              <small>/ 100 · HTML check score</small>
            </strong>
            <div>
              <span
                className={`plumbing-chip ${result.demo ? "warning" : "ok"}`}
              >
                {result.demo ? "DEMO HTML FIXTURE" : "LIVE HTML CHECK"}
              </span>
              <h3>{result.title || "No title found"}</h3>
              <small>
                {new Date(result.checkedAt).toLocaleString("en-GB", {
                  timeZone: "Europe/London",
                })}{" "}
                · {result.url}
              </small>
            </div>
          </div>
          <div className="plumbing-seo-checks">
            {result.checks.map((c) => (
              <article key={c.id}>
                <span
                  className={`plumbing-chip ${c.status === "pass" ? "ok" : "warning"}`}
                >
                  {c.status}
                </span>
                <div>
                  <h3>{c.label}</h3>
                  <p>{c.detail}</p>
                </div>
              </article>
            ))}
          </div>
          <details>
            <summary>Observed Search Console queries</summary>
            {result.queries.length ? (
              <>
                <p className="plumbing-note">
                  {result.queryPeriod?.from} — {result.queryPeriod?.to} ·
                  fetched {result.queryPeriod?.fetchedAt}
                </p>
                <div className="plumbing-table-scroll">
                  <table className="plumbing-table">
                    <thead>
                      <tr>
                        <th>Query</th>
                        <th>Clicks</th>
                        <th>Impressions</th>
                        <th>Position</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.queries.map((q) => (
                        <tr key={q.label}>
                          <td>{q.label}</td>
                          <td>{q.values.clicks ?? "—"}</td>
                          <td>{q.values.impressions ?? "—"}</td>
                          <td>{q.values.position?.toFixed(1) ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p className="plumbing-note">
                No Search Console report saved for this workspace. Connect the
                correct company property and read its report in Connectors.
              </p>
            )}
          </details>
          <p className="plumbing-note">{result.limitations.join(" ")}</p>
        </>
      )}
    </section>
  );
}
