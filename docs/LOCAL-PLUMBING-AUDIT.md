# Local Plumbing Services: audit and implementation

Audit date: 6 October 2026. Baseline: c0d22cb5dfb3fdc8aeb9d43377f3efd5b6e322f7.

## Existing building blocks

Reuse Lead Hub identity resolution, version checks, event ledger, quotes, appointments, jobs and payments; the SQLite workspace and backup; CSV campaign import; Google OAuth/Ads/GA4/Search Console; Stripe; Company Brain; the existing AI provider selection, reports and scheduler. Do not introduce a second CRM.

## Ten changes, in implementation order

1. UK lead intake: postcode, plumbing service, urgency, problem and call/form/WhatsApp channel; UK phone normalisation.
2. New Lead -> Contacted -> Qualified -> Quote Sent -> Booked -> In Progress -> Completed -> Paid -> Lost, retaining legacy Won records.
3. A separate, repeatable DEMO workspace and downloadable source files with synthetic contacts and no live account claims.
4. Compact owner overview: leads today, qualified leads, booked jobs, spend, cost per booking, payment revenue and attributable ROAS.
5. An event-derived acquisition funnel, preserving one customer history and avoiding counting quotes or job values as revenue.
6. Google/Microsoft Ads keyword and search-term imports, CPC/CPA, qualified outcomes and payment attribution.
7. Call log linked to existing Lead Hub: answered/missed, duration, tracking number, campaign and landing page.
8. Tracking reconciliation by date/channel: CRM, GA4, GTM observations, Google Ads and Microsoft Ads; missing observations are unknown, not healthy.
9. GBP/local SEO imports: dated calls/reviews/rank observations, service/location pages and explicit competitor observations.
10. A daily, evidence-based plumbing briefing in the existing AI/automation flow, with follow-up actions and reviewable campaign recommendations.

## UX capture

1. Workspace selection: functional; requires manual setup before useful data is visible.
2. Service onboarding: functional; generic Polish CRM/service split requires interpretation for a UK plumbing owner.
3. Owner dashboard: functional empty state; large generic greeting and duplicated statistics precede actionable leads; currency/timezone are PLN/Europe-Warsaw.

Screenshots captured from the running local app during this audit. Accessibility screenshot limits: appearance alone does not verify keyboard or assistive-technology support. New controls are checked in the running app after implementation.

Captured views: [before](screenshots/local-plumbing-before.jpg), [owner overview](screenshots/local-plumbing-owner.jpg), [Company Brain](screenshots/local-plumbing-brain.jpg), [mobile overview](screenshots/local-plumbing-mobile.jpg).

## Company grounding

Official homepage: https://local-plumbing-services.co.uk/
Dartford page: https://local-plumbing-services.co.uk/dartford-kent/
Owner-supplied Company Brain: Local_Plumbing_Services_COMPANY_BRAIN.md (6 October 2026).
Use the supplied company logo, blue/white palette, GBP, en-GB and Europe/London. Dartford/Kent and Maidstone are service areas, not invented offices. Do not import public review counts as current live account data.

## Honest integration boundaries

Local plumbing extensions use SQLite, matching the currently complete local edition. Existing Supabase CRM/Lead Hub remains available; a migration extends its pipeline/currency validation. Google/Stripe live connectors are reused and require owner credentials. Microsoft Ads, keyword reports, call providers, GBP and tracking observations work through validated file imports; they are not live API integrations. A GTM event count means an imported observation, not proof a website tag is correctly configured. Daily scheduling still requires the app to remain open.

## Implemented outcome

The ten changes above extend the existing modules. The owner dashboard replaces the stacked generic dashboards in SQLite. The logo, blue/white visual theme, local Inter font, glass panels, button states, mobile layouts and main navigation are tailored to Local Plumbing Services. Additional existing modules remain accessible under More tools.

SEO Search Audit adds a saved HTML check, local search phrase checks, contact path checks and separately dated saved Search Console queries, using the existing public-page reader and connector. A live check of the official homepage succeeded locally on 6 October 2026. Its HTML score is a diagnostic checklist score, not a Google ranking estimate.

The supplied Company Brain is loaded without editing its original content. The ready demo is preloaded on opening the local edition; loading it again preserves edits and creates no duplicate leads. See [setup and data definitions](LOCAL-PLUMBING-SETUP.md).
