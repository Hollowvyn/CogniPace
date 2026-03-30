# Required Steps for Setup

## Purpose

This file is the ordered setup checklist for making this repo collaboration-ready.

- Complete steps in order unless a step is explicitly marked as parallelizable.
- This is an operational setup document, not the product spec.
- `CLAUDE.md` is intentionally out of scope for this first pass.
- `AGENTS.md` comes later, after product docs exist.
- Branch protection and required checks should be phased in only after repo-native CI is in place.
- Unchecked later phases are planning artifacts, not self-starting authorization for humans or agents.
- Until `AGENTS.md` exists, changes should only be made when explicitly requested.

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
- Architecture layout: `ui + data + domain + extension + entrypoints`
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
  - `README.md`
  - `CONTRIBUTING.md`
  - `docs/product.md`
  - `docs/features.md`
  - `docs/architecture.md`
  - `docs/architecture-roadmap.md`
  - `docs/DESIGN_GUIDELINES.md`
  - `docs/decisions/`
  - `docs/stitch-design-doc.md`

### Still Missing

- `.github` workflows
- `SECURITY.md`
- `CODEOWNERS`
- issue templates
- pull request template
- `AGENTS.md`

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

## Ordered Setup Phases

Important:

- Completion of one phase does not authorize automatic start of the next phase.
- Later phases should only be implemented when a human explicitly requests them.

## Current Phase

- Phase 1.5 is the React baseline reset that makes the checklist trustworthy again.
- Status: completed on 2026-03-30
- Next true setup phase: Phase 2

## Recommended Execution Order From The React Baseline

1. Phase 1.5
2. Phase 2
3. Phase 3
4. Phase 5
5. Phase 4
6. Phase 6
7. Phase 7

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
- [x] Document the current `ui + data + domain + extension + entrypoints` layout
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

### Goals

- Make contribution flow explicit
- Make ownership explicit
- Make review and reporting paths consistent
- Add React-specific contributor rules now that the UI architecture is layered

### Steps

- [ ] Upgrade `CONTRIBUTING.md`
- [ ] Document layer ownership for:
  - `src/ui/*` for React screens, components, theme, and presentation
  - `src/data/*` for repositories, datasources, and import/export helpers
  - `src/domain/*` for pure business logic
  - `src/extension/*` for runtime contracts, validation, and background routing
- [ ] Require screenshots for visible popup, dashboard, or overlay changes
- [ ] Require UI test updates when popup, dashboard, or overlay behavior changes
- [ ] Require docs updates when architectural boundaries or runtime contracts change
- [ ] Add `SECURITY.md`
- [ ] Add `LICENSE` if the repo becomes public
- [ ] Add `CODEOWNERS`
- [ ] Add `.github/PULL_REQUEST_TEMPLATE.md`
- [ ] Add issue forms for:
  - bug
  - feature request
  - maintenance task

### Done When

- [ ] contributors have a consistent issue and PR flow
- [ ] ownership and review expectations are explicit
- [ ] security reporting path is documented

## Phase 3: Agent And Automation Rules

### Goals

- Constrain agents to documented scope
- Separate product authority from execution authority
- Make automation useful without allowing scope drift
- Make agent rules explicit for the React architecture

### Steps

- [ ] Add root `AGENTS.md`
- [ ] Require this reading order in `AGENTS.md`:
  - `README.md`
  - `docs/product.md`
  - `docs/features.md`
  - `docs/architecture.md`
- [ ] Define roles:
  - humans own roadmap, scope, releases, architecture, and permissions
  - Jules owns recurring maintenance, suggested tasks, CI repair on Jules PRs, dependency hygiene, performance, and UX polish
  - Codex and other interactive coding agents handle human-directed implementation
- [ ] State that React is the canonical UI model
- [ ] State that agents must not reintroduce direct DOM-rendered UI patterns into popup or dashboard surfaces
- [ ] State that domain code must remain React-free
- [ ] State that UI code should talk through repositories and runtime clients, not direct Chrome storage access
- [ ] Require docs updates when agents change routes, providers, repositories, or runtime contracts
- [ ] Require ADR or doc updates when agents change MUI theme, provider, or styling conventions
- [ ] Explicitly block agents from:
  - new product scope without human direction
  - manifest permission changes
  - backend or auth additions
  - major architecture shifts without approval
  - major dependency shifts without approval

### Done When

- [ ] Jules cannot plausibly interpret future ideas as implementation approval
- [ ] all agents are constrained by documented product scope
- [ ] product work and maintenance work are clearly distinct

## Phase 4: GitHub Org And Repo Settings

### Goals

- Move long-term ownership out of a personal-only workflow
- Make the main branch safe for a multi-person team
- Keep merge flow simple and enforceable
- Stage branch protections against the React test and build surface

### Steps

- [ ] Transfer the repo to a GitHub org
- [ ] Make it public if that remains the chosen setup
- [ ] Only enforce required status checks after the shared React baseline branch is green in CI
- [ ] Configure:
  - default branch `main`
  - squash merge only
  - auto-delete merged branches
  - ruleset on `main`
  - 1 required approval
  - stale review dismissal
  - conversation resolution before merge
  - no direct pushes to `main`
  - no force pushes
  - no branch deletion on `main`
- [ ] Required checks should eventually include:
  - `lint`
  - `typecheck`
  - `test`
  - `build`

### Done When

- [ ] the repo is org-owned
- [ ] `main` is protected through a PR-only workflow
- [ ] merge policy is clear and lightweight

## Phase 5: CI And GitHub-Native Security

### Goals

- Make every PR validate automatically
- Use GitHub-native tooling first
- Phase checks in realistically instead of pretending the repo is already green
- Validate the React stack directly, not just the old TypeScript baseline

### Steps

- [ ] Add `ci.yml` for:
  - `npm ci`
  - `npm run lint`
  - `npm run build`
  - `npm run test`
  - `npm run typecheck`
- [ ] Keep `npm run test` as the combined logic + React UI gate
- [ ] Optionally split workflow jobs into:
  - logic tests
  - UI tests
  - build and typecheck
- [ ] Optionally add an architecture-boundary test job
- [ ] Add `dependabot.yml`
- [ ] Enable:
  - dependency graph
  - Dependabot alerts
  - Dependabot security updates
  - CodeQL default setup after the repo is public
- [ ] Phase required checks:
  - require `lint`
  - require `build` first
  - require `test` first
  - require `typecheck` only after it is green

### Done When

- [ ] every PR gets automatic validation
- [ ] `main` has enforceable status checks
- [ ] the React validation surface is represented in CI before optional third-party apps are added

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
   - only if replacing Dependabot version updates
   - useful for grouping and scheduling dependency updates

6. `Snyk`
   - optional deeper application security layer beyond GitHub-native tooling
   - useful if native security plus Semgrep is not enough

### Rules

- [ ] Do not run Renovate and Dependabot version updates together
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
- Renovate only if replacing Dependabot
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
- `AGENTS.md` is added only after product docs exist
- The React architecture represented by this repo is the intended canonical baseline going forward
- React + MUI + Emotion are intentional stack choices, not temporary migration scaffolding
- `esbuild` remains the bundler for the current product stage unless a later explicit decision changes it
- Public-org repo remains the target because it gives the strongest mostly-free setup
- Jules is part of the core operating model, not an optional later add-on
