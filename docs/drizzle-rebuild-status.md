# Drizzle Rebuild — Status & Continuation Doc

> **Purpose.** Pick-up point for resuming the SQLite + Drizzle rebuild in
> a fresh chat session. Captures everything done, every architectural
> decision, every known-issue workaround, the remaining slices, and the
> exact next steps. Companion documents:
>
> - [`docs/drizzle-rebuild-plan.md`](./drizzle-rebuild-plan.md) — the
>   original charter (strategic vision, lessons from prior attempts,
>   working agreements). Authoritative on intent.
> - [`docs/drizzle-data-shape.md`](./drizzle-data-shape.md) — every
>   table, column, default, FK, index, and domain-type mapping.
>   Authoritative on schema.
> - This file — operational status, what's done, what's pending, how to
>   resume.

---

## TL;DR

The CogniPace data layer has migrated from a single `chrome.storage.local`
JSON blob (`leetcode_spaced_repetition_data_v2`) to SQLite-WASM + Drizzle
ORM through a `sqlite-proxy` adapter. Three of five Phase 5 aggregates
(**topics, companies, problems, settings**) live entirely in SQLite, with
snapshot persistence (survives SW restart) and real-time reactivity
(open UI tabs auto-refresh on mutation). Two remain: **studyStates** and
**tracks (StudySets)**, then Phase 8 cleanup.

**Branch:** `feat/drizzle-rebuild` (off `main`). 24 commits.

**Build & test:** `npm run check` passes (lint + typecheck + 244+ tests + esbuild build).

---

## Phase status

| Phase | Status | Notes |
|---|---|---|
| 0 — Foundation | ✅ done | Charter committed, deps installed |
| 1 — Data shape doc | ✅ done | [`docs/drizzle-data-shape.md`](./drizzle-data-shape.md) |
| 2 — Schema + migration | ✅ done | 9 tables, 11 indexes, 6 FKs in `0000_initial.sql` |
| 3 — sqlite-proxy + wasm client | ✅ done | Verified in real Chrome MV3 |
| 4 — Topics end-to-end | ✅ done | First vertical slice |
| **5 — Replicate the pattern** | **🔄 4/5** | companies ✅, settings ✅, problems ✅, studyStates ✅ — **tracks 🔲** |
| 6 — Snapshot persistence | ✅ done | `cognipace_db_snapshot_v1` + fingerprint wipe-on-schema-change |
| 7 — Reactivity (lite) | ✅ done | `cognipace_db_tick` broadcast; existing `subscribeToAppDataChanges` picks it up |
| 7 — Reactivity (full) | ⏸️ deferred | `chrome.runtime.Port` + TanStack adapter — only if lite feels sluggish |
| 8 — Cleanup v6/v7 blob | 🔲 pending | Delete `getAppData` / `mutateAppData` / `STORAGE_KEY`; remove dormant fields |
| **9 — Repository façade** | **🔲 pending (new)** | Hide `Db` from handlers; collapse the data-access debt the slice-by-slice migration accumulated. See "Phase 9 outline" below. |

---

## Commit log (oldest → newest)

```
a6169b7 docs(drizzle): commit rebuild charter as in-repo reference
2db04a6 chore(deps): add drizzle-orm + sqlite-wasm + tooling for rebuild
947c257 docs(drizzle): data shape doc for the rebuild (Phase 1)
afbb0ce docs(drizzle): SQL defaults on display-required problem/track fields
f8b8249 feat(db): drizzle schema + initial migration + verification (Phase 2)
add4d6c feat(db): sqlite-proxy adapter + wasm client + wasm-backed tests (Phase 3)
de63a63 chore(db): temporary runtime smoke for the wasm wiring (revert before merge)
bd11060 fix(db): wasm-unsafe-eval CSP + locateWasm hook for MV3 wasm load
8690ad0 chore(db): drop temporary dbSmoke entry; keep production wasm wiring
08fce13 feat(db): permanent dbDebug.html dev surface for SQL inspection
5227062 feat(db): expand dbDebug into a 27-check verification suite
566c534 fix(db): default-enable foreign_keys in createDb; diagnostic FK restrict check
dd940a1 refactor(db): track_group_problems → problems uses ON DELETE CASCADE
71389d1 feat(topics): SQLite is the source of truth for topics (Phase 4 strict)
2daf979 feat(db): snapshot persistence + boot wiring (Phase 6)
00bfc95 fix(dbDebug): sub-DBs in Persistence checks need locateWasm too
9d8f3d4 fix(sw): defensive onSuspend + boot error logging
843f351 fix(a11y): blur trigger before opening EditProblemModal
f4258bc feat(companies): SQLite is the source of truth for companies (Phase 5)
3e213c9 feat(settings): SQLite is the source of truth for UserSettings (Phase 5)
fdaec4b feat(db): real-time UI reactivity via cognipace_db_tick broadcast (Phase 7 lite)
7fa5e82 feat(problems): SQLite reads + edit/assign writes (Phase 5 problems, step 1/2)
6472e12 feat(problems): drop v7 problem blob; all writes route through SQLite (step 2/2)
708c741 fix(problems): fail loud when editing an uninitialised problem
```

