# Architecture

## System Shape

The extension now follows an explicit `ui + data + domain + extension + entrypoints + shared` layout built around a React 19 +
MUI + Emotion UI stack.

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
- `src/shared/`
  Export proxies and reusable contracts for logic residing in the domain

The goal is that a new engineer can find the right change area by directory alone.

Shared UI bootstrapping and theming live in:

- `src/ui/providers.tsx`
  App-level providers shared across popup, dashboard, and overlay
- `src/ui/theme.ts`
  MUI theme tokens and component overrides for the current UI baseline

## Runtime Surfaces

### Popup

Entrypoint: `src/entrypoints/popup.tsx`  
Screen: `src/ui/screens/popup/*`

Responsibilities:

- render the compact recommendation-first surface
- mount the shared provider stack and theme
- show due count, streak, recommended problem, and course-next state
- toggle study mode
- open problems or the dashboard

### Dashboard

Entrypoint: `src/entrypoints/dashboard.tsx`  
Screen: `src/ui/screens/dashboard/*`

Responsibilities:

- render overview, courses, library, analytics, and settings screens
- mount the shared provider stack and theme
- own dashboard-local state such as filters, settings draft, and import file
- preserve the `?view=` deep-link contract

### Overlay

Entrypoint: `src/entrypoints/overlay.tsx`  
Screen: `src/ui/screens/overlay/*`

Responsibilities:

- mount a shadow-root-backed React overlay on LeetCode problem pages
- inject an Emotion cache into the overlay shadow root before rendering
- detect page context and current problem metadata
- manage timer, structured log fields, FSRS assessment, and review-session actions
- keep the compact inlay and expanded overlay panel separated inside `src/ui/screens/overlay/*`
- compose page bootstrap in `useOverlayController.ts`, extracted helpers/hooks in `controller/*`, and explicit collapsed/expanded sections in `components/*`
- save new review results and last-review overrides through runtime messaging

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
- UI reads and writes through repositories in `src/data/repositories/*`
- presentational components remain side-effect free
- provider and theme changes should stay centralized in `src/ui/providers.tsx` and `src/ui/theme.ts`

### Data Layer

Location: `src/data/`

Subdirectories:

- `repositories/`
  Repository-style access for app shell, courses, problem sessions, settings, backups, app data, and extension
  navigation
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

## UI To Background Data Flow

The intended runtime path for React surfaces is:

1. A screen, controller, or shared UI hook calls a repository in `src/data/repositories/*`.
2. The repository talks to either:

- a runtime client in `src/extension/runtime/client.ts`, or
- a datasource under `src/data/datasources/chrome/*`.

3. The background bootstrap validates and routes runtime messages through `src/extension/background/router.ts`.
4. Background handlers compose repositories and pure domain logic.
5. The repository returns a typed payload back to the UI layer.

This keeps React screens free of direct Chrome API calls and keeps domain logic free of UI concerns.

## Where To Change Things

- Popup UI: `src/ui/screens/popup/*`
- Dashboard UI: `src/ui/screens/dashboard/*`
- Overlay UI: `src/ui/screens/overlay/*`
- Shared providers and theme: `src/ui/providers.tsx`, `src/ui/theme.ts`
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
- Overlay controller orchestration: `src/ui/screens/overlay/useOverlayController.ts`
- Overlay controller helpers/hooks: `src/ui/screens/overlay/controller/*`
- Overlay surface variants and sections: `src/ui/screens/overlay/OverlayPanel.tsx`,
  `src/ui/screens/overlay/components/*`, `src/ui/screens/overlay/overlayPanel.types.ts`

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
  This now includes top-level saved log fields such as interview pattern, time complexity, space complexity, languages,
  and notes.
  Each attempt history entry may also include a structured `logSnapshot` used for review overrides and migration-safe
  history replay.
- `coursesById`
- `courseOrder`
- `courseProgressById`
- `settings`
  Includes current settings such as `dailyQuestionGoal`, `targetRetention`, `reviewOrder`, `studyMode`,
  `difficultyGoalMs`, notification preferences, question filters, and legacy-readable fields used by existing course
  and source-set flows.

Export payload remains:

- `version`
- `problems`
- `studyStatesBySlug`
- `settings`
- `coursesById`
- `courseOrder`
- `courseProgressById`

Review and history runtime contracts now include:

- `SAVE_REVIEW_RESULT`
- `SAVE_OVERLAY_LOG_DRAFT`
  appends a new FSRS review event and stores the current structured log fields
- `OVERRIDE_LAST_REVIEW_RESULT`
  replaces the latest attempt entry and rebuilds the FSRS card from review history
- `RESET_STUDY_HISTORY`
  clears review history, FSRS cards, solve-time/rating state, suspended flags, and course progress derived from study
  history while preserving settings, courses, source data, and the problem library

## Constraints

- Manifest V3 Chrome extension
- local-first storage only
- no backend service
- no account model
- React 19 + MUI + Emotion UI stack
- `esbuild` remains the bundler for TSX entrypoints
- runtime message names and persisted JSON contracts are stable unless explicitly updated in this document

## Related ADRs

- `docs/decisions/0001-local-first-storage.md`
- `docs/decisions/0002-no-account-system.md`
- `docs/decisions/0003-react-mui-emotion-ui.md`
- `docs/decisions/0004-no-backend-service.md`
- `docs/decisions/0005-minimal-extension-permissions.md`
