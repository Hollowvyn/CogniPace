# Required Steps for Setup

## Purpose

This file is the ordered setup checklist for making this repo collaboration-ready.

- Complete steps in order unless a step is explicitly marked as parallelizable.
- This is an operational setup document, not the product spec.
- `CLAUDE.md` is intentionally out of scope for this first pass.
- `AGENTS.md` is the canonical agent operating contract for this repo.
- Branch protection and required checks should be phased in only after repo-native CI is in place.
- Unchecked later phases are planning artifacts, not self-starting authorization for humans or agents.
- Agents must follow `AGENTS.md` in addition to the higher-precedence product and architecture docs.

## Doc Precedence And Update Triggers

Precedence order:

1. `docs/product.md`
2. `docs/features.md`
3. `docs/architecture.md`
4. `docs/DESIGN_GUIDELINES.md`
5. `docs/stitch-design-doc.md`
6. `docs/architecture-roadmap.md`
7. this file

Rules:

- If two docs disagree, follow the higher-precedence doc and ask a human before implementing the conflicting part.
- The PR author owns updating any affected docs, and reviewers should block merges when behavior or architecture changes are undocumented.
- Any PR that changes product behavior should update `docs/product.md` or `docs/features.md`.
- Any PR that changes runtime boundaries, persisted data, or message contracts should update `docs/architecture.md`.
- Any PR that changes design conventions should update `docs/DESIGN_GUIDELINES.md`.
- Any PR that changes setup or process expectations should update this file.

## Current Baseline Snapshot

### Repo Facts

- Project type: TypeScript Chrome extension using Manifest V3 with React 19 UI mounted from TSX entrypoints
- Frontend stack: React 19 + MUI + Emotion
- Architecture layout: `ui + data + domain + extension + entrypoints + shared`
- GitHub operating model: personal + private
- Repository visibility: private
- Package manager: `npm`
- Lockfile: `package-lock.json`
- Bundler: `esbuild`
- TypeScript JSX mode: `react-jsx`
- UI testing stack: `vitest` + `@testing-library/react`
- Current scripts:
  - `build`
  - `check`
  - `format`
  - `format:check`
  - `lint`
  - `test`
  - `test:ui`
  - `typecheck`
  - `test:logic`
- Current docs:
  - `AGENTS.md`
  - `README.md`
  - `CONTRIBUTING.md`
  - `SECURITY.md`
  - `docs/product.md`
  - `docs/features.md`
  - `docs/architecture.md`
  - `docs/architecture-roadmap.md`
  - `docs/DESIGN_GUIDELINES.md`
  - `docs/decisions/`
  - `docs/stitch-design-doc.md`
  - `.github/workflows/ci.yml`
  - `.github/dependabot.yml`
  - `.github/PULL_REQUEST_TEMPLATE.md`
  - `.github/ISSUE_TEMPLATE/`

### Still Missing

- none for current public-visibility prep

### Current Health

- `npm run build` passes and bundles TSX entrypoints through `esbuild`
- `npm run check` passes
- `npm run lint` passes with React hooks linting active
- `npm run test` passes
- `npm run test:logic` passes
- `npm run test:ui` passes
- `npm run typecheck` passes with `.tsx` included
- React architecture tests enforce canonical entrypoints, layer boundaries, and repository usage rules
- Local baseline now includes `Node 24 LTS`, `ESLint + Prettier`, `.editorconfig`, and ignored temp output under `.tmp/`
- React is now the canonical UI model, not a provisional migration path
- Root `LICENSE` is now present so the repo can be made public without license drift
- GitHub merge settings now use squash-only merges with auto-delete-on-merge kept on
- GitHub rulesets and protected-branch enforcement remain unavailable on the current private repo tier
- GitHub Actions CI now runs `lint`, `typecheck`, `test`, and `build` on pull requests and pushes to `main`
- Dependabot is configured for weekly npm and GitHub Actions updates
- Vulnerability alerts and automated security fixes are enabled for the current repo model
- CodeQL remains deferred until the repo becomes public

## Ordered Setup Phases

Important:

- Completion of one phase does not authorize automatic start of the next phase.
- Later phases should only be implemented when a human explicitly requests them.

## Current Phase

- Phase 5 is now complete.
- Status: completed on 2026-03-30
- Next true setup phase: Phase 6

## Remaining Execution Order From The React Baseline

1. Phase 6
2. Phase 7

## Phase 0: Stabilize Local Baseline

Status: completed on 2026-03-29

### Goals

- Fix the current `typecheck` errors
- Standardize local commands
- Standardize local editor and runtime behavior

