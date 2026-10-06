import { gbp, type PlumbingReport } from "./model";
export function dailyBriefing(report: PlumbingReport) {
  const kinds = [
    ["budget", "Budget to review"],
    ["scale", "Campaigns to consider scaling"],
    ["keyword", "Search terms to review"],
    ["followup", "Lead follow-up"],
    ["tracking", "Tracking health"],
  ] as const;
  return (
    `## Local Plumbing Services · daily briefing${report.demo ? " · DEMO" : ""}\n\n${report.kpis.leadsToday} leads today · ${report.kpis.booked} bookings · ${gbp(report.kpis.revenue)} received. Evidence period: ${report.from}–${report.to}, GBP, Europe/London.\n\n` +
    kinds
      .map(
        ([kind, title]) =>
          `### ${title}\n` +
          (report.briefing
            .filter((i) => i.kind === kind)
            .slice(0, 6)
            .map((i) => `- **${i.title}** — ${i.detail}`)
            .join("\n") || "No rule triggered for the available observations."),
      )
      .join("\n\n") +
    "\n\nRecommendations are based on CRM events and saved/imported reports. Review conversion lag and engineer capacity before changing campaigns. The app has not changed advertising settings."
  );
}
