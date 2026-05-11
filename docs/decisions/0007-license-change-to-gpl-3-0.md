# ADR 0007: Relicense from MIT to GPL-3.0-or-later

## Status

Accepted on 2026-05-10.

## Context

CogniPace originally shipped under the MIT license. The company-pools feature requires ingesting a third-party dataset that ships company-tagged LeetCode problem lists. The upstream dataset selected for this purpose, [CodeJeet](https://github.com/codejeet/codejeet), is licensed under GPL-3.0-or-later.

GPL-3.0 is a copyleft license. Bundling GPL-3.0 data into an MIT-licensed project and distributing the combined work creates a license-compatibility problem: GPL-3.0's copyleft propagation requires the combined work to be released under GPL-3.0 or a compatible license. MIT is not GPL-compatible in that direction.

The alternatives considered were:

1. Find a permissively-licensed equivalent dataset. No comparable dataset with a permissive license was identified at the time of this decision.
2. Ask each user to obtain the dataset themselves and import it locally, keeping the CogniPace repository free of GPL-licensed content. Workable but pushes setup friction onto every user and complicates the import surface.
3. Relicense CogniPace to GPL-3.0-or-later so the project can ingest, bundle, and distribute the upstream dataset without compatibility issues.

Option 3 was selected.

## Decision

Relicense CogniPace from MIT to GPL-3.0-or-later, effective from this commit.

All current human contributors holding copyright in the codebase (Tobi Olutimehin and Timi Olaosebikan) have given explicit consent to the relicensing. The repository has no published releases, no git tags, and no public distribution under the prior MIT license at the time of the change.

The `license` field in `package.json` is set to `GPL-3.0-or-later`. The repository root `LICENSE` file is replaced with the verbatim GPL-3.0 text. `README.md` reflects the new license and adds upstream-data attribution.

## Consequences

- Distributed builds of the extension must comply with GPL-3.0's source-availability obligations. Distribution via the Chrome Web Store is permitted but the source must remain available.
- Any future contribution to the repository is contributed under GPL-3.0-or-later by default.
- Future dependencies must be GPL-3.0-compatible (MIT, BSD, Apache-2.0, LGPL, etc.). AGPL-only or proprietary dependencies are not allowed.
- Downstream forks and modifications by third parties must also be GPL-3.0-or-later if distributed.
- Inbound contributions from automation accounts (Dependabot, Renovate, Jules, etc.) continue to be treated as contributions under the project license, consistent with the prior MIT treatment.
- The prior MIT version of the project remains MIT-licensed for anyone who already obtained it under those terms, but no MIT distribution has been published.

## Revisit Triggers

- The upstream company-pools dataset becomes available under a permissive license, removing the need for GPL-3.0 ingestion.
- A future product decision introduces a non-GPL-compatible dependency or surface that would benefit from a different licensing posture.
- A future contributor declines the GPL-3.0 contribution model and an alternative arrangement becomes necessary.