---

## Architectural patterns established

These are the conventions every aggregate slice follows. Reuse them for studyStates and tracks.

### 1. Repository layout

```
src/data/<feature>/repository.ts
tests/data/<feature>/repository.test.ts
```

Each repo exports:

- `to<Entity>(row): <Entity>` — schema row → domain entity (private)
- `from<Entity>(domain): row` — domain entity → schema row (private)
- `list<Entity>(db): Promise<Entity[]>` — list all, sorted for stable rendering
- `get<Entity>(db, id): Promise<Entity | undefined>` — single lookup; returns `undefined` for miss, NOT a thrown error
- `upsert<Entity>(db, args): Promise<Entity>` — insert or update; returns the round-tripped value (charter lesson #6)
- `remove<Entity>(db, id): Promise<void>` — throws on missing; respects FK behaviour
- `seedCatalog<Entity>(db, seeds): Promise<number>` — idempotent via `ON CONFLICT DO NOTHING`; returns count actually inserted (for "fresh boot vs. wake" diagnostics)

Tests run against `better-sqlite3` in-memory for speed; pin 5-10 behaviours per repo.

### 2. SW DB singleton (`src/data/db/instance.ts`)

- `getDb(): Promise<DbHandle>` — module-scoped cached promise
- First call boots: reads snapshot, restores if fingerprint matches the migration, else wipes and re-seeds catalog data
- After boot, `setOnMutationHook(() => { broadcastDbTick(); scheduleSnapshotSave(); })` registers both Phase 7 lite reactivity AND Phase 6 debounced persistence
- `flushSnapshot()` — for `chrome.runtime.onSuspend`
- `resetDbForTesting()` — for tests

### 3. Handler routing (write paths)

The pattern:

```ts
// 1. Hit SQLite via the repo (SSoT)
const { db } = await getDb();
const entity = await upsertEntity(db, args);

// 2. If the handler also touches other state still in the v7 blob
//    (e.g. studyState mutations during Phase 5 transitional period),
//    do it inside mutateAppData:
await mutateAppData((data) => {
  data.problemsBySlug[slug] = entity;  // mirror the SQLite row
  // ... v7-blob mutations only ...
  return data;
});

return ok({ ... });
```

### 4. Handler routing (read paths)

Top of `appShellHandlers.getAppShellData` / `getPopupShellData` calls
`hydrateRegistriesFromDb(data)` which fetches `topics`, `companies`,
`settings`, `problems` from SQLite and **mutates `data` in place** so
downstream view helpers (`buildStudySetView`, `buildProblemView`,
`libraryRows`) read the same shape they always have.

### 5. Fail-loud, not fall-back

Per charter lesson #5: repos throw, handlers don't catch defensively.
The recent `editProblemHandler` fix (commit `708c741`) is the
canonical example — when a problem doesn't exist in SQLite, the
handler throws a user-facing message ("Open this problem on LeetCode
first…") instead of silently returning `{ok: true}`.

### 6. dbDebug verification

`src/entrypoints/dbDebug.ts` + `public/dbDebug.html` — a permanent
verification surface loaded via `chrome-extension://<id>/dbDebug.html`.
Every aggregate adds a **Repos** category with 3-4 checks; every new
behaviour pattern (defaults, FK, JSON cols, RQB, persistence) has its
own category. Currently ~47 checks across 8 categories.

---

## Critical decisions made (and why)

| Decision | Why | Reference |
|---|---|---|
| Branch off `main`, not from `feat/sqlite-rewrite` | Charter explicitly mandates a clean rebuild, not salvage. Prior branches' bugs were inherited at the code level. | Charter "How to use this document" |
| Explicit `text("snake_case_name")` on every camelCase TS key | drizzle-orm@0.45.2 sqlite-proxy has an arg-shuffle bug that silently drops `casing: "snake_case"` at runtime. Migrations use snake_case correctly, runtime queries used camelCase. Explicit names sidestep entirely. | memory: [`feedback_drizzle_explicit_column_names.md`](file:///Users/tolutime/.claude/projects/-Users-tolutime-PersonalLearning-CogniPace/memory/) |
| `@sqlite.org/sqlite-wasm` + `sqlite-proxy`, NOT libsql / better-sqlite3 in prod | libsql doesn't work in MV3 service workers (no fs, no HTTP target). better-sqlite3 is dev-only (tests). | Phase 3 planning |
| MV3 `"wasm-unsafe-eval"` CSP + explicit `locateFile` callback | Without both, the SW dies on `WebAssembly.instantiate()`. The library's auto-detection doesn't work in esbuild IIFE bundles. | memory: [`feedback_mv3_wasm_csp_and_locate.md`](file:///Users/tolutime/.claude/projects/-Users-tolutime-PersonalLearning-CogniPace/memory/) |
| Display-required NOT NULL columns get SQL defaults | Prior attempts shipped `SQLITE_CONSTRAINT_NOTNULL` errors from partial imports. `problems.title → "Untitled"`, `problems.difficulty → "Unknown"`, etc. | memory: [`feedback_drizzle_display_defaults.md`](file:///Users/tolutime/.claude/projects/-Users-tolutime-PersonalLearning-CogniPace/memory/) |
| `track_group_problems → problems` uses `ON DELETE CASCADE` (not RESTRICT) | User preference: delete a problem, references vanish. Curated-content protection lives at the repo level (`removeProblem` will refuse `is_curated=true` rows). | commit `dd940a1` |
| Per-column-index `stmt.get(i)` in the proxy adapter | Charter lesson #1 — the trap that broke prior attempts. `stmt.get(array)` produced nested wrapping. | [`src/data/db/proxy.ts`](src/data/db/proxy.ts) |
| `foreign_keys = ON` default-enabled in `createDb` | SQLite ships FKs OFF per connection. Every caller was either remembering to enable it or accidentally relying on undefined behavior. | commit `566c534` |
| 1-second debounce for snapshot save | Balances "save before SW eviction" against "don't write 10× a second during bulk imports". chrome.storage.local quota matters. | [`src/data/db/instance.ts:57`](src/data/db/instance.ts#L57) |
| Reactivity via storage tick, not chrome.runtime.Port | Charter Phase 7 envisioned a Port API. The storage-tick pattern reuses the existing `subscribeToAppDataChanges` listener with ~30 LoC of new code. Defer Port until needed. | commit `fdaec4b` |

---

## Pending design decisions

These need resolving (probably by user) before the remaining slices start:

### Tracks slice — slim vs. hybrid

The domain `StudySet` has a discriminated union (`kind: course | custom | company | topic | difficulty`), `filter` objects, `config`, `groups[]` with `prerequisiteGroupIds`, and `problemTitleOverrides`. The charter's `tracks` table is much slimmer (id, name, description, enabled, is_curated, order_index, timestamps + `track_groups` + `track_group_problems`).

| Option | Cost | Trade-off |
|---|---|---|
| **A. Charter-pure slim Track** | High (~800-1,200 LoC) | Rewrites StudySet → Track domain, drops kind discriminator and filter objects (filtered-set views become runtime queries), drops `StudySetProgress` (derived from attempt_history + settings.activeFocus). Touches dashboard, popup, library, EditProblemModal. |
| **B. Hybrid with JSON cols** | Medium (~400-600 LoC) | Schema gets `kind` / `filter` / `config` JSON columns. Domain unchanged. UI untouched. Charter "slim" goal violated, but functional. |

**Recommendation in earlier conversation:** start with B, defer A to a domain-cleanup pass post-Phase 8.

### studyStates slice — attempt_history table

The current `StudyState` domain has `attemptHistory: AttemptHistoryEntry[]` inline. The schema splits it out as a separate `attempt_history` table with FK to `study_states.problem_slug` and `ON DELETE CASCADE`.

| Option | Trade-off |
|---|---|
| **A. Repo joins on read** | `getStudyState(db, slug)` returns `StudyState` with `attemptHistory` populated via a `SELECT … FROM attempt_history WHERE problem_slug = ?` per call. N+1 risk for bulk reads. |
| **B. Use Drizzle RQB** | `db.query.studyStates.findMany({with:{attempts:true}})` returns nested in one SQL — but only the `tracks` slice was supposed to use RQB per the data shape doc. Adding a second use is fine; the rule was "don't reach for RQB unless n+1 hurts." |

**Recommendation:** A for `getStudyState` (single lookup, n=1 join). B for bulk reads in `hydrateRegistriesFromDb` if profiling shows it matters.

---

## File map

### Production code (SQLite layer)

```
src/data/db/
├── schema.ts           # 9 tables + relations(), explicit snake_case names
├── proxy.ts            # sqlite-proxy callback (per-column-index discipline)
├── client.ts           # createDb factory (raw wasm DB + Drizzle instance)
├── instance.ts         # getDb() SW singleton; boot, snapshot, mutation hook
├── snapshot.ts         # serialize/deserialize/fingerprint/base64/storage IO
├── broadcast.ts        # broadcastDbTick() for Phase 7 lite reactivity
└── migrations/
    ├── 0000_initial.sql
    └── meta/_journal.json
```

### Aggregate repos (SSoT for each)

```
src/data/topics/repository.ts      # ✅ Phase 4
src/data/companies/repository.ts   # ✅ Phase 5
src/data/settings/repository.ts    # ✅ Phase 5
src/data/problems/repository.ts    # ✅ Phase 5
src/data/studyStates/              # 🔲 Phase 5 pending
src/data/tracks/                   # 🔲 Phase 5 pending
```

### Handlers wired to SQLite

```
src/extension/background/handlers/v7Handlers.ts       # editProblem, assignTopic, assignCompany, createCustomTopic, createCustomCompany, setActiveFocus, deleteStudySet (clears settings.activeFocus)
src/extension/background/handlers/problemHandlers.ts  # upsertFromPage, saveReviewResult, overrideLastReviewResult, saveOverlayLogDraft, suspendProblem, resetProblem, updateNotes, updateTags
src/extension/background/handlers/courseHandlers.ts   # importCurated, importCustom, addProblemByInput
src/extension/background/handlers/settingsHandlers.ts # updateSettings, exportData, importData
src/extension/background/handlers/appShellHandlers.ts # hydrateRegistriesFromDb at handler entry
src/extension/background/notifications.ts             # reads settings from SQLite
```

### Verification surface

```
public/dbDebug.html                # Toolbar: Run all + 8 category buttons
src/entrypoints/dbDebug.ts         # ~47 checks (Defaults/CRUD/FK/JSON/Indexes/RQB/Repos/Persistence)
scripts/verify-drizzle-schema.ts   # Standalone better-sqlite3 round-trip
tests/data/db/proxy.test.ts        # Wasm-backed proxy contract tests
tests/data/db/client.test.ts       # Wasm-backed Drizzle end-to-end
tests/data/topics/repository.test.ts
tests/data/companies/repository.test.ts
tests/data/settings/repository.test.ts
tests/data/problems/repository.test.ts
```

### Legacy v7 paths (still alive for un-migrated aggregates)

```
src/data/repositories/appDataRepository.ts            # getAppData / mutateAppData / saveAppData — used for studyStates + studySets
src/data/repositories/problemRepository.ts (v6 legacy) # ensureStudyState only; ensureProblem dropped
src/data/repositories/v7/seed.ts                      # buildFreshAppDataV7 (problemsBySlug={}, topicsById={}, etc.)
src/data/repositories/v7/studySetRepository.ts        # 🔲 will migrate in tracks slice
src/data/repositories/v7/studySetProgressRepository.ts# 🔲 will migrate in tracks slice (or be derived)
src/data/repositories/v7/studyStateRepository.ts      # 🔲 will migrate in studyStates slice
src/data/repositories/v7/aggregateRegistry.ts         # used by import/export; trim in Phase 8
```

### Memory (auto-recalled across chats)

```
~/.claude/projects/-Users-tolutime-PersonalLearning-CogniPace/memory/
├── MEMORY.md                                              # index
├── feedback_drizzle_rebuild_charter_authority.md          # charter is SSoT
├── feedback_drizzle_display_defaults.md                   # display defaults vs invariant fail-loud
├── feedback_drizzle_explicit_column_names.md              # casing bug workaround
└── feedback_mv3_wasm_csp_and_locate.md                    # CSP + locateFile requirement
```

---

## How to verify any slice (the recurring test protocol)

### 1. Automated (`npm run check`)

Passes when lint + typecheck + 244+ vitest tests + esbuild build all succeed.

### 2. dbDebug suite

`chrome-extension://<id>/dbDebug.html` → **Run all**. Expected: every check passes (47 currently; each new aggregate adds 3-4 to the Repos category).

### 3. Manual SW round-trip

In the dashboard DevTools console:

```js
chrome.runtime.sendMessage({ type: 'GET_APP_SHELL_DATA', payload: {} }, r => {
  console.log('ok:', r?.ok, 'err:', r?.error);
  console.log('library:', r?.data?.library?.length);
  console.log('topics:', r?.data?.topicChoices?.length);
  console.log('companies:', r?.data?.companyChoices?.length);
  console.log('settings.dailyQuestionGoal:', r?.data?.settings?.dailyQuestionGoal);
});
```

### 4. Persistence test (Phase 6 ratchet)

1. Mutate something (e.g. `CREATE_CUSTOM_TOPIC`).
2. Wait ~1.5s for debounced snapshot save.
3. Kill the SW: `chrome://extensions/` → reload icon (↻) on CogniPace.
4. Re-query — the mutation should survive.

### 5. Reactivity test (Phase 7 lite ratchet)

1. Open dashboard + popup (or two tabs) side by side.
2. Mutate something in one (e.g. toggle study mode in popup).
3. Other tab should reflect within ~100ms — no Cmd+R.

### 6. Schema-change wipe (Phase 6 safety net)

1. Forge the fingerprint: `chrome.storage.local.set({ cognipace_db_snapshot_fingerprint_v1: 'deadbeef' })`
2. Kill the SW (reload extension).
3. Open SW devtools — should see `[CogniPace] bootDb: schema fingerprint mismatch...; wiping snapshot`.
4. Query — catalog topics are back (re-seeded), custom topics are gone (acceptable pre-MVP).

---

## Next slice playbook: studyStates

**Goal:** `study_states` and `attempt_history` move to SQLite. The
remaining `mutateAppData` calls in `problemHandlers.ts` (`saveReviewResult`,
`overrideLastReviewResult`, `saveOverlayLogDraft`, `suspendProblem`,
`resetProblem`, `updateNotes`, `updateTags`) lose their `data.studyStatesBySlug`
writes — they go entirely through SQLite.

### Steps

1. **`src/data/studyStates/repository.ts`** with:
   - `toStudyState(row, attempts) → StudyState` (joins from two tables)
   - `getStudyState(db, slug): Promise<StudyState | undefined>`
   - `listStudyStates(db): Promise<Record<string, StudyState>>`
   - `upsertStudyState(db, studyState): Promise<StudyState>` — handles the FSRS scalars + `tags` JSON + the inline `lastReview` log fields
   - `appendAttempt(db, attempt)` → inserts into `attempt_history`
   - `listAttempts(db, slug, opts)` → for the attempt history view
   - `resetStudyState(db, slug, keepNotes?)` → schedule reset
   - `removeStudyState(db, slug)` → cascade-deletes attempts
2. **Test against better-sqlite3** — 8-10 tests including the FK chain (delete problem → study_state + attempt_history vanish).
3. **`instance.ts`** — no seed needed (study states are lazy). Just ensure the proxy mutation hook covers writes (already does).
4. **`appShellHandlers.hydrateRegistriesFromDb`** — also populate `data.studyStatesBySlug` from `listStudyStates`.
5. **Update write handlers** in `problemHandlers.ts`:
   - Each handler reads current study state from SQLite, applies the FSRS / suspend / tag / etc. mutation, writes back via `upsertStudyState`.
   - `saveReviewResult` / `overrideLastReviewResult` also call `appendAttempt` for the history table.
   - Drop the `mutateAppData` calls that touched only `studyStatesBySlug`.
   - The problem-side mutateAppData mirror lines can also go (data.studyStatesBySlug no longer needs to round-trip through chrome.storage).
6. **Delete `src/data/repositories/v7/studyStateRepository.ts`** + its test.
7. **Update `src/data/repositories/v7/seed.ts`** — already has `studyStatesBySlug: {}`; no change.
8. **`settingsHandlers.exportData`** — read study states from SQLite. `importData` — route through `upsertStudyState`.
9. **dbDebug Repos category** — 4 checks: insert/update round-trip, attempt_history append + ordering, suspend toggle, FK cascade (delete problem → state + attempts gone).
10. **Verify**: rate a problem → kill SW → reload → rating persists. The full FSRS state round-trips through SQLite + Phase 6 snapshot.

### Watch out for

- `ensureStudyState` in `src/data/repositories/problemRepository.ts` (v6 legacy) is still imported by `problemHandlers.ts`. Replace its callsites with the SQLite `upsertStudyState` pattern.
- The `ReviewLogFields` (interviewPattern / timeComplexity / spaceComplexity / languages / notes) live inline on the StudyState row in the schema (see `study_states` columns in `schema.ts`). Conversion needs to handle them.
- The FSRS scalars (`fsrs_*` columns) are all nullable — a fresh study state has no FSRS card until the first review.

---

## After studyStates: tracks playbook

**Pre-flight design decision:** charter-pure slim Track OR hybrid with JSON columns. See "Pending design decisions" above. **Ask the user before starting.**

### Path A — Charter-pure slim Track (recommended for long-term)

1. Update `Track` domain type to slim shape (no kind discriminator, no filter, no config, no prerequisites, no problemTitleOverrides).
2. Rewrite `buildStudySetView`, `buildActiveTrackView`, `buildStudySetViews` to consume the new shape.
3. Filtered "sets" (kind: company/topic/difficulty) become runtime queries: instead of a stored entity, they're built on demand from `problems` filtered by criteria.
4. `StudySetProgress` aggregate goes entirely — derive completion / activeGroupId / lastInteractedAt from `attempt_history` + `settings.activeFocus`.
5. Repos: `src/data/tracks/repository.ts` with list/get/upsert/remove for tracks, group management, problem-membership management.
6. Update curated-catalog seed (`curatedSets.ts` / `studySetsSeed.ts`) to produce the slim Track shape (multiple groups for course-style sets, single synthetic group for flat).
7. Migrate handlers: `createStudySetHandler`, `updateStudySetHandler`, `deleteStudySetHandler` from v7Handlers.ts.
8. Update UI: TracksView, the track switcher dropdown, EditProblemModal track context, popup activeTrack rendering, library track filter.
9. Tests + dbDebug.
10. Delete `src/data/repositories/v7/studySetRepository.ts`, `studySetProgressRepository.ts`, related tests.

### Path B — Hybrid (cheaper, ships faster)

1. Add `kind` (TEXT NOT NULL DEFAULT 'custom'), `filter` (TEXT JSON), `config` (TEXT JSON) columns to `tracks`.
2. Add `prerequisite_group_ids` (TEXT JSON DEFAULT '[]'), `problem_title_overrides` (TEXT JSON) columns to `track_groups`.
3. Regen migration (`drizzle-kit generate` — but pre-MVP, regen 0000_initial.sql in place is fine).
4. Repo converts StudySet ↔ row by JSON-encoding the discriminated fields.
5. Other steps same as A, but the domain stays untouched.

---

## Phase 9 outline — Repository façade (architectural debt)

**Problem.** Each aggregate's repo module exports functions that take
a `Db` parameter (`listProblems(db)`, `upsertProblem(db, ...)`, etc.).
Handlers import both `getDb` from `instance.ts` AND the repo's
functions, then thread `db` through. This is *data-access* rather
than the *repository pattern* — the abstraction over the data source
leaks outward. Symptoms:

- Handlers import `getDb` everywhere — they know about the SQLite
  lifecycle even though their job is just "save a problem."
- Tests have to mock `chrome.storage` AND `getDb` AND each repo
  module independently (see `tests/extension/background/handlers/settingsHandlers.test.ts`
  for an example of the mock pile-up).
- Swapping the data source (e.g. for an experiment, or migrating to a
  different driver) means editing every handler that touches that
  aggregate.

**Fix.** Wrap each repo's exports in a façade object that hides the
Db parameter:

```ts
// src/data/problems/repository.ts
export const problemRepository = {
  async upsertFromPage(args: ImportProblemArgs): Promise<Problem> {
    const { db } = await getDb();
    return importProblem(db, args);
  },
  async list(): Promise<Problem[]> {
    const { db } = await getDb();
    return listProblems(db);
  },
  // etc.
};

// Tests inject a different db via setTestDb() or similar:
export function setRepositoryDb(db: Db): void { /* swap the cached handle */ }
```

Handlers then call `problemRepository.upsertFromPage({...})` — no
`getDb`, no `db` parameter, no SQLite imports. Tests mock the façade
object directly (one `vi.mock('.../repository', () => ({...}))` per
aggregate).

**Scope.** Six aggregates × ~8-12 functions each = ~60 façade wrappers.
Plus handler refactor (~10 handler files). Plus test rewrites.
Estimated 600-900 LoC of net new code + ~300 LoC of handler diffs.

**Why defer.** Doing it before Phase 5 finishes (tracks slice) would
mean tracks lands inconsistent with the rest of Phase 5. Doing it
during Phase 8 conflates two concerns (deletion of v7 blob vs.
abstraction refactor). It deserves its own coherent pass.

**Recommended order:**
1. Complete Phase 5 (tracks) — keeps all five aggregates consistent
   with the Db-parameter pattern.
2. Phase 8 — delete v7 blob code. Smaller diff because the Db
   pattern is already established.
3. Phase 9 — façade refactor. Done as one coherent pass across all
   aggregates simultaneously, so the codebase never has a mixed state.

**Standing rule once Phase 9 lands — Unidirectional Data Flow (UDF).**
From Phase 9 onward, the façade pattern is the mechanism that
enforces UDF as the architectural invariant. UDF means data moves
through the app in exactly **one direction**:

```
  datasource (SQLite)
       ↓
   repository (façade — sole abstraction over the datasource)
       ↓
   handler / SW message boundary
       ↓
   view (dashboard / popup / overlay / content script)
       │
       │  mutation (sendMessage action)
       ↓
   handler  →  repository  →  datasource
                                    │
                                    ↓
                            broadcastDbTick()
                                    │
                                    ↓
                   subscribers re-read through the read path
                   (view → handler → repository → datasource)
```

The view never writes to the datasource. It never holds state that
drifts from a query result. Mutations always flow view → action →
handler → repo → datasource, and the response loops back as a new
read through the same chain — driven by the Phase 7 broadcast tick
(`cognipace_db_tick`).

**What this forbids:**

- **No public repo function takes a `Db` parameter.** Internal helpers
  may; the exported façade object never does.
- **No handler imports `getDb`.** If it touches data, it goes through
  a façade method.
- **No test mocks `getDb` directly.** Tests mock the façade module
  (`vi.mock("…/data/<aggregate>/repository")`) — one mock per
  aggregate the handler depends on.
- **No view writes to `chrome.storage.local` directly.** Storage is
  reachable only through the repo. (The reactive subscribe path
  reads the `cognipace_db_tick` key — that's a signal, not data.)
- **No optimistic UI state that diverges from the repo.** If a view
  needs "saving…" UX, it tracks request-in-flight, not a parallel
  copy of the data.
- **No handler keeps state across calls.** Handlers are pure
  functions of (incoming message + current repo state). Anything
  needing persistence belongs in the repo.
- **New aggregates start as façades.** Skip the intermediate
  Db-parameter shape entirely; even the first slice of a new
  aggregate ships with the façade in place.

**Code review checks** (catch the common drifts):

| Smell | Fix |
|---|---|
| `import { getDb } from "…/instance"` inside a handler | Move the data access into the repo's façade method |
| Repo function exported with `(db: Db, …)` signature | Make `db` resolved inside via `getDb()`; pass nothing from outside |
| `vi.mock("…/data/db/instance")` in a handler test | Mock the façade module instead |
| View component calls `chrome.storage.local.set` | Route through a handler + repo |
| View holds local state mirroring server data, manually `setState`d on mutate | Trust the broadcast; refetch through the existing hook layer |
| Handler caches a result between calls in module scope | Move the cache into the repo; treat handler as stateless |

**Why UDF matters here beyond hygiene.** The Phase 7 reactivity
bridge (`cognipace_db_tick` → `subscribeToAppDataChanges` →
re-fetch) only works correctly when every mutation goes through the
proxy. A view that writes around the repo silently breaks
real-time sync everywhere else — and the failure mode is "data
looks fresh in one tab, stale in another, no error."

After Phase 9 + UDF discipline, the rebuild's abstraction quality
matches the original architectural intent: data source is an
implementation detail, repos are the only thing the rest of the
codebase knows about, mutations are observable and broadcast-driven,
and tests mock the repo, not the underlying machinery.

---

## Phase 8 outline (after both Phase 5 slices land)

The v7 chrome.storage blob will hold only dormant fields. Phase 8 deletes them.

### Files to delete

- `src/data/repositories/appDataRepository.ts` — `getAppData`, `mutateAppData`, `saveAppData`, `STORAGE_KEY`, `PRE_V7_BACKUP_KEY`
- `src/data/repositories/problemRepository.ts` (v6 legacy)
- `src/data/repositories/v7/aggregateRegistry.ts` (or trim heavily)
- `src/data/repositories/v7/appDataRepository.ts` (the v7 transition funnel)
- `src/data/repositories/v7/seed.ts`
- `src/data/datasources/chrome/storage.ts` (unless `cognipace_db_*` reads use it)
- All `mutateAppData` callsites — replaced by repo calls
- Tests that depend on the v7 blob (`tests/data/v7/migration.test.ts`, etc.)

### Files to update

- `src/domain/types.ts` — remove `problemsBySlug`/`topicsById`/`companiesById`/`studyStatesBySlug`/`settings` from `AppData` (or delete `AppData` entirely)
- `src/extension/background/handlers/*` — every remaining `getAppData()` call goes through a typed projection function instead
- `src/extension/background/index.ts` — remove `chrome.storage.onChanged` listener for the legacy STORAGE_KEY (just keep the `cognipace_db_tick` path)

### One-time data wipe

On boot, if `chrome.storage.local` still has `leetcode_spaced_repetition_data_v2` or `leetcode_spaced_repetition_data_v2_pre_v7_backup`, delete the keys. Frees quota for the new snapshot.

### Estimated cost

400-700 LoC of deletions, ~5-10 test rewrites. Mostly subtraction.

---

## Quickstart for resuming in a new chat

If you (or a fresh agent) hit this doc in a new chat:

1. **Read first:**
   - This file (status + remaining work)
   - [`docs/drizzle-rebuild-plan.md`](./drizzle-rebuild-plan.md) (charter — strategic intent)
   - [`docs/drizzle-data-shape.md`](./drizzle-data-shape.md) (schema authority)
2. **Verify branch state:**
   ```bash
   git status
   git log --oneline main..HEAD
   ```
3. **Verify build is green:**
   ```bash
   npm run check
   ```
4. **Verify Chrome runtime works:**
   - Load `dist/` as unpacked extension
   - Open `chrome-extension://<id>/dbDebug.html` → Run all → 47/47
   - Send a `CREATE_CUSTOM_TOPIC` message, kill SW, reload — topic survives
5. **Memory check:** the auto-memory should already have the 4 feedback memories loaded; ensure they show up at the start of the new chat.
6. **Pick a slice:** studyStates (recommended next) or tracks (needs design decision first).
7. **Follow the playbook** for that slice (above).

### Critical commands

```bash
# Run only logic tests (excludes React)
npx vitest run --config vitest.logic.config.mjs

# Run a specific repo's tests
npx vitest run --config vitest.logic.config.mjs tests/data/problems/

# Run only the standalone schema verification
npx tsx scripts/verify-drizzle-schema.ts

# Re-generate the migration (after schema changes)
npx drizzle-kit generate

# Type-only check (skips tests/build)
npm run typecheck
```

### Critical conventions to follow

- **Every camelCase TS column key needs an explicit `text("snake_case_name")` arg.** Don't use `casing: "snake_case"` — drizzle-orm@0.45.2 has a bug.
- **Handlers throw on invariant violations; envelope catches at the SW boundary.** No defensive `try/catch { return undefined }`.
- **Repos return `undefined` on benign misses** (`getXxx` lookups). Throw on real failures.
- **Reads hydrate from SQLite at handler entry** via `hydrateRegistriesFromDb`. Writes go through repos.
- **Mutation hook fires automatically** on every Drizzle `run` — broadcasts a tick AND schedules a snapshot save. New handlers don't need to opt in.
- **Use `npx tsx scripts/verify-drizzle-schema.ts`** as a quick smoke for schema changes — much faster than full vitest.
- **Don't edit migrations in place.** `drizzle-kit generate` produces a new file; commit it. (Pre-MVP exception: the initial migration HAS been regenerated in place when the schema changed. Document this in the commit body.)

---

## Glossary (for fresh agents)

- **AppData** (`src/domain/types.ts`) — the transitional runtime shape carrying all aggregate maps. Pre-rebuild it was the chrome.storage blob; now it's a transient container hydrated from SQLite at handler entry.
- **v7 blob** — `chrome.storage.local['leetcode_spaced_repetition_data_v2']`. Pre-rebuild SSoT; now dormant for migrated aggregates.
- **mutateAppData** — the v7 blob's `read → modify → write` funnel. Migrated aggregates no longer use it.
- **hydrateRegistriesFromDb** — the function in `appShellHandlers.ts` that overrides `data.topicsById` / `data.companiesById` / `data.settings` / `data.problemsBySlug` with SQLite values at handler entry.
- **proxy contract** — sqlite-proxy callback shape: `(sql, params, method) → Promise<{rows}>`. Per-column-index iteration is mandatory (charter lesson #1).
- **snapshot fingerprint** — djb2 hash of the migration SQL text. If stored snapshot's fingerprint doesn't match current migration's, the snapshot is wiped and the DB re-seeded.
- **cognipace_db_tick** — Phase 7 lite broadcast key. Every Drizzle mutation writes a small payload here; open extension pages observe it via `chrome.storage.onChanged` and re-fetch through their existing hook layer.
- **dbDebug** — the dev-only verification page; the source of truth for "does the data layer still work end-to-end."
