# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Read These First

`AGENTS.md` is the operating contract for coding agents in this repo and overrides anything below it
when there is a conflict. Other authoritative docs:

- `docs/product.md` — product source of truth
- `docs/features.md` — feature behavior + in/out-of-scope rules
- `docs/architecture.md` — layer boundaries, runtime/data flow, where-to-change-things index
- `docs/DESIGN_GUIDELINES.md` — visual conventions
- `docs/decisions/` — ADRs (no account, no backend, minimal permissions, desktop-only)

Doc precedence: `product.md` > `features.md` > `architecture.md` > `DESIGN_GUIDELINES.md`. If a
requested change conflicts with the current architecture, propose the architecture change explicitly
rather than smuggling it into the implementation.

## Commands

Node `24.x` LTS, `npm`. Most workflows go through:

- `npm run check` — full agent validation: `lint` → `typecheck` → `test` → `test:logic` → `test:a11y` → `build`. Run when touching `src/**`, `tests/**`, `public/**`, build/tooling config, or workflows.
- `npm run build` — generate icons + esbuild bundle into `dist/`. After changes, reload the unpacked extension from `chrome://extensions`.
- `npm run lint` — ESLint (includes the architecture and side-effect rules below).
- `npm run typecheck` — `tsc --noEmit` for `tsconfig.json` and `tsconfig.tests.json`.
- `npm run test` — Vitest **UI/React** suite (`jsdom`, `src/tests/**/*.react.test.tsx`) with v8 coverage.
- `npm run test:logic` — Vitest **logic** suite (`node`, `src/tests/**/*.test.ts`).
- `npm run test:a11y` — axe-based a11y tests (`**/*.a11y.test.tsx`).
- `npm run check:cycles` — `madge --circular` over `src` (`ts`, `tsx`).
- `npm run format` / `format:check` — Prettier. For **docs-only / governance-only** changes, `npm run format:check` alone is sufficient; do not claim a green `npm run check` unless it was actually run.

Run a single test: `npx vitest run path/to/file.test.ts` (use `--config vitest.logic.config.mjs` for node-side tests). Filter by name with `-t "name"`.

Schema changes: edit files under `src/platform/db/schema/`, then run `npx drizzle-kit generate`.
**Never hand-edit generated migration files** in `src/platform/db/migrations/`.

## Architecture

Chrome Extension Manifest V3, local-first (no backend, no accounts). React 19 + MUI + Emotion. Bundled with `esbuild` (entrypoints in `build.cjs`: `background`, `content`, `popup`, `dashboard`, `dbDebug`).

### Layered slices

```
src/
├── app/            # React shells (popup, dashboard, overlay), providers, DI, api proxy
├── design-system/  # MUI atoms + per-surface theme factories
├── entrypoints/    # Thin bootstraps for popup/dashboard/overlay/dbDebug
├── extension/
│   └── background/ # SW lifecycle (index.ts), dispatcher, swApi registry, notifications
├── features/<x>/   # Self-contained slice: data/{datasource,repository}, domain/{model,policy}, ui/, messaging/handlers.ts, server.ts
├── libs/           # Pure utils: fsrs, runtime-rpc (createSwClient), leetcode, event-bus
├── platform/       # chrome wrappers, db (sqlite-wasm + drizzle), time
├── shared/         # Branded types, string utils
└── tests/          # Vitest suites (react + logic + a11y)
```

Aliases: `@app/*`, `@extension/*`, `@features/*`, `@libs/*`, `@platform/*`, `@design-system/*`, `@shared/*` (see `tsconfig.json` and both vitest configs).

### Runtime + data flow

```
UI hook  →  api.someMethod(payload)            ← createSwClient<SwApi>() proxy
              └─ chrome.runtime.sendMessage({ method, payload })
                  └─ dispatcher.ts: parse → authorize → swApi[method](payload)
                      └─ handler (features/*/messaging/handlers.ts)
                          └─ const { db } = await getDb()
                              └─ datasource fn (Drizzle query against SQLite)
```

Handler signatures in `src/extension/background/swApi.ts` **are the wire contract**. The UI imports
`type SwApi` from it for compile-time autocomplete. Adding a handler = export from `server.ts`,
register in `swApi.ts`.

### Persistence

SQLite-WASM is the SSoT. `chrome.storage.local` holds **only** two things:

1. **Snapshot** (`cognipace_db_snapshot_v1`) — written via a 1s debounce after every mutation in `platform/db/instance.ts`; flushed on `chrome.runtime.onSuspend`.
2. **Mutation tick** (`DB_TICK_KEY`) — broadcast after every Drizzle `run`; open pages re-fetch via `useTickQuery`.

`AppData` (`features/app-shell/domain/model/AppData.ts`) is a read-only projection assembled on each
`getAppShellData` call — never persisted directly.

### Hard rules (enforced by ESLint)

- UI never imports `chrome.*` directly. UI reads/writes go through `api.*` (typed RPC proxy) and feature datasources.
- `chrome.tabs.*`, `chrome.storage.*`, `chrome.runtime.getURL`, `fetch`, `localStorage`, `crypto.*`, `Date.now()`, `Math.random()` are **banned from `src/features/**` and `src/app/**`**. Route through `@platform/*` wrappers (`@platform/chrome/tabs`, `@platform/chrome/storage`, `@platform/time`, etc.). Default-parameter `new Date()` is allowed (callers can inject).
- MUI deep imports only: `import Button from "@mui/material/Button"` — barrel imports are an error.
- No `forwardRef` import from React (React 19 accepts `ref` as a plain prop).
- Cross-feature imports must go through `features/<x>/index.ts` (UI) or `features/<x>/server.ts` (SW); deep imports are banned.
- Datasources take a `Db` argument; only SW handlers call `getDb()`.
- Domain code under `src/features/*/domain/` and `src/libs/` is pure: no React, no `chrome`, no `window`.
- Keep `src/entrypoints/*` thin — they bootstrap screens; they do not own product logic.

### MV3 + SQLite-WASM gotchas

- Manifest CSP must include `'wasm-unsafe-eval'`.
- `sqlite3InitModule` is called with an explicit `locateFile: chrome.runtime.getURL("sqlite3.wasm")`; `build.cjs` copies the wasm next to bundled JS.
- Drizzle schema columns use **explicit snake_case `name`** (the `casing` option is broken in `drizzle-orm@0.45.2` sqlite-proxy).

## Scope And Authority

- Humans own roadmap, scope, releases, architecture shifts, permissions, and merge decisions.
- A feature being listed as **In Scope** in `docs/features.md` is *not* permission to self-start; treat it as directionally allowed only when explicitly requested.
- Blocked without explicit human approval: product scope expansion, manifest permission changes, auth/account/backend introduction, major dependency shifts, layer-boundary changes, storage-model redesign, styling-system replacement.
- Don't keep legacy compatibility shims past the documented migration window — remove them rather than normalizing them.

## Memory-System Notes

There is a populated auto-memory store under `~/.claude/projects/-Users-tolutime-PersonalLearning-CogniPace/memory/`
covering the Drizzle rebuild charter, display-defaults vs fail-loud policy, snake_case naming, MV3
CSP/`locateFile` requirements, and the Phase B wire-contract backlog. Consult `MEMORY.md` before
revisiting those areas.
