# Drizzle ORM Rebuild — Context for a Fresh Chat

> **Purpose.** This document is the brief for a new chat session that
> rebuilds CogniPace's data layer from scratch on Drizzle ORM. Past
> attempts failed because we kept layering fixes on top of broken
> wiring. This time we start clean, follow the Drizzle docs phase by
> phase, and verify each step before moving on.
>
> **Do not treat this as an implementation plan.** It's a charter.
> Each phase has a goal, references, steps, and a checkpoint. Stop and
> ask the user (or pause for review) when a checkpoint fails — don't
> push through.

---

## Why this exists

We tried twice to migrate CogniPace's data from a `chrome.storage.local`
JSON blob ("v7") to SQLite-WASM + Drizzle. Both attempts shipped code
that compiled and tested green but blew up in production:

- Reads worked superficially (dashboard rendered), but every write
  failed with `SQLITE_CONSTRAINT_NOTNULL` because Drizzle's row-mapping
  returned objects where most fields were `undefined`.
- Settings updates reported success without persisting.
- "Set study mode" was a silent no-op.

The root causes were a mix of:
1. A sqlite-proxy adapter that violated Drizzle's tuple contract.
2. Schemas and seed data that drifted from each other.
3. Sanitizer asymmetry between read and write paths.
4. Defensive try/catch wrappers that swallowed real errors instead of
   surfacing them.

The fundamental mistake: **we built the new system alongside the old
blob storage instead of replacing it**, and we treated Drizzle as a
"better query builder" instead of using it idiomatically with its own
migrations and tooling.

---

## Goal

**One coherent data layer, fully on Drizzle ORM + SQLite-WASM, with
nothing reading or writing `chrome.storage.local` for app data.** The
storage layer for snapshots is allowed — but blob-shaped reads/writes
of `problems_v6` / `settings_v6` / etc. must be gone.

The work happens in phases. Each phase has a deliverable + a manual
verification step. If verification fails, the phase is not done. No
moving on until a phase is green.

### Success criteria for the whole project

- `chrome.storage.local.get(null)` shows snapshot data only, no v6/v7
  blobs.
- Every write surface (rate problem, edit problem, toggle mode, set
  active focus, save settings, suspend, reset schedule, import) works
  end-to-end on a fresh install AND across SW restarts.
- `npm run check` passes (lint + typecheck + tests + build).
- `drizzle-kit generate` produces clean migrations, `drizzle-kit migrate`
  applies them, snapshot/fingerprint logic still invalidates stale data
  on schema changes.
- No `try { ... } catch { return undefined }` swallowing errors anywhere
  in the data layer. Repos fail loudly; handlers surface errors via the
  runtime response envelope.

---

## Non-goals

- **No backwards-compat shim with v7 blob storage.** We're replacing,
  not migrating. Pre-MVP, user data wipes on install are acceptable.
- **No relations DAG, no per-table aggregate progress columns, no
  "soft delete".** Keep schemas minimal — the user explicitly asked
  for slim tables (topics: just `id` + `name`, etc).
- **No over-broad error catching.** If the data layer fails, the
  handler should propagate the error. No "best-effort" silent
  fallbacks. UI gets a clear `{ ok: false, error }` envelope and shows
  it; SW logs the stack via `serialize-error`.
- **No premature optimization.** No prepared-statement caching, no
  custom connection pool, no batched writes. SQLite + a single
  connection + the default Drizzle API is the target.

---

## Lessons from prior attempts (read first)

These are the specific traps that wasted multiple sessions. The new
agent should know them up front:

### 1. `@sqlite.org/sqlite-wasm`'s `Stmt.get(array)` does not work as documented

The Drizzle sqlite-proxy contract requires returning row tuples as
flat arrays: `{ rows: [[c0, c1, ..., cN], ...] }`. We tried using
`stmt.get(row)` where `row = []`, expecting it to fill the array
positionally. Instead, the runtime pushed the entire row as a single
element, producing `[[fullTuple]]`. Drizzle's `mapResultRow` then put
the whole tuple under `result.slug` and left every other field
undefined.

