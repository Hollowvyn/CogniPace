# ADR 0008: Company-Tagged Dataset Is a Periodic Static Snapshot

## Status

Accepted on 2026-05-10.

## Context

The company-pool feature (see `docs/features.md` → "Company Pools And
Interview Targets") needs a dataset that maps LeetCode problems to the
companies known to ask them, with a frequency signal. LeetCode itself
gates that data behind Premium and forbids automated access via its
Terms of Service.

The community-maintained [codejeet](https://github.com/codejeet/codejeet)
repository scrapes and publishes the data as CSVs. CogniPace was
relicensed to GPL-3.0-or-later in ADR 0007 specifically so it can
bundle codejeet's GPL-3.0 data without copyleft incompatibility.

Three approaches to integrating that data were considered:

1. **Live scraping at runtime.** The extension fetches per-company pages
   from leetcode.com on demand. Requires new manifest host permissions
   (blocked by ADR 0005), credential storage for Premium-gated data
   (blocked by ADR 0002), violates LeetCode's Terms of Service, and is
   technically infeasible inside the extension sandbox at the scale of
   662 companies.
2. **Server-backed periodic scrape.** A backend service runs the scraper
   on a schedule and serves refreshed JSON to the extension. Requires
   adding a backend (blocked by ADR 0004) and a hosting/operations
   surface inconsistent with the local-first principle (ADR 0001).
3. **Static snapshot bundled with the extension.** The codejeet CSVs are
   copied into `data/companies/`, converted to JSON at build time, and
   shipped as part of the extension. Refresh is a maintainer task
   (re-import CSVs, re-run build, ship a release). No runtime data
   fetching, no credentials, no backend.

Option 3 was selected.

## Decision

The company-tagged dataset is a periodic static snapshot.

- The source CSVs live at `data/companies/*.csv`, committed to the
  repository and licensed GPL-3.0-or-later (consistent with ADR 0007).
- `scripts/build-company-catalog.mjs` parses every CSV at build time and
  emits `src/data/catalog/generated/companiesCatalog.json`, which the
  extension imports through a typed loader.
- The build script is wired into `npm run build` and exposed as the
  standalone `npm run build:companies` for ad-hoc refresh.
- Refreshing the data is a maintainer-driven task: replace the CSVs
  under `data/companies/`, run `npm run build:companies`, commit both
  the refreshed CSVs and the regenerated JSON, ship a new extension
  release. Users receive the refresh through normal extension updates.
- The extension never reaches `leetcode.com` to fetch this data, never
  stores LeetCode credentials, and never runs the upstream scraper.

## Consequences

- The dataset is at most as fresh as the most recent maintainer refresh.
  This is documented in `data/companies/README.md` and `README.md`'s
  Data Attribution section.
- Stale data causes only graceful degradation: company-pools resolve to
  the slugs known at snapshot time, and any newly-added LeetCode
  problems simply lack tagging until the next refresh.
- The `dist/background.js` bundle grows by the catalog payload (~1.5 MB
  minified). This is acceptable for a service-worker bundle but is a
  flagged target for lazy-loading if the catalog grows further.
- The Chrome extension manifest does not gain a `leetcode.com/company/*`
  host permission, preserving the minimal-permissions stance (ADR 0005).
- Future contributors must not introduce in-extension scraping,
  credential storage, or a backend service to refresh this data — those
  paths are explicitly out of scope and would require overturning ADRs
  0002, 0004, and 0005.

## Revisit Triggers

- LeetCode publishes an official public API for company-tagged data
  under a permissive license, removing the need for the codejeet snapshot.
- A licensed third-party API or dataset becomes available that ships
  with a freshness guarantee meaningfully better than periodic releases.
- The refresh cadence proves too costly to maintain manually and a
  user-supplied import path becomes preferable to the bundled snapshot.
