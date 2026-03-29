# Required Steps for Setup

## Purpose

This file is the ordered setup checklist for making this repo collaboration-ready.

- Complete steps in order unless a step is explicitly marked as parallelizable.
- This is an operational setup document, not the product spec.
- `CLAUDE.md` is intentionally out of scope for this first pass.
- `AGENTS.md` comes later, after product docs exist.
- Branch protection and required checks should be phased in only after repo-native CI is in place.

## Current Baseline Snapshot

### Repo Facts

- Project type: TypeScript Chrome extension using Manifest V3
- Package manager: `npm`
- Lockfile: `package-lock.json`
- Current scripts:
  - `build`
  - `check`
  - `format`
  - `format:check`
  - `lint`
  - `test`
  - `typecheck`
  - `test:logic`
- Current docs:
  - `README.md`
  - `CONTRIBUTING.md`
  - `docs/stitch-design-doc.md`

### Still Missing

- `.github` workflows
- `SECURITY.md`
- `CODEOWNERS`
- issue templates
- pull request template
- `AGENTS.md`

### Current Health

- `npm run build` passes
- `npm run check` passes
- `npm run lint` passes with warning-only `no-unsanitized` findings on current `innerHTML` paths
- `npm run test` passes
- `npm run test:logic` passes
- `npm run typecheck` passes
- Local baseline now includes `Node 24 LTS`, `ESLint + Prettier`, `.editorconfig`, and ignored temp output under `.tmp/`
- Dynamic `innerHTML` usage exists in UI code and should be tracked as a security hardening item

## Ordered Setup Phases

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

### Goals

- Make the product understandable without reading code
- Separate approved scope from future ideas
- Prevent humans and agents from drifting into unapproved work

### Steps

- [ ] Expand `README.md`
- [ ] Add `docs/product.md`
- [ ] Add `docs/features.md`
- [ ] Add `docs/architecture.md`
- [ ] Add `docs/decisions/`
- [ ] Add initial ADRs for:
  - no account system for now
  - local-first storage for now
  - plain CSS for now
  - no backend for now
  - minimal extension permissions
- [ ] Keep `docs/stitch-design-doc.md` as a design artifact, not the main product source of truth

### Done When

- [ ] a new contributor can explain the product and current scope without reading code
- [ ] approved scope is clearly separated from future candidates
- [ ] implementation work can be reviewed against documented product behavior

## Phase 2: Collaboration And Governance Docs

### Goals

- Make contribution flow explicit
- Make ownership explicit
- Make review and reporting paths consistent

### Steps

- [ ] Upgrade `CONTRIBUTING.md`
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

### Steps

- [ ] Transfer the repo to a GitHub org
- [ ] Make it public if that remains the chosen setup
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

### Done When

- [ ] the repo is org-owned
- [ ] `main` is protected through a PR-only workflow
- [ ] merge policy is clear and lightweight

## Phase 5: CI And GitHub-Native Security

### Goals

- Make every PR validate automatically
- Use GitHub-native tooling first
- Phase checks in realistically instead of pretending the repo is already green

### Steps

- [ ] Add `ci.yml` for:
  - `npm ci`
  - `npm run build`
  - `npm run test`
  - `npm run typecheck`
- [ ] Add `dependabot.yml`
- [ ] Enable:
  - dependency graph
  - Dependabot alerts
  - Dependabot security updates
  - CodeQL default setup after the repo is public
- [ ] Phase required checks:
  - require `build` first
  - require `test` first
  - require `typecheck` only after it is green

### Done When

- [ ] every PR gets automatic validation
- [ ] `main` has enforceable status checks
- [ ] GitHub-native security tooling is active before optional third-party apps are added

## Phase 6: Jules Automation

### Goals

- Make Jules part of the core operating model before optional marketplace tooling
- Use Jules for recurring grunt work without giving it product authority
- Let Jules keep its own PRs moving when CI breaks

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

### Done When

- [ ] Jules can create and maintain low-risk PRs without redefining product scope
- [ ] recurring grunt work is automated and reviewable
- [ ] Jules-created PRs have a clear labeling and review path

## Phase 7: Marketplace Apps And External Tooling

### Goals

- Add optional external tools only after the repo already has strong internal basics
- Keep the tool stack small and complementary
- Avoid overlapping bot noise

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
- Public-org repo remains the target because it gives the strongest mostly-free setup
- Jules is part of the core operating model, not an optional later add-on