**Fix:** fetch per-column index — `for (let i = 0; i < stmt.columnCount; i++) row[i] = stmt.get(i)`.
Verify this with a unit test against a real `@sqlite.org/sqlite-wasm`
build (not just `better-sqlite3`), against EVERY method mode
(`run`, `all`, `get`, `values`).

### 2. `.default(sql\`...\`)` + concrete `values()` is fragile in Drizzle 0.45.x

When a column has `.default(sql\`(strftime(...))\`)` and we pass a
concrete string in `.values()`, Drizzle's INSERT generation sometimes
drops the bind param. Pick ONE source of truth per column:
- Either Drizzle owns the default (no `createdAt: nowIso()` in the
  insert payload, let the SQL default fire), OR
- The repo always provides a value and the schema has no SQL default.

Don't mix them.

### 3. Tests against `better-sqlite3` are not a substitute for prod testing

`drizzle-orm/better-sqlite3` and `drizzle-orm/sqlite-proxy` are
different drivers. Bugs in the proxy path are invisible to tests that
use better-sqlite3 directly. Every PR that touches the proxy adapter
should include a smoke test that exercises sqlite-wasm.

### 4. Hand-written `seed.sql` drifts from Drizzle's schema

We maintained two parallel schema definitions: the Drizzle table
declarations AND a hand-written `seed.sql` with `CREATE TABLE`
statements. They drifted (column orders, defaults, types). Use
`drizzle-kit generate` to produce schema migration files; treat the
seed data (curated topics/companies/problems/tracks) as separate
INSERT statements layered on top.

### 5. Defensive `try/catch { return undefined }` hid the real bug for days

We had `if (!slug) return undefined` early-returns that swallowed
errors silently, and broad `.catch(() => ...)` wrappers around tx
bodies. The user submitted actions, nothing happened, no log
appeared. **Repos should throw; handlers should not catch
defensively.** Use a single catch at the SW message boundary that
calls `serializeError(err)` into the logger and into the response
envelope.

### 6. Sanitizer asymmetry on write vs read

`updateUserSettings` ran the patch through a sanitizer that coerced
some fields differently from what `getUserSettings` returned on the
next read. The UI saw success → refresh → stale state. Fix: both
read and write paths flow through the same parse/serialize pair (one
codec), and the write path returns the round-tripped value to
guarantee the response matches the next read.

---

## Reference docs to read before starting

Read these in order. Don't skip ahead — Phase 0's deliverable is a
short summary in your own words showing you've absorbed them.

1. **Overview**: https://orm.drizzle.team/docs/overview
2. **Schema declaration (SQLite)**: https://orm.drizzle.team/docs/sql-schema-declaration
3. **Indexes & Constraints**: https://orm.drizzle.team/docs/indexes-constraints
4. **Relations**: https://orm.drizzle.team/docs/relations
5. **Migrations**: https://orm.drizzle.team/docs/migrations
6. **drizzle-kit overview**: https://orm.drizzle.team/docs/kit-overview
7. **`drizzle-kit generate`**: https://orm.drizzle.team/docs/drizzle-kit-generate
8. **`drizzle-kit migrate`**: https://orm.drizzle.team/docs/drizzle-kit-migrate
9. **Connect via sqlite-proxy**: https://orm.drizzle.team/docs/connect-sqlite-proxy
10. **Select**: https://orm.drizzle.team/docs/select
11. **Insert**: https://orm.drizzle.team/docs/insert
12. **Update**: https://orm.drizzle.team/docs/update
13. **Delete**: https://orm.drizzle.team/docs/delete
14. **Transactions**: https://orm.drizzle.team/docs/transactions
15. **Relational queries (`db.query.*`)**: https://orm.drizzle.team/docs/rqb

Additional context (CogniPace-specific, optional):
- `docs/architecture.md` — how the SW + UI talk
- `docs/decisions/0007-sqlite-drizzle-storage-layer.md` — the original ADR
- `src/domain/**` — domain types (these survive the rebuild unchanged)

---

## Phase 0 — Foundation: read & understand

