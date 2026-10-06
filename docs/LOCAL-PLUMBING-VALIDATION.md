# Validation

Baseline unit tests: 63 passing, with three Windows portability failures (open SQLite handles during cleanup and a POSIX permission assertion).

The plumbing change adds tests for UK identity and postcodes, currency-safe payment ROAS, London day boundaries, unique-lead tracking definitions, CSV validation, isolated/idempotent demo loading, optimistic pipeline updates, call replay protection and SEO limits. Test cleanup closes the scoped SQLite connections on Windows; POSIX permission checks remain enabled on POSIX systems. Currency, date and scheduler assertions now expect GBP, en-GB and Europe/London, including the autumn DST change.

Current verification: 72 unit tests passed; TypeScript check passed; lint passed without errors or warnings; local production build passed. Browser checks confirmed preloaded demo selection, 20 demo leads, the supplied Company Brain, the nine-stage pipeline, and a successful live homepage HTML audit.

The offline assistant returned all five evidence-based briefing categories without an API key. The owner dashboard loaded at a 390px viewport without document overflow; the temporary viewport override was reset afterwards.

Authenticated Google/Microsoft/Stripe/GBP reports were not exercised with real company accounts. The new Supabase migration has not been executed against a live Postgres instance. Local specialist reporting remains SQLite-only.

`npm audit fix` removed the baseline critical dependency findings using updates within the declared version ranges. Five high-severity transitive lint-toolchain findings remain; the suggested forced fix changes the major Next ESLint configuration and was not applied.
