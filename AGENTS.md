# Agent Operating Contract

## Purpose

This file governs how coding agents and automation should operate in this repo.

- It does not override the product docs. It constrains how agents act within them.
- Humans own product authority. Agents execute within documented scope and the current repo architecture.
- Later unchecked phases in `requiredStepsForSetup.md` are not permission to start work.

## Required Reading Order

Read these in order before planning or implementing changes:

1. `README.md`
2. `docs/product.md`
3. `docs/features.md`
4. `docs/architecture.md`
5. `docs/DESIGN_GUIDELINES.md`
6. `requiredStepsForSetup.md`

## Authority Model

- Humans own roadmap, scope changes, releases, architecture shifts, permissions, and merge decisions.
- Agents work inside documented product scope and the current React architecture.
- If a requested change conflicts with the current architecture, propose the architecture change explicitly instead of smuggling it into an implementation task.

## React Architecture Rules

- React 19 + MUI + Emotion are the canonical UI stack.
- Do not reintroduce direct DOM-rendered UI patterns into popup or dashboard surfaces.
- Keep `src/domain/*` React-free.
- Keep `src/entrypoints/*` thin. They bootstrap screens; they do not own product logic.
- UI reads and writes should flow through repositories and runtime clients, not direct `chrome.storage` access from UI code.
- Treat `src/ui/providers.tsx` and `src/ui/theme.ts` as shared repo contracts.
- Keep the layered boundary intact across `src/ui/*`, `src/data/*`, `src/domain/*`, and `src/extension/*`.

## Agent Lanes

### Humans

- Own roadmap, scope, releases, architecture, permissions, and merge decisions.

### Jules

- Maintenance only.
- Allowed lanes:
  - recurring low-risk maintenance
  - CI repair on Jules-created PRs
  - dependency hygiene
  - small React UI polish
  - performance cleanup
  - docs cleanup
- Jules may not self-start roadmap work.

### Codex And Similar Interactive Agents

- Human-directed implementation only.
- Allowed lanes:
  - feature work within documented scope
  - refactors that preserve documented architecture
  - bug fixes
  - test improvements
  - documentation updates tied to requested work

## Blocked Work Without Human Approval

- product scope expansion
- manifest permission changes
- auth, account, or backend introduction
- major dependency shifts
- major architecture changes across `ui`, `data`, `domain`, and `extension`
- storage model redesign
- styling-system replacement

## Doc Update Triggers

- Update `docs/product.md` or `docs/features.md` when behavior changes.
- Update `docs/architecture.md` when runtime flow, storage flow, repository contracts, providers, routes, or architectural boundaries change.
- Update ADRs under `docs/decisions/` when theme, provider, styling, or other core technical decisions change.
- Update `requiredStepsForSetup.md` when setup or process expectations change.

## Validation Requirements

- Run `npm run check` when a change touches:
  - `src/**`
  - `tests/**`
  - `public/**`
  - `.github/workflows/*`
  - `.github/dependabot.yml`
  - `package.json`
  - `package-lock.json`
  - `build.cjs`
  - `tsconfig.json`
  - `eslint.config.mjs`
  - `vitest.config.mjs`
- `npm run check` is the default full agent validation command because it already runs:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run test`
  - `npm run build`
- For docs-only and governance-only changes touching only files such as:
  - `*.md`
  - `CODEOWNERS`
  - `.github/PULL_REQUEST_TEMPLATE.md`
  - `.github/ISSUE_TEMPLATE/*`
  - `SECURITY.md`
  - `CONTRIBUTING.md`
  - `requiredStepsForSetup.md`
- use `npm run format:check` only for that docs-only or governance-only path.
- Agents must not claim runtime, test, or build validation for docs-only work unless they also ran `npm run check`.
- If `npm run check` fails because of a pre-existing unrelated issue, the agent must say so explicitly and avoid claiming a fully green result.

## Execution Defaults

- If docs conflict, follow the higher-precedence product, feature, or architecture doc and stop for human clarification on the conflicting part.
- Future ideas are not implementation approval.
- `In Scope` in `docs/features.md` means directionally allowed if explicitly requested and reviewed, not self-starting backlog permission.
- If a task would cross blocked lanes, stop and ask for explicit human approval first.

## Explicitly Deferred

This file does not authorize or perform later setup phases.

- No actual Jules scheduled-task setup in this phase
- No GitHub Marketplace app installs in this phase
- No `CLAUDE.md` in this phase
- No CI workflow files in this phase
- No branch protection or org-transfer work in this phase