**Goal:** the new agent can answer the following in their own words
before writing a single line of code:

- What is the difference between `db.select().from(table)` and
  `db.query.table.findMany()` in Drizzle?
- How does Drizzle resolve column data types between the schema and
  the driver result rows?
- What does the sqlite-proxy callback contract require for each of
  `run`/`all`/`get`/`values`?
- What does `drizzle-kit generate` actually produce, and where does it
  store metadata?

**Steps**

1. Read the docs listed above.
2. Skim `src/domain/**` to understand the domain types we're keeping.
3. Read `docs/drizzle-rebuild-plan.md` (this file) end to end.

**Checkpoint**

Write a short summary (≤300 words) of your understanding to the user
and pause. The user confirms before moving to Phase 1.

---

## Phase 1 — Define the data shape

**Goal:** one document listing every table, every column, every
relationship, and the corresponding TypeScript domain types. No code
yet.

**Tables we know we need (start point — refine in this phase):**

- `topics(id, name)` — slim by design.
- `companies(id, name)` — slim by design.
- `problems(slug PK, leetcode_id, title, difficulty, is_premium, url,
   topic_ids JSON, company_ids JSON, user_edits JSON, created_at,
   updated_at)`
- `study_states(problem_slug PK→FK problems, suspended, tags JSON,
   fsrs_*, created_at, updated_at)`
- `attempt_history(id PK, problem_slug FK→study_states, reviewed_at,
   rating, solve_time_ms, mode, log_snapshot JSON)`
- `tracks(id PK, name, description, enabled, created_at, updated_at)`
- `track_groups(id PK, track_id FK→tracks, topic_id FK→topics nullable,
   description, order_index)`
- `track_group_problems(group_id+problem_slug PK, order_index)`
- `settings_kv(key PK, value, updated_at)`

**For each table, document:**
- Drizzle column types (`text`, `integer`, `integer({mode:"boolean"})`,
  etc.)