### Steps

- [x] Fix current `npm run typecheck` failures
- [x] Add `test` script
- [x] Add `lint` script
- [x] Add `format` script
- [x] Add `format:check` script
- [x] Add `check` script that runs the full local verification path
- [x] Add `.editorconfig`
- [x] Add `.nvmrc`
- [x] Add `package.json.engines`
- [x] Add `ESLint + Prettier` baseline with:
  - `@eslint/js`
  - `typescript-eslint` typed linting
  - `eslint-plugin-import`
  - `eslint-plugin-no-unsanitized`
  - `eslint-config-prettier`
- [x] Move generated logic test output from tracked `tests/.tmp/logic.test.cjs` to ignored temp storage under `.tmp/`
- [x] Expand `.gitignore` to include:
  - `.idea/`
  - temp build artifacts
  - temp test artifacts
  - extra editor and OS junk

### Done When

- [x] `npm run check` exists
- [x] local baseline commands pass
- [x] contributors have a stable local dev standard
- [x] `npm run test` no longer modifies tracked files

## Phase 1: Product And Scope Documentation

Status: completed on 2026-03-29

### Goals

- Make the product understandable without reading code
- Separate approved scope from future ideas
- Prevent humans and agents from drifting into unapproved work

### Steps

- [x] Expand `README.md`
- [x] Add `docs/product.md`
- [x] Add `docs/features.md`
- [x] Add `docs/architecture.md`
- [x] Add `docs/decisions/`
- [x] Add initial ADRs for:
  - no account system for now
  - local-first storage for now
  - React + MUI + Emotion UI stack
  - no backend for now
  - minimal extension permissions
- [x] Add `docs/DESIGN_GUIDELINES.md` as a complementary design reference
- [x] Keep `docs/stitch-design-doc.md` as a design artifact, not the main product source of truth
- [x] Keep infra/setup documentation out of Phase 1

### Done When

- [x] a new contributor can explain the product and current scope without reading code
- [x] approved scope is clearly separated from future candidates
- [x] implementation work can be reviewed against documented product behavior

## Phase 1.5: React Baseline Realignment

Status: completed on 2026-03-30

### Goals

- Realign setup docs to the React architecture that now exists
- Make the React UI stack canonical in setup and architecture docs
- Ensure later phases assume the current repo shape, not the legacy UI structure

### Steps

- [x] Update the baseline snapshot to reflect React 19 + MUI + Emotion
- [x] Document the current `ui + data + domain + extension + entrypoints + shared` layout
- [x] Update current health to include `npm run test:ui`, React hooks linting, and React architecture tests
- [x] Update build and tooling truth to reflect TSX entrypoints, `jsx: react-jsx`, `vitest`, and `@testing-library/react`
- [x] Refresh `README.md` and `docs/architecture.md` for the React stack
- [x] Replace the outdated plain CSS ADR with a React + MUI + Emotion ADR
- [x] Mark pre-React roadmap assumptions as updated or superseded
- [x] Adjust future phase definitions for a React repo

### Done When

- [x] the checklist no longer describes the repo as a pre-React codebase
- [x] React is documented as the canonical UI model
- [x] future phases assume the current React architecture and validation surface

## Phase 2: Collaboration And Governance Docs

Status: completed on 2026-03-30

### Goals

- Make contribution flow explicit
- Make ownership explicit
- Make review and reporting paths consistent
- Add React-specific contributor rules now that the UI architecture is layered

### Steps

- [x] Upgrade `CONTRIBUTING.md`
- [x] Document layer ownership for:
  - `src/ui/*` for React screens, components, theme, and presentation
  - `src/data/*` for repositories, datasources, and import/export helpers
  - `src/domain/*` for pure business logic
  - `src/extension/*` for runtime contracts, validation, and background routing
- [x] Require screenshots for visible popup, dashboard, or overlay changes
- [x] Require UI test updates when popup, dashboard, or overlay behavior changes
- [x] Require docs updates when architectural boundaries or runtime contracts change
- [x] Add `SECURITY.md`
- [x] Check repo visibility for `LICENSE` requirements
- [x] Repo is private; defer root `LICENSE` until visibility changes
- [x] Add `CODEOWNERS`
- [x] Add `.github/PULL_REQUEST_TEMPLATE.md`
- [x] Add issue forms for:
  - bug
  - feature request
  - maintenance task

### Done When

- [x] contributors have a consistent issue and PR flow
- [x] ownership and review expectations are explicit
- [x] security reporting path is documented

## Phase 3: Agent And Automation Rules

