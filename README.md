# LeetCode Spaced Repetition Chrome Extension

LeetCode Spaced Repetition is a Chrome extension for deliberate interview practice. It combines spaced repetition with curated learning paths so you can decide what to review now, what to study next, and how your practice is trending over time without leaving the browser.

## Current Status

- Chrome extension MVP
- Local-first data model using `chrome.storage.local`
- No account system
- No backend service
- Popup-first workflow with dashboard and in-page overlay support

## What The Product Does

The product combines two ideas:

1. Spaced repetition for deciding what to review now.
2. Course progression for deciding what to study next.

The popup is the primary surface. The LeetCode page overlay and dashboard are current supporting surfaces, not future placeholders. Product details and behavior boundaries live in the docs below.

## Quickstart

Prerequisite:

- Node `24.x` LTS
- `npm`

Install dependencies:

```bash
npm install
```

Run the local verification pass:

```bash
npm run check
```

Build the extension:

```bash
npm run build
```

Load the extension in Chrome:

1. Open `chrome://extensions`
2. Turn on **Developer mode**
3. Click **Load unpacked**
4. Select the `dist` folder

## Core Commands

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm run check`

## Repo Map

- [docs/product.md](docs/product.md)
  Product brief and source of truth for product intent
- [docs/features.md](docs/features.md)
  Feature behavior, scope boundaries, and acceptance criteria
- [docs/architecture.md](docs/architecture.md)
  Runtime architecture and module responsibilities
- [docs/DESIGN_GUIDELINES.md](docs/DESIGN_GUIDELINES.md)
  Design and UI guidance
- [docs/decisions/0001-local-first-storage.md](docs/decisions/0001-local-first-storage.md)
  ADR for local-first storage
- [docs/decisions/0002-no-account-system.md](docs/decisions/0002-no-account-system.md)
  ADR for no account system
- [docs/decisions/0003-plain-css-ui.md](docs/decisions/0003-plain-css-ui.md)
  ADR for plain CSS UI
- [docs/decisions/0004-no-backend-service.md](docs/decisions/0004-no-backend-service.md)
  ADR for no backend service
- [docs/decisions/0005-minimal-extension-permissions.md](docs/decisions/0005-minimal-extension-permissions.md)
  ADR for minimal extension permissions
- [docs/stitch-design-doc.md](docs/stitch-design-doc.md)
  Supporting design-generation artifact for Stitch prompts
- [requiredStepsForSetup.md](requiredStepsForSetup.md)
  Ordered setup and hardening checklist

## Where To Change Things

- Popup UI: `src/ui/screens/popup/*`
- Dashboard UI: `src/ui/screens/dashboard/*`
- Overlay UI: `src/ui/screens/overlay/*`
- Reusable UI widgets: `src/ui/features/*`
- Dashboard route model: `src/ui/navigation/dashboardRoutes.ts`
- UI-only selectors and labels: `src/ui/presentation/*`
- Shared UI state hooks: `src/ui/state/*`
- Storage and repositories: `src/data/repositories/*`
- Raw Chrome storage access: `src/data/datasources/chrome/*`
- Built-in study plans: `src/data/catalog/curatedSets.ts`
- Backup import/export: `src/data/importexport/*`
- Problem slug and difficulty rules: `src/domain/problem/*`
- FSRS logic: `src/domain/fsrs/*`
- Course progression: `src/domain/courses/*`
- Queue and recommendations: `src/domain/queue/*`
- Runtime contracts and validation: `src/extension/runtime/*`
- Background router and handlers: `src/extension/background/*`

## Read In This Order

1. `README.md`
2. `docs/product.md`
3. `docs/features.md`
4. `docs/architecture.md`
5. `docs/DESIGN_GUIDELINES.md`
6. relevant ADRs under `docs/decisions/`

## Doc Precedence And Update Triggers

Precedence order:

1. `docs/product.md`
2. `docs/features.md`
3. `docs/architecture.md`
4. `docs/DESIGN_GUIDELINES.md`
5. `docs/stitch-design-doc.md`
6. `requiredStepsForSetup.md`

Rules:

- If two docs disagree, follow the higher-precedence doc and ask a human before implementing the conflicting part.
- Future ideas are not implementation approval.
- `In Scope` in `docs/features.md` means directionally allowed work if explicitly requested and reviewed, not self-starting backlog permission.
- The PR author owns updating any affected docs, and reviewers should block merges when behavior or architecture changes are undocumented.
- Any PR that changes product behavior should update `docs/product.md` or `docs/features.md`.
- Any PR that changes runtime boundaries, persisted data shape, or message contracts should update `docs/architecture.md`.
- Any PR that changes visual conventions should update `docs/DESIGN_GUIDELINES.md`.
- Any PR that changes setup or process expectations should update `requiredStepsForSetup.md`.

## Data Export Format

Export JSON includes:

- `version`
- `problems[]`
- `studyStatesBySlug{}`
- `settings{}`
- `coursesById{}`
- `courseOrder[]`
- `courseProgressById{}`
