# Architecture

## System Shape

The extension now follows an explicit `ui + data + domain + extension + entrypoints` layout.

- `src/entrypoints/`
  Small mount/bootstrap files only
- `src/ui/`
  React screens, reusable UI components, navigation models, local UI state, and presentation helpers
- `src/data/`
  Repositories, Chrome datasources, import/export, and catalog access
- `src/domain/`
  Pure business logic and business types
- `src/extension/`
  Chrome runtime contracts, validation, background routing, and notifications

The goal is that a new engineer can find the right change area by directory alone.

## Runtime Surfaces

### Popup

Entrypoint: `src/entrypoints/popup.tsx`  
Screen: `src/ui/screens/popup/*`

Responsibilities:

- render the compact recommendation-first surface
- show due count, streak, recommended problem, and course-next state
- toggle study mode
- open problems or the dashboard

### Dashboard

Entrypoint: `src/entrypoints/dashboard.tsx`  
Screen: `src/ui/screens/dashboard/*`

Responsibilities:

- render overview, courses, library, analytics, and settings screens
- own dashboard-local state such as filters, settings draft, and import file
- preserve the `?view=` deep-link contract

### Overlay

Entrypoint: `src/entrypoints/overlay.tsx`  
Screen: `src/ui/screens/overlay/*`

Responsibilities:

- mount a shadow-root-backed React overlay on LeetCode problem pages
- detect page context and current problem metadata
- manage timer, notes, rating, and review actions
- save review results through runtime messaging

### Library Redirect

Entrypoint: `src/entrypoints/libraryRedirect.ts`

Responsibilities:

- preserve the legacy `database.html` alias by redirecting to `dashboard.html?view=library`

### Background Worker

Bootstrap: `src/extension/background/index.ts`

Responsibilities:

- validate runtime messages
- dispatch messages through `src/extension/background/router.ts`
- own alarms and due notifications

## Layer Ownership

### UI Layer

Location: `src/ui/`

Subdirectories:

- `screens/`
  Screen-specific React components and screen-local controllers
- `components/`
  Base visual primitives only
- `features/`
  Reusable feature widgets shared across screens
- `navigation/`
  Pure route/view models such as dashboard routes
- `presentation/`
  UI-only selectors, formatting, and form normalization
- `state/`
  Reusable UI hooks such as app-shell query state

Rules:

- UI does not call `sendMessage` directly
- UI does not access `chrome.storage` directly
- presentational components remain side-effect free

### Data Layer

Location: `src/data/`

Subdirectories:

- `repositories/`
  Repository-style access for app shell, courses, problem sessions, settings, backups, app data, and extension navigation
- `datasources/chrome/`
  Raw Chrome platform access such as `chrome.storage.local`
- `catalog/`
  Built-in study plans and curated sets
- `importexport/`
  Backup sanitization and import/export helpers

Rules:

- repositories own transport and persistence access
- datasources are platform-specific and thin
- UI talks to repositories, not to Chrome APIs

### Domain Layer

Location: `src/domain/`

Subdirectories:

- `problem/`
  Slug identity and difficulty parsing
- `fsrs/`
  Scheduler state, review policy, and FSRS mutations
- `courses/`
  Course progression and course-derived projections
- `queue/`
  Queue generation and recommendation building
- `analytics/`
  Analytics summarization
- `common/`
  Domain-safe shared helpers such as time and collections

Rules:

- domain code is pure
- domain code does not import React
- domain code does not import `chrome`, `window`, or `document`

### Extension Layer

Location: `src/extension/`

Subdirectories:

- `runtime/`
  Runtime client, contracts, and message validation
- `background/`
  Background bootstrap, router, handlers, notifications, and response helpers

Rules:

- runtime message names and payload contracts are defined here
- background handlers coordinate repositories and domain logic

## Where To Change Things

- Popup UI: `src/ui/screens/popup/*`
- Dashboard UI: `src/ui/screens/dashboard/*`
- Overlay UI: `src/ui/screens/overlay/*`
- Shared cards/widgets: `src/ui/features/*`
- Dashboard route contract: `src/ui/navigation/dashboardRoutes.ts`
- Library filters/selectors: `src/ui/presentation/library.ts`
- Study-state labels and tones: `src/ui/presentation/studyState.ts`
- Course ingest normalization: `src/ui/presentation/courseIngest.ts`
- App-shell query state: `src/ui/state/useAppShellQuery.ts`
- Runtime-backed popup/dashboard reads: `src/data/repositories/appShellRepository.ts`
- Storage and persisted app data: `src/data/repositories/appDataRepository.ts`
- Raw Chrome storage access: `src/data/datasources/chrome/storage.ts`
- Backup import/export: `src/data/importexport/backup.ts`
- Built-in study plans: `src/data/catalog/curatedSets.ts`
- Problem slug rules: `src/domain/problem/slug.ts`
- Difficulty parsing and solve-time goals: `src/domain/problem/difficulty.ts`
- FSRS logic: `src/domain/fsrs/*`
- Course progression: `src/domain/courses/courseProgress.ts`
- Queue logic: `src/domain/queue/*`
- Runtime contracts: `src/extension/runtime/contracts.ts`
- Background router and handlers: `src/extension/background/*`

## Runtime Message Flow

1. A UI repository calls `sendMessage` through `src/extension/runtime/client.ts`.
2. The background bootstrap validates the message with `src/extension/runtime/validator.ts`.
3. `src/extension/background/router.ts` dispatches to a grouped handler.
4. The handler composes domain logic and data repositories.
5. The result is returned in the canonical runtime response envelope.

## Persisted Data

`AppData` remains the canonical local-first persisted model.

Important persisted areas:

- `problemsBySlug`
- `studyStatesBySlug`
- `coursesById`
- `courseOrder`
- `courseProgressById`
- `settings`

Export payload remains:

- `version`
- `problems`
- `studyStatesBySlug`
- `settings`
- `coursesById`
- `courseOrder`
- `courseProgressById`

## Constraints

- Manifest V3 Chrome extension
- local-first storage only
- no backend service
- no account model
- React + MUI UI stack
- runtime message names and persisted JSON contracts are stable unless explicitly updated in this document