- NOT NULL / nullable
- Default values (and whether they live on the SQL side, the Drizzle
  side, or both — see Lesson #2)
- Indexes
- Foreign keys + ON DELETE behavior
- The domain TypeScript type that mirrors this row shape

**For each relationship, document:**
- Drizzle `relations()` declaration (one ↔ many, FK fields)
- Whether the relational query API (`db.query.X.findMany({ with: ... })`)
  will be used to fetch it, or whether the repo composes manually.

**Deliverable**

A single markdown file `docs/drizzle-data-shape.md` with the above.
The user reviews it before any code is written.

**Checkpoint**

User approves the shape doc.

---

## Phase 2 — Drizzle schema + drizzle-kit setup

**Goal:** `src/data/db/schema.ts` matches Phase 1 exactly. `drizzle-kit`
is configured. `drizzle-kit generate` produces a clean initial
migration file. No application code uses it yet.

**Steps**

1. Create `src/data/db/schema.ts` from Phase 1 doc. One file, every
   table, every `relations()`. No per-feature schema files (we tried;
   it caused drift).
2. Configure `drizzle.config.ts` to point at the schema and write
   migrations to `src/data/db/migrations/`.
3. Run `npx drizzle-kit generate`. Inspect the generated SQL.
4. Commit the migration file as the **single canonical CREATE TABLE
   source**. Hand-written `seed.sql` for catalog data is OK, but it
   only contains `INSERT`s — never `CREATE TABLE`.

**Checkpoint**

- The generated migration matches the Phase 1 doc column-for-column.
- `npx drizzle-kit migrate` against an in-memory DB succeeds.
- A standalone Node script (no app code) imports the schema, creates
  an in-memory better-sqlite3 DB, runs the migration, inserts a
  topic, selects it back, and prints the row. Verify the row is
  `{ id, name }` and **not** wrapped in any extra structure.

**Stop here and confirm with the user before Phase 3.** This is the
most important checkpoint — most prior bugs come from this layer being
subtly wrong.

---

## Phase 3 — sqlite-proxy adapter + sqlite-wasm wiring

**Goal:** the production driver (sqlite-wasm via sqlite-proxy) returns
rows in the exact shape `mapResultRow` expects. Verified against a
real sqlite-wasm instance, not just better-sqlite3.

**Steps**

1. Implement `src/data/db/proxy.ts` with `execProxy(rawDb, sql, params,
   method)`. Follow the contract in
   https://orm.drizzle.team/docs/connect-sqlite-proxy literally.
2. Fetch row values **per column index** (`for (let i = 0; i <
   stmt.columnCount; i++) row[i] = stmt.get(i)`). Do **not** use
   `stmt.get(array)` — it does not behave as documented (see Lesson #1).
3. Write `tests/data/db/proxy.test.ts` that:
   - Spins up a real `@sqlite.org/sqlite-wasm` in-memory DB.
   - Creates a simple table with 3-4 columns including a text + integer
     + nullable text.
   - Exercises each of the four method modes (`run`/`all`/`get`/`values`).
   - Asserts the returned `{ rows }` matches Drizzle's documented
     contract: `rows` is an array of flat tuples; for `get`, at most
     one tuple wrapped in the outer array.
4. Wire `src/data/db/client.ts` to call `init`, prepare the WASM DB,
   run `drizzle-kit`-generated migrations, then expose a `getDb()`
   singleton that returns a Drizzle instance via
   `drizzle(proxyCallback, { schema })`.

**Checkpoint**

- `tests/data/db/proxy.test.ts` passes — and it MUST run against the
  WASM build, not better-sqlite3.
- Manual smoke: load the extension, open the SW console, run a one-off
  log that does `db.select().from(topics)` and confirm the row
  returned is `{ id: "<some id>", name: "<some name>" }` (a flat
  object, not nested).

---

## Phase 4 — One full feature, end-to-end

**Goal:** **`topics` works end-to-end** — schema → migration → repo →
handler → UI. Pick the smallest table on purpose so we can verify the
whole vertical slice before scaling out.

**Steps**

1. `src/data/topics/repository.ts`:
   - Named entity type: `TopicEntity = typeof topics.$inferSelect`.
   - Converters: `toTopicEntity(domain)` and `fromTopicEntity(entity)`.
   - Functions: `listTopics(db)`, `getTopic(db, id)`, `upsertTopic(db,
     args)`, `removeTopic(db, id)`.
   - **No defensive try/catch in the repo.** If the DB rejects, the
     error propagates.
2. Handlers: any existing handler that touches topics should call the
   new repo. Drop the blob-storage code for topics entirely.
3. UI: the topic list in the library tab should re-fetch from the new
   repo via the existing message channel.

**Checkpoint**

- Open the dashboard → library tab → topic filter dropdown lists every
  curated topic from the migration.
- Open SW DevTools, manually run `await getDb()` and then `db.select()
  .from(topics)` — confirm the rows are flat objects.
- `chrome.storage.local.get(null)` no longer contains any `topics_v6`
  / `topics_v7` blob. Only the SQLite snapshot.
- Add a custom topic via the UI → it appears in the dropdown → reload
  the extension → it's still there.

---

## Phase 5 — Replicate the pattern: companies, problems, tracks, studyStates, settings

**Goal:** every aggregate has the same shape as topics in Phase 4 —
typed entity, named converters, slim repo, no defensive catches.

**Order of attack (smallest → largest):**

1. `companies` — same structure as topics.
2. `settings` — single-key KV but uses the same entity pattern.
3. `tracks` (with `track_groups`, `track_group_problems`).
4. `problems` — the biggest aggregate.
5. `studyStates` (with `attempt_history`) — has FSRS logic; persistence
   only, no scheduler changes.

For each:
- Define entity + converters in the repo file.
- Add the repo functions (no defensive try/catch).
- Replace the corresponding blob-storage handler entirely.
- Smoke-test in the UI before moving to the next.

**Checkpoint per repo**

- The aggregate's primary actions (list/get/create/update/delete)
  work end-to-end in the UI.
- The corresponding `*_v6` / `*_v7` blob key is gone from
  `chrome.storage.local`.
- Tests pass.

---

## Phase 6 — Snapshot persistence + boot wiring

**Goal:** the SQLite-WASM DB survives SW respawn. Schema changes
invalidate stale snapshots automatically. Boot is fast.

**Steps**

1. Re-use the existing snapshot logic patterns from prior attempts (textual
   SQL dump + djb2 fingerprint over the schema-source-of-truth file)
   but read the fingerprint from the **drizzle-kit-generated migration
   file**, not from a hand-written `seed.sql`.
2. On boot: try to restore snapshot. If the snapshot's fingerprint
   doesn't match the current migration's, drop user tables, re-run
   migrations + seed.
3. Persist snapshots debounced after writes; force-flush on
   `chrome.runtime.onSuspend`.

**Checkpoint**

- Fresh install: SW boots, runs migrations, seeds catalog data, takes
  <100ms.
- Toggle a setting, kill the SW, open the dashboard — the new setting
  is still there.
- Change the schema (add a column to topics), re-run `drizzle-kit
  generate`, rebuild. On reload, SW detects fingerprint mismatch,
  drops tables, re-runs migrations. User data wipes (acceptable).

---

## Phase 7 — Reactivity & UI invalidation

**Goal:** writes broadcast to the UI; TanStack Query (or whatever
hook layer we land on) invalidates and re-fetches.

This was working in prior attempts via `dbEvents` + `chrome.runtime`
ports. Keep the pattern; just make sure:

- Repos return a list of affected tables alongside the value.
- A single `withTx` wrapper emits **after** the transaction commits.
- The UI side listens via `chrome.runtime.connect({ name: "db-events" })`
  and re-fetches on tables it cares about.

**Checkpoint**

- Rate a problem in the overlay → the dashboard's "Due today" count
  decrements immediately, without a manual refresh.
- Toggle study mode in settings → the header label flips immediately,
  persists across SW restart.

---

## Phase 8 — Cleanup: rip out v6/v7 blob storage

**Goal:** every reference to the old blob storage is gone. No file
under `src/data/legacy/`, no `STORAGE_KEY_V6` constants, no
`getAppData()` reading from `chrome.storage.local` for app data.

**Steps**

1. Grep for `STORAGE_KEY`, `_v6`, `_v7`, `chrome.storage.local.get`.
2. For each call site: confirm the new Drizzle path covers it, then
   delete the legacy code.
3. Remove dead helper files (sanitizers, codecs, legacy
   migration glue).
4. Run `npm run check` — every test, every lint rule, every type
   check.

**Checkpoint**

- `grep -r "chrome.storage.local" src/` returns only the SQLite
  snapshot read/write (no app-data reads).
- All UI surfaces work in a fresh install AND across SW restarts.
- The bundle is smaller (no dead sanitizer / legacy schema code).

---

## Working agreements

These apply throughout the rebuild. The new agent should treat them
as hard rules.

### Error handling

- **Repos throw.** They do not return `undefined` to indicate failure
  unless `undefined` is a legitimate result (e.g., `getTopic(missing)`).
- **Handlers catch once, at the SW message boundary.** The catch
  serializes the error with `serialize-error`, logs it, and returns a
  `{ ok: false, error }` envelope to the UI.
- **No defensive `try { ... } catch { /* swallow */ }`.** If you find
  yourself writing one, stop and ask why. Real errors must surface.
- **Validators are not catches.** Validators reject bad payloads up
  front and let the handler boundary handle the throw.

### Schema authority

- `drizzle-kit generate` is the only thing that writes `CREATE TABLE`
  SQL. Hand-written `seed.sql` only contains catalog `INSERT`s.
- Drizzle's `schema.ts` is the source of truth for column types,
  defaults, and constraints. The DB row shape (`$inferSelect`) is the
  canonical entity type — use it directly, don't redefine it.

### Migrations

- Every schema change ships a new migration file via `drizzle-kit
  generate`. We don't edit prior migration files in place.
- Pre-MVP we can drop user data on migration; once we hit MVP this
  rule tightens.

### Testing

- Every repo has integration tests against `better-sqlite3` for ergonomic
  coverage.
- Every change to `src/data/db/proxy.ts` has a unit test against real
  `@sqlite.org/sqlite-wasm`. Better-sqlite3 alone does not exercise the
  proxy path.

### Logging

- The SW has one structured logger (`serialize-error`-backed). Repos
  don't `console.log` directly.
- Temporary trace logs are fine during a phase; remove them when the
  phase passes its checkpoint.

### Phase discipline

- Each phase has a checkpoint. The phase isn't done until the
  checkpoint passes.
- If a checkpoint fails, **stop** and report the failure to the user
  with the smallest reproduction. Don't push through with workarounds.

---

## Files this rebuild will touch / replace

- **Replace from scratch:**
  - `src/data/db/schema.ts`
  - `src/data/db/proxy.ts`
  - `src/data/db/client.ts`
  - `src/data/db/tx.ts`
  - `src/data/db/events.ts`, `src/data/db/broadcast.ts` (mostly
    unchanged; verify the contract)
  - `src/data/db/seed.sql` → becomes a tiny `INSERT`-only file alongside
    drizzle-kit migrations
  - Every `src/data/<feature>/repository.ts`
  - `tests/data/db/proxy.test.ts` (new — this is the missing test we
    never wrote)

- **Keep as-is:**
  - All of `src/domain/**`
  - Validators in `src/extension/runtime/validator.ts`
  - The SW message router structure (just point at the new repos)
  - The UI side (`src/ui/**` doesn't know about persistence)

- **Delete:**
  - Any legacy blob storage helpers (`STORAGE_KEY_V6`, `getAppData()`,
    v6 sanitizers, etc.)
  - Per-feature `schema.ts` / `queries.ts` / `models.ts` triplets if
    they still exist
  - `src/data/db/relations.ts` (folds into the centralized
    `schema.ts`)

---

## How to use this document in the new chat

1. Open the new chat in this repo with `claude --resume` or fresh.
2. Paste a short kickoff message like:

   > Read `docs/drizzle-rebuild-plan.md` end to end. Then start at
   > Phase 0. Stop at every checkpoint and confirm with me before
   > moving on. Do not skip phases.

3. The agent should report after Phase 0 with the ≤300-word summary.
   If the summary is shallow ("I read the docs, looks good"), push
   back — Phase 0 is about understanding, not vibes.

4. After each phase checkpoint, the agent should pause for review.
   If it tries to chain Phase 3 → 4 → 5 in one shot, push back.

---

## Open questions for the user (resolve before Phase 1)

These are real ambiguities prior sessions punted on. Resolve them
explicitly so the rebuild doesn't accumulate accidental decisions:

1. **Migration policy on Drizzle schema changes during the rebuild:**
   wipe user data each time (current "pre-MVP, breaking changes OK"
   stance), or attempt forward-only column adds? **Recommendation:**
   wipe for now; tighten at MVP cut.

2. **Snapshot fingerprint source:** hash the drizzle-kit-generated
   migration file, or hash the resulting CREATE TABLE statements
   read out of `sqlite_master`? **Recommendation:** hash the
   migration file content (simpler, deterministic).

3. **Reactivity primitive:** keep the hand-rolled `dbEvents` pub/sub
   + `chrome.runtime.Port` bridge, or switch to TanStack Query's
   `useQueryClient().invalidateQueries({ key })` driven by the same
   broadcast? **Recommendation:** keep the hand-rolled broadcast;
   wire TanStack invalidation on top as a thin adapter.

4. **Settings codec:** put the userSettings JSON shape in
   `src/data/settings/repository.ts` directly, or extract a
   `src/data/settings/codec.ts`? **Recommendation:** start inline;
   extract only if >100 lines.

5. **Is there any aggregate where the relational query API (`db.query
   .X.findMany({ with: ... })`) wins over composed `select().from()`
   calls?** **Recommendation:** tracks (track + groups + slugs in one
   query). Everything else: prefer simple `select()`.

The new agent should ask the user about each before locking in the
phase 1 doc.
