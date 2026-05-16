# Jules Instructions

Jules schedules are configured in the Jules platform, not as GitHub scheduled workflows in this repo.

The online Jules prompts are the source of truth for the scheduled agents:

- Cartographer: docs drift
- Sentinel: security hardening
- Palette: micro-UX and accessibility
- Victor: testing reliability

Each online prompt should tell Jules to read `AGENTS.md` first and follow the repo's product, architecture, validation,
branch, and PR rules.

## Platform Setup

- Keep network access enabled.
- Enable Suggested Tasks only inside documented maintenance lanes.
- Enable Jules CI fixer only for Jules-created PRs.
- Set default commit authorship to co-authored.

## Branches

Scheduled Jules agents should request branches named `jules/<workflow>/<change>`.

Examples:

- `jules/cartographer/docs-drift-alignment`
- `jules/sentinel/runtime-hardening`
- `jules/palette/popup-a11y-labels`
- `jules/victor/test-helper-cleanup`

Manual or no-workflow Jules tasks use `jules/<change>`.

The repo keeps a GitHub Actions compliance check for Jules PR branch and title conventions.

## Code And PR Expectations

- Do not add explanatory comments for obvious code.
- Add comments only when the repo-specific reason is non-obvious.
- Keep every PR to exactly one small, high-confidence maintenance change.
- Explain intent, validation, and tradeoffs in the PR body instead of narrating code inline.
- Stop without a PR if no clear lane-safe change exists.

## Repo-Side Actions

Jules itself owns scheduled work in the Jules platform. GitHub Actions only handles repo-side guardrails:

- `jules-pr-compliance.yml` checks Jules PR branch and title conventions.
- `codex-review-jules-prs.yml` comments `@codex review` on new Jules PRs.
- The existing labeler treats `.jules/**/*` changes as automation changes.

## Codex Review

New Jules PRs are automatically commented with `@codex review` by `.github/workflows/codex-review-jules-prs.yml`.

Codex review guidance lives in `AGENTS.md` under `Review Guidelines`.
