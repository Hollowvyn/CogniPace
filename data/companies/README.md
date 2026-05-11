# Company CSV source

Per-company LeetCode interview question lists, one CSV per company.

## Source and license

These CSVs are sourced from [CodeJeet](https://github.com/codejeet/codejeet),
licensed under **GPL-3.0-or-later**. Bundling this data into CogniPace is
the reason CogniPace itself is licensed under GPL-3.0-or-later (see
[`docs/decisions/0007-license-change-to-gpl-3-0.md`](../../docs/decisions/0007-license-change-to-gpl-3-0.md)).

## Format

Each file is named `<companySlug>.csv` and contains:

```
ID,URL,Title,Difficulty,Acceptance %,Frequency %
1,https://leetcode.com/problems/two-sum,Two Sum,Easy,57.1%,100.0%
...
```

The slug used to identify a company in CogniPace is the filename without `.csv`.

## Refresh workflow

These CSVs are a periodic upstream snapshot, not live data. CogniPace
does not scrape LeetCode, does not store LeetCode credentials, and does
not refresh this data at runtime. To refresh:

1. Re-export the upstream CSVs from CodeJeet (or rebuild them via their
   scraper).
2. Overwrite the files in this directory.
3. Run `npm run build` to regenerate
   `src/data/catalog/generated/companiesCatalog.json`.
4. Commit both the refreshed CSVs and the regenerated JSON.

## What CogniPace does with this

A build-time script (`scripts/build-company-catalog.mjs`) parses every
CSV and emits a unified JSON catalog used by the extension's data layer
to seed company-tagged study sets. The extension never reads these CSVs
at runtime.