Status: completed on 2026-03-30

### Goals

- Constrain agents to documented scope
- Separate product authority from execution authority
- Make automation useful without allowing scope drift
- Make agent rules explicit for the React architecture
- Make agent validation defaults explicit so code-bearing work always runs the full repo check

### Steps

- [x] Add root `AGENTS.md`
- [x] Require this reading order in `AGENTS.md`:
  - `README.md`
  - `docs/product.md`
  - `docs/features.md`
  - `docs/architecture.md`
- [x] Define roles:
  - humans own roadmap, scope, releases, architecture, and permissions
  - Jules owns recurring maintenance, suggested tasks, CI repair on Jules PRs, dependency hygiene, performance, and UX polish
  - Codex and other interactive coding agents handle human-directed implementation
- [x] State that React is the canonical UI model
- [x] State that agents must not reintroduce direct DOM-rendered UI patterns into popup or dashboard surfaces
- [x] State that domain code must remain React-free
- [x] State that UI code should talk through repositories and runtime clients, not direct Chrome storage access
- [x] Require docs updates when agents change routes, providers, repositories, or runtime contracts
- [x] Require ADR or doc updates when agents change MUI theme, provider, or styling conventions
- [x] Define agent validation defaults:
  - run `npm run check` for code, product/runtime config, build/tooling config, and test changes
  - allow `npm run format:check` for docs-only and governance-only changes
  - do not claim full runtime validation unless `npm run check` actually ran
- [x] Explicitly block agents from:
  - new product scope without human direction
  - manifest permission changes
  - backend or auth additions
  - major architecture shifts without approval
  - major dependency shifts without approval
- [x] Explicitly defer:
  - actual Jules scheduled-task setup
  - GitHub Marketplace installs
  - `CLAUDE.md`
  - CI workflow files
  - branch protection work
  - GitHub org transfer

### Done When

- [x] Jules cannot plausibly interpret future ideas as implementation approval
- [x] all agents are constrained by documented product scope
- [x] product work and maintenance work are clearly distinct

## Phase 4: GitHub Org And Repo Settings

Status: completed on 2026-03-30

### Goals

- Harden the GitHub settings that are currently available on a personal + private repo
- Make the main branch safer for a multi-person team even without full branch protection
- Keep merge flow simple and explicit
- Preserve a clean org/public upgrade path for later

### Steps

- [x] Confirm the current operating model is personal + private
- [x] Keep `main` as the default branch
- [x] Keep auto-delete of merged branches enabled
- [x] Set squash merge as the only enabled merge strategy
- [x] Disable merge commits
- [x] Disable rebase merges
- [x] Document the temporary manual governance policy while full GitHub protections are unavailable:
  - all team changes go through pull requests
  - no direct pushes to `main` except emergencies
  - one human review is required by team policy before merge
  - squash merge is the only accepted merge style
  - required validation for merge decisions remains `npm run check` or the equivalent `lint`, `typecheck`, `test`, and `build` results
- [x] Document the deferred future org/public upgrade path:
  - org transfer remains a future option
  - public visibility remains a future option
  - rulesets and protected-branch enforcement are deferred until the repo becomes public or moves to an org or paid tier that supports them
  - future enforced checks should include:
  - `lint`
  - `typecheck`
  - `test`
  - `build`

### Done When

- [x] current personal + private hardening is applied
- [x] merge policy is clear and lightweight
- [x] the deferred org/public protection path is documented

## Phase 5: CI And GitHub-Native Security

Status: completed on 2026-03-30

### Goals

- Make every PR validate automatically
- Use GitHub-native tooling first
- Phase checks in realistically instead of pretending the repo is already green
- Validate the React stack directly, not just the old TypeScript baseline
- Land the CI and dependency-monitoring pieces that are actually available on the current personal + private repo tier

### Steps

- [x] Add `ci.yml` for:
  - `npm ci`
  - `npm run lint`
  - `npm run build`
  - `npm run test`
  - `npm run typecheck`
- [x] Keep `npm run test` as the combined logic + React UI gate
- [x] Split workflow jobs into:
  - logic tests
  - UI tests
  - build and typecheck
- [x] Keep architecture-boundary coverage inside the existing `npm run test` surface for now
- [x] Add `dependabot.yml`
- [x] Configure GitHub-native dependency monitoring for the current repo model:
  - rely on GitHub dependency graph for the npm lockfile surface
  - enable vulnerability alerts
  - enable automated security fixes
  - configure weekly Dependabot version updates for npm and GitHub Actions
