# Architecture

## System Shape

```
src/
├── app/                   # React surfaces and DI wiring
│   ├── di/               # DIContext (settingsRepository, backupRepository)
│   ├── popup/            # Popup shell + sections
│   ├── dashboard/        # Dashboard shell, rail, navigation, sections
│   └── overlay/          # Overlay shell and host creation
├── design-system/        # MUI-based atomic components and per-surface themes
│   ├── atoms/            # card, chip, feedback, labels, layout, nav, table, tooltip
│   └── theme/            # Per-surface MUI themes + design tokens
├── entrypoints/          # Thin React bootstraps (popup, dashboard, overlay, dbDebug)
├── extension/
│   └── background/
│       ├── index.ts      # SW lifecycle: onInstalled, onStartup, onSuspend, alarms, onMessage
│       ├── dispatcher.ts # parse → authorize → lookup swApi → wrap envelope
│       ├── swApi.ts      # Handler registry (~45 methods, grouped by feature)
│       └── notifications.ts
├── features/             # Feature slices — each owns data/domain/ui/messaging
│   ├── app-shell/        # AppData read model: assembles projection from SQLite on each call
│   ├── analytics/
│   ├── backup/
│   ├── overlay-session/
│   ├── problems/
│   ├── queue/
│   ├── settings/
│   ├── study/
│   └── tracks/
├── libs/
│   ├── event-bus/        # Per-table mutation tick broadcaster + useTickQuery React hook
│   ├── fsrs/             # Pure FSRS spaced-repetition algorithm
│   ├── leetcode/         # Page detection and problem scraping
│   └── runtime-rpc/      # createSwClient<SwApi>() typed RPC proxy
├── platform/
│   ├── chrome/           # chrome.storage and chrome.tabs wrappers
│   ├── db/               # SQLite-WASM + Drizzle: schema, migrations, instance, proxy, snapshot
│   └── time/
└── shared/               # Branded types (ProblemSlug, TopicId, …), string utils
```

## Runtime Surfaces

### Popup

Entrypoint: `src/entrypoints/popup.tsx`
Shell: `src/app/popup/`

Compact surface: due count, streak, recommended problem, active track, study-mode toggle.
Uses the narrow `getPopupShellData` read model.

### Dashboard

Entrypoint: `src/entrypoints/dashboard.tsx`
Shell: `src/app/dashboard/`

Overview, tracks, library, analytics, and settings screens via `?view=` deep-link.
Routes: `src/app/dashboard/navigation/routes.ts`.

### Overlay

Entrypoint: `src/entrypoints/overlay.tsx`
Shell: `src/app/overlay/`

Shadow-root-backed React overlay on LeetCode problem pages. Manages timer, structured log
fields, FSRS assessment, and review-session actions. Emotion cache injected into shadow root.

### Background Service Worker

Bootstrap: `src/extension/background/index.ts`

Owns the SQLite DB lifecycle (boots and restores on `onInstalled`/`onStartup`), alarm
scheduling, due-check notifications, and runtime message dispatch.

## Layer Ownership

### Feature Slices (`src/features/`)

Each slice is self-contained: `data/datasource/`, `data/repository/`, `domain/model/`,
`domain/policy/`, `ui/`, `messaging/handlers.ts`, exported through `server.ts`.

Rules:
- Feature UI calls `api.*` (typed RPC proxy) — no `chrome.*` from UI code.
- Datasources take a `Db` argument; they do not call `getDb()` themselves.
- Domain code is pure: no React, no `chrome`, no `window`.

### Design System (`src/design-system/`)

MUI-based atomic components and per-surface MUI theme factories. Shared across surfaces
via `AppProviders`.

### Platform (`src/platform/`)

Chrome API wrappers and the SQLite-WASM + Drizzle stack. Nothing in `platform/` imports
from `features/` or `app/`.

### Libs (`src/libs/`)

Pure or near-pure utilities: FSRS scheduler, typed RPC proxy factory, LeetCode page
detection, event-bus. No feature-domain imports.

## Data Flow

```
UI (React hook)
  └─ api.someMethod(payload)           ← createSwClient<SwApi>() proxy
       └─ chrome.runtime.sendMessage({ method, payload })
            └─ dispatcher.ts: parse → authorize → swApi[method](payload)
                 └─ handler (features/*/messaging/handlers.ts)
                      └─ const { db } = await getDb()
                           └─ datasource function (Drizzle query against SQLite)
```

Handler TypeScript signatures are the wire contract. The UI imports `type SwApi` from
`swApi.ts` and gets compile-time autocomplete on every method call.

## Persistence

**SQLite-WASM is the SSoT.** `chrome.storage.local` holds two things only:

1. **Snapshot** (`cognipace_db_snapshot_v1`) — written after every mutation via a 1-second
   debounce in `platform/db/instance.ts`; flushed immediately on `chrome.runtime.onSuspend`.
2. **Mutation tick** (`DB_TICK_KEY`) — a lightweight broadcast written after every Drizzle
   `run`; open extension pages observe it and re-fetch through their query hooks.

**AppData** (`features/app-shell/domain/model/AppData.ts`) is a read-only projection
assembled from SQLite on each `getAppShellData` call. It is never persisted directly.
Mutations write to datasources; the tick system drives UI refresh.

**Schema** — 9 tables in `src/platform/db/schema/`: `problems`, `studyStates`,
`attemptHistory`, `topics`, `companies`, `tracks`, `trackGroups`, `trackGroupProblems`,
`settingsKv`. Generated migrations in `platform/db/migrations/` — never hand-edit them.

**Export payload** (`features/backup/domain/model/ExportPayload.ts`):
`problems`, `studyStatesBySlug`, `settings`, `topicsById`, `companiesById`, `tracks`.

## Where To Change Things

- Popup UI: `src/app/popup/`
- Dashboard UI: `src/app/dashboard/` (routes: `navigation/routes.ts`)
- Overlay UI: `src/app/overlay/` + `src/features/overlay-session/`
- Shared providers and theme: `src/app/providers.tsx`, `src/design-system/theme/`
- DI bindings: `src/app/di/index.tsx`
- New feature: slice under `src/features/<name>/` following `data/domain/ui/messaging`
  layout; register handlers in `src/extension/background/swApi.ts`
- New SW handler: add to `features/*/messaging/handlers.ts`, export from `server.ts`,
  register in `swApi.ts`
- New datasource query: add to `features/*/data/datasource/`; pass `Db` from the handler
- Schema change: edit `src/platform/db/schema/`, run `drizzle-kit generate`, commit the
  new migration
- FSRS algorithm: `src/libs/fsrs/`
- LeetCode page detection: `src/libs/leetcode/`
- Runtime RPC proxy: `src/libs/runtime-rpc/`
- SW lifecycle and alarms: `src/extension/background/index.ts`
- Due notifications: `src/extension/background/notifications.ts`
- Snapshot persistence: `src/platform/db/instance.ts`, `src/platform/db/snapshot.ts`

## Constraints

- Manifest V3 Chrome extension
- Local-first, no backend, no account model
- React 19 + MUI + Emotion UI stack
- `esbuild` bundler for TSX entrypoints
- Handler signatures in `swApi.ts` and the schema in `platform/db/schema/` are the stable
  wire and persistence contracts

## Related ADRs

- `docs/decisions/0002-no-account-system.md`
- `docs/decisions/0004-no-backend-service.md`
- `docs/decisions/0005-minimal-extension-permissions.md`
- `docs/decisions/0006-desktop-only-scope.md`
