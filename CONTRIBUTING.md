# Contributing to CogniPace

This repo is a TypeScript Chrome extension with a React 19 + MUI + Emotion UI stack. Contribute against the current
layered architecture, not the legacy pre-React structure.

## Baseline Setup

- Use Node `24.x` LTS
- Use `npm`
- Install dependencies with `npm install`
- Run the full local verification path with `npm run check`

## Branching

- Branch from the latest `main`
- Use focused branch names:
  - `feat/*`
  - `fix/*`
  - `docs/*`
  - `chore/*`
  - `refactor/*`
  - `test/*`
  - `security/*`
- Keep one logical change per PR whenever possible

## Layer Ownership

- `src/ui/*`
  React screens, components, theme, presentation helpers, and local UI state
- `src/data/*`
  Repositories, Chrome datasources, catalog access, and import/export helpers
- `src/domain/*`
  Pure business logic and domain types; keep this layer React-free
- `src/extension/*`
  Runtime contracts, validation, background routing, responses, and notifications
- `src/entrypoints/*`
  Thin bootstraps only; do not move product logic here

## Implementation Rules

- Do not access `chrome.storage` directly from `src/ui/*`
- Do not call runtime transport directly from leaf UI components; go through repositories
- Do not move React or browser dependencies into `src/domain/*`
- Treat `src/ui/providers.tsx` and `src/ui/theme.ts` as the shared provider/theme contract
- Keep popup, dashboard, and overlay behavior aligned with the product and architecture docs

## Required Checks Before Opening A PR

Run:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

You can also run:

```bash
npm run check
```

## Merge And Review Policy

The repo is currently operating as a personal + private repository, so some GitHub-native protections are still
unavailable on the current tier.

- All non-emergency changes should go through pull requests
- Do not push directly to `main` except for an explicit emergency fix
- One human review is required by team policy before merge
- Squash merge is the only accepted merge style
- Merge decisions should be based on:
  - `npm run check`
  - or the equivalent `lint`, `typecheck`, `test`, and `build` results when called out separately

## PR Expectations

- Keep the PR focused and explain the user-facing or architectural reason for the change
- Add screenshots for visible popup, dashboard, or overlay changes
- Update UI tests when popup, dashboard, or overlay behavior changes
- Update docs when:
  - product behavior changes
  - architecture boundaries change
  - runtime contracts change
  - provider/theme conventions change
  - setup expectations change
- Call out any risky areas such as:
  - `public/manifest.json`
  - `src/extension/*`
  - `src/data/datasources/chrome/*`
  - import/export flows

## Review Expectations

- Ask for review in the team channel or group chat once the PR is ready
- Expect comments on architecture boundaries, docs drift, and test coverage, not just visible behavior
- Do not merge if the change leaves the docs out of sync with the code