- [x] Explicitly defer:
  - CodeQL default setup until the repo is public
  - enforceable required checks until the repo has rulesets or protected-branch support available

### Done When

- [x] every PR gets automatic validation
- [x] the React validation surface is represented in CI before optional third-party apps are added
- [x] GitHub-native dependency monitoring and security-update automation are in place for the current repo model
- [x] enforceable required checks are documented as deferred until the repo can support them

## Phase 6: Jules Automation

### Goals

- Make Jules part of the core operating model before optional marketplace tooling
- Use Jules for recurring grunt work without giving it product authority
- Let Jules keep its own PRs moving when CI breaks
- Keep Jules inside the current React architecture instead of letting it re-architect the UI

### Steps

- [ ] Install and configure Jules before any optional marketplace stack
- [ ] Enable Jules Suggested Tasks
- [ ] Create scheduled tasks for:
  - weekly security pass
  - weekly dependency hygiene pass
  - weekly UX and accessibility polish pass
  - biweekly performance pass
- [ ] Use Jules CI fixer for Jules-created PRs
- [ ] Set default commit authorship to co-authored
- [ ] Add labels:
  - `agent:jules`
  - `lane:maintenance`
  - `lane:security`
  - `lane:performance`
  - `lane:docs`
  - `needs-human-review`
- [ ] Document Jules allowed React lanes:
  - small React UI fixes
  - MUI or Emotion theme polish
  - component-level UX cleanup
  - UI test fixes
  - performance cleanup in React surfaces
- [ ] Document Jules blocked React lanes:
  - re-architecting the UI layer
  - swapping styling systems
  - moving logic across `ui`, `data`, `domain`, and `extension` boundaries without explicit human direction

### Done When

- [ ] Jules can create and maintain low-risk PRs without redefining product scope
- [ ] recurring grunt work is automated and reviewable
- [ ] Jules-created PRs have a clear labeling and review path

## Phase 7: Marketplace Apps And External Tooling

### Goals

- Add optional external tools only after the repo already has strong internal basics
- Keep the tool stack small and complementary
- Avoid overlapping bot noise
- Prefer tools that help with React UI quality and test health, not only generic TypeScript checks

### Preconditions

Only start this phase after the repo already has:

- product docs
- governance docs
- CI
- GitHub-native security
- Jules automation

### Install First

1. `SonarQube Cloud`
   - strong PR quality and security feedback
   - free or open-source-friendly entry point

2. `Semgrep`
   - useful for browser-extension security and custom code rules
   - free community option

3. `Codecov`
   - only after coverage reporting exists
   - free for public repos

### Install Later If Needed

4. `Mergify`
   - only once merge coordination becomes painful
   - useful for merge queue and PR automation

5. `Renovate`
   - [x] Installed and configured to coexist with Dependabot
   - useful for grouping and scheduling dependency updates and high-confidence auto-merges

6. `Snyk`
   - optional deeper application security layer beyond GitHub-native tooling
   - useful if native security plus Semgrep is not enough

### Rules

- [ ] Do not add Codecov before real coverage exists
- [ ] Do not add Mergify before PR throughput justifies it
- [ ] Do not add optional third-party bots before the repo can already sustain its native workflow cleanly

### Done When

- [ ] the repo has only the few bots it can actually use well
- [ ] marketplace tools are complementary instead of overlapping
- [ ] the team can explain why each installed app exists

## Marketplace Recommendation Summary

### Recommended Base Stack Before Marketplace Apps

- GitHub native:
  - Actions
  - Dependabot
  - CodeQL
  - rulesets
- Jules

### Recommended First Marketplace Additions

- SonarQube Cloud
- Semgrep

### Conditional Additions

- Codecov after coverage exists
- Mergify after PR volume grows
- Snyk only if GitHub-native security plus Semgrep is not enough

## Deferred Items

These are intentionally deferred for later:

- `CLAUDE.md`
- release automation with Changesets
- merge queue
- advanced coverage gating
- browser cloud visual testing
- backend, auth, or sync work unless later approved by product docs

## Assumptions And Defaults

- `requiredStepsForSetup.md` is a living execution checklist
- It lives at the repo root
- `CLAUDE.md` is out of scope for this first pass
- `AGENTS.md` is now the canonical agent operating contract
- The React architecture represented by this repo is the intended canonical baseline going forward
- React + MUI + Emotion are intentional stack choices, not temporary migration scaffolding
- `esbuild` remains the bundler for the current product stage unless a later explicit decision changes it
- Personal + private is the current operating model; org/public remains a future upgrade path, not a current blocker
- Jules is part of the core operating model, not an optional later add-on
