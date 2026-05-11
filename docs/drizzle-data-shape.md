# Drizzle Data Shape

> **Status.** Phase 1 deliverable. Defines every SQLite table, every column,
> every relationship, every default-ownership choice, and the Drizzle / domain
> type mapping for the rebuild. The charter at
> [`docs/drizzle-rebuild-plan.md`](./drizzle-rebuild-plan.md) is the source of
> truth; this document operationalises it. Where the current `src/domain/`
> types conflict with the charter, **the charter wins** and the domain types
> will be rewritten in later phases.

---

## Conventions

### Naming

- **Tables:** `snake_case`, plural (`topics`, `problems`, `track_groups`).
- **Columns:** `snake_case`. We rely on `casing: "snake_case"` at the
  `drizzle()` initialization site to auto-map TypeScript `camelCase` keys to
  DB columns — no per-column aliases unless the mapping isn't 1:1.
- **Primary keys:** `id` for tracks/groups/topics/companies/attempt rows,
  `slug` for problems, `(group_id, problem_slug)` composite for the track
  join table, `problem_slug` for `study_states` (1:1 with problems), `key`
  for `settings_kv`.

### Column types (SQLite)

- `text(...)` — strings, ISO timestamps, JSON-encoded values, branded ids
  (slugs, topic ids, etc.).
- `integer(..., { mode: "boolean" })` — boolean flags (0/1).
- `integer(...)` — counts, milliseconds, ratings, order indexes.
- `real(...)` — FSRS stability / difficulty / elapsed-days / retrievability.
- `text(..., { enum: [...] })` — small closed sets (difficulty, FSRS state,
  review mode).
- `text(..., { mode: "json" })` — JSON arrays / objects. Drizzle does the
  JSON encode/decode for us; the column itself is plain TEXT in SQLite.

### Default ownership (charter lesson #2)

For each column, **exactly one** of these owns the default:

| Column shape | Owner | Pattern |
|---|---|---|
| `created_at`, `updated_at` | **SQL** | `.default(sql\`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))\`)` — repos never pass timestamps on INSERT; repos always pass `updated_at: nowIso()` on UPDATE |
| Empty JSON arrays (`topic_ids`, `company_ids`, `tags`, `languages`, etc.) | **Drizzle** | `.$default(() => [])` — Drizzle serialises to `'[]'` at insert time |
| Empty JSON objects (`user_edits`) | **Drizzle** | `.$default(() => ({}))` |
| Booleans with a sensible "false" default (`suspended`, `is_premium`, `enabled`, `is_curated`) | **SQL** | `.default(false)` (Drizzle renders to `0`) |
| **Display-required strings** (`problems.title`, `problems.url`, `problems.difficulty`, `tracks.name`) | **SQL** | `.default("Untitled")` / `.default("Unknown")` / `.default("")` — these fields are NOT NULL but get a sensible placeholder so partial imports succeed and the user can correct the value later. Failing loud here doesn't help: if a curated catalog row is missing a difficulty, we still want the problem ingested, just labelled as `"Unknown"`. |
| **Structurally required fields** (PKs, FKs, `tracks.is_curated`, `attempt_history.rating`, `attempt_history.mode`, `attempt_history.reviewed_at`, `*.order_index`) | **Caller** | No default; repo MUST provide; column is `NOT NULL`. These are invariants the system can't function without — fail loud per charter lesson #5. |
| Optional / nullable columns | **N/A** | No default; column is nullable |

**Forbidden:** mixing a SQL default with a repo-supplied value on the same
column. Pick one or the other per the table below.

**Convention rationale.** Charter lesson #5 says "repos throw, don't
swallow." That rule targets *invariant* violations (missing FK, missing
rating on a review event) — situations where continuing past the error
silently corrupts data. It does **not** target *cosmetic* incompleteness
(an imported problem with no difficulty label). For the latter, a SQL
default is the right tool: the insert succeeds with a clear placeholder
value, and the user can refine it later. This is consistent with the
prior-attempt failure mode (`SQLITE_CONSTRAINT_NOTNULL` on every write)
which traced to ambiguous "should this be NOT NULL?" decisions.

### Foreign keys & ON DELETE

- `study_states.problem_slug → problems.slug` — `ON DELETE CASCADE`. A
  problem cannot exist without its study state being cleaned up.
- `attempt_history.problem_slug → study_states.problem_slug` — `ON DELETE CASCADE`.
- `track_groups.track_id → tracks.id` — `ON DELETE CASCADE`. Deleting a
  track removes its groups.
- `track_groups.topic_id → topics.id` — `ON DELETE SET NULL`. Removing a
  topic doesn't break the track group; the group becomes "untopic'd".
- `track_group_problems.group_id → track_groups.id` — `ON DELETE CASCADE`.
- `track_group_problems.problem_slug → problems.slug` — `ON DELETE RESTRICT`.
  Curated catalog problems should not be deleted while a track references
  them. If a delete is genuinely needed, the repo must remove the join row
  first.

---

## Tables

### 1. `topics`

| Column | Type | Null? | Default | Notes |
|---|---|---|---|---|
| `id` | `text` PK | NO | — | Slug-style ids for curated (`"array"`, `"dynamic-programming"`); UUIDs for user-custom. |
| `name` | `text` | NO | — | Human label. |

**Domain type:** `interface Topic { id: TopicId; name: string }` — replaces the
current `src/domain/topics/model.ts` (drops `description`, `isCustom`,
`createdAt`, `updatedAt` per the charter's "slim by design").

**Indexes:** none beyond the PK.

**FKs:** none outbound.

---

### 2. `companies`

| Column | Type | Null? | Default | Notes |
|---|---|---|---|---|
| `id` | `text` PK | NO | — | Slug-style for curated, UUID for custom. |
| `name` | `text` | NO | — | Human label. |

**Domain type:** `interface Company { id: CompanyId; name: string }` — replaces
the current `src/domain/companies/model.ts` (same slim-down as topics).

**Indexes:** none beyond the PK.

**FKs:** none outbound.

---

### 3. `problems`

| Column | Type | Null? | Default | Notes |
|---|---|---|---|---|
| `slug` | `text` PK | NO | — | LeetCode-canonical slug (`"two-sum"`). Caller provides. |
| `leetcode_id` | `text` | YES | — | LC numeric id as string (`"1"`). |
| `title` | `text` | NO | `"Untitled"` (SQL) | Display title; placeholder if absent at import time. |
| `difficulty` | `text({ enum: ["Easy","Medium","Hard","Unknown"] })` | NO | `"Unknown"` (SQL) | Closed set; placeholder if absent at import. |
| `is_premium` | `integer({ mode: "boolean" })` | NO | `false` (SQL) | LC-premium flag. |
| `url` | `text` | NO | `""` (SQL) | Full LC URL; empty string if absent at import (UI may render as a disabled link). |
| `topic_ids` | `text({ mode: "json" })` | NO | `[]` (Drizzle) | `TopicId[]` — denormalised. Charter accepts this; allows single-row reads of a Problem. |
| `company_ids` | `text({ mode: "json" })` | NO | `[]` (Drizzle) | `CompanyId[]`. |
| `user_edits` | `text({ mode: "json" })` | NO | `{}` (Drizzle) | `Partial<Record<EditableField, true>>` sticky-edit flags so imports don't clobber user overrides. |
| `created_at` | `text` | NO | `current_timestamp` (SQL) | ISO 8601 UTC. |
| `updated_at` | `text` | NO | `current_timestamp` (SQL) | ISO 8601 UTC; repo updates on every write. |

**Domain type:** `Problem` (rewritten to drop `topics: string[]` v6 legacy
and `sourceSet: string[]` v6 legacy; see current
`src/domain/problems/model.ts` as the starting point — it's already close).

**Indexes:**
- `idx_problems_difficulty` on `(difficulty)` — for difficulty-filtered queue queries.
- `idx_problems_is_premium` on `(is_premium)` — for the `skipPremium` setting filter.

**FKs:** none outbound (denormalised topic/company refs live in the JSON columns; integrity is the repo's responsibility, not the DB's).

---

### 4. `study_states`

One row per problem the user has interacted with (lazily created on first review). 1:1 with `problems` (when present).

| Column | Type | Null? | Default | Notes |
|---|---|---|---|---|
| `problem_slug` | `text` PK→FK `problems.slug` | NO | — | `ON DELETE CASCADE`. |
| `suspended` | `integer({ mode: "boolean" })` | NO | `false` (SQL) | User-suspended OR premium-locked-when-skip-premium-is-on (semantics live in the repo). |
| `tags` | `text({ mode: "json" })` | NO | `[]` (Drizzle) | Personal scratch tags. |
| `best_time_ms` | `integer` | YES | — | Fastest solve seen. |
| `last_solve_time_ms` | `integer` | YES | — | Most recent solve time. |
| `last_rating` | `integer({ enum: [0,1,2,3] })` | YES | — | Last FSRS rating: Again/Hard/Good/Easy. |
| `confidence` | `real` | YES | — | 0..1 self-reported confidence. |
| `fsrs_due` | `text` | YES | — | ISO timestamp of next due review. |
| `fsrs_stability` | `real` | YES | — | FSRS stability. |
| `fsrs_difficulty` | `real` | YES | — | FSRS difficulty (per-card). |
| `fsrs_elapsed_days` | `real` | YES | — | Days since last review at last rating. |
| `fsrs_scheduled_days` | `real` | YES | — | Interval to next review. |
| `fsrs_learning_steps` | `integer` | YES | — | Step count in the learning queue. |
| `fsrs_reps` | `integer` | YES | — | Total review count. |
| `fsrs_lapses` | `integer` | YES | — | Lapse count. |
| `fsrs_state` | `text({ enum: ["New","Learning","Review","Relearning"] })` | YES | — | FSRS card phase. |
| `fsrs_last_review` | `text` | YES | — | ISO timestamp of last review. |
| `interview_pattern` | `text` | YES | — | Last review-log field (kept inline for fast UI render). |
| `time_complexity` | `text` | YES | — | Last review-log. |
| `space_complexity` | `text` | YES | — | Last review-log. |
| `languages` | `text` | YES | — | Last review-log. |
| `notes` | `text` | YES | — | Last review-log (personal notes). |
| `created_at` | `text` | NO | `current_timestamp` (SQL) | First-review timestamp. |
| `updated_at` | `text` | NO | `current_timestamp` (SQL) | |

**Domain type:** `StudyState` — drop `attemptHistory` (now its own table; load via JOIN or RQB as needed).

**Indexes:**
- `idx_study_states_due` on `(fsrs_due)` partial `WHERE suspended = 0` — the queue query: "what's due today and not suspended?"
- `idx_study_states_suspended` on `(suspended)`.

**FKs:** `problem_slug → problems.slug ON DELETE CASCADE`.

---

### 5. `attempt_history`

One row per review event. Append-only from the repo's perspective.

| Column | Type | Null? | Default | Notes |
|---|---|---|---|---|
| `id` | `integer` PK (autoincrement) | NO | — | Surrogate id for ordering. |
| `problem_slug` | `text` FK→`study_states.problem_slug` | NO | — | `ON DELETE CASCADE`. |
| `reviewed_at` | `text` | NO | — | ISO timestamp; repo provides (not SQL default — the review's wall-clock time is meaningful, not the row's insert time). |
| `rating` | `integer({ enum: [0,1,2,3] })` | NO | — | FSRS rating. |
| `solve_time_ms` | `integer` | YES | — | Self-reported. |
| `mode` | `text({ enum: ["RECALL","FULL_SOLVE"] })` | NO | — | Review mode. |
| `log_snapshot` | `text({ mode: "json" })` | YES | — | `ReviewLogFields` object captured at this review (the "blast from the past" view). |

**Domain type:** `AttemptHistoryEntry` — current shape in
`src/domain/types.ts` maps cleanly. The `id` field is new.

**Indexes:**
- `idx_attempt_history_slug_reviewed_at` on `(problem_slug, reviewed_at DESC)` —
  the "latest N attempts for this problem" query.

**FKs:** `problem_slug → study_states.problem_slug ON DELETE CASCADE`.

---

### 6. `tracks`

A "Track" is the unified replacement for the current `StudySet` discriminated
union. **Per the charter, the `kind` discriminator and `filter` objects are
dropped.** Curated multi-section courses (Blind75, NeetCode150) live as
tracks with multiple groups; flat user lists live as tracks with one
synthetic group; "all problems in topic X" is a runtime query, not a stored
track.

| Column | Type | Null? | Default | Notes |
|---|---|---|---|---|
| `id` | `text` PK | NO | — | Slug-style for curated (`"blind75"`); UUID for user-created. Caller provides. |
| `name` | `text` | NO | `"Untitled Track"` (SQL) | Display name; placeholder if absent. |
| `description` | `text` | YES | — | Optional summary. |
| `enabled` | `integer({ mode: "boolean" })` | NO | `true` (SQL) | Whether the queue draws problems from this track. |
| `is_curated` | `integer({ mode: "boolean" })` | NO | `false` (SQL) | Curated tracks gate "delete" / "rename" / etc. behaviour in the repo. Charter omitted this, but we need it to distinguish ownership; included as a small, justified addition. |
| `order_index` | `integer` | YES | — | User-defined ordering; `NULL` means "default by id". |
| `created_at` | `text` | NO | `current_timestamp` (SQL) | |
| `updated_at` | `text` | NO | `current_timestamp` (SQL) | |

**Domain type:** `interface Track { id: TrackId; name: string; description?: string; enabled: boolean; isCurated: boolean; orderIndex?: number; createdAt: string; updatedAt: string }` — replaces `StudySet`.

**Indexes:**
- `idx_tracks_enabled` on `(enabled)` — queue uses this.
- `idx_tracks_order_index` on `(order_index)` — UI listing.

**FKs:** none outbound.

**Relations** (Drizzle `relations()`): `tracks ↔ track_groups` one-to-many.

---

### 7. `track_groups`

Sections within a track. Curated multi-section courses get one group per
topic (with `topic_id` set). Flat tracks (user-created or single-topic
curated) get one synthetic group with `topic_id = NULL` and `name = NULL`
(the UI renders the track's own name instead).

| Column | Type | Null? | Default | Notes |
|---|---|---|---|---|
| `id` | `text` PK | NO | — | Slug-style for curated, UUID for user-created. |
| `track_id` | `text` FK→`tracks.id` | NO | — | `ON DELETE CASCADE`. |
| `topic_id` | `text` FK→`topics.id` | YES | — | `ON DELETE SET NULL`. When set, the group represents a topic-bound section. |
| `name` | `text` | YES | — | Group label override; falls back to the topic's name when `topic_id` is set, else the track's name. |
| `description` | `text` | YES | — | Optional summary. |
| `order_index` | `integer` | NO | — | Sort order within the track; repo provides. |

**Domain type:** `interface TrackGroup { id: TrackGroupId; trackId: TrackId; topicId?: TopicId; name?: string; description?: string; orderIndex: number }`.

**Dropped from current `SetGroup`:**
- `prerequisiteGroupIds: SetGroupId[]` — no DAG per charter ("no relations DAG").
- `problemTitleOverrides: Record<string,string>` — curated catalog data loss is acceptable; if a curated set really needs a custom title for a problem within a group, we can patch the global `problems.title` once (sticky-edit flag tracks the override).

**Indexes:**
- `idx_track_groups_track_id_order` on `(track_id, order_index)`.

**FKs:** `track_id` cascade, `topic_id` set-null.

**Relations:** `track_groups → tracks` one, `track_groups → track_group_problems` many.

---

### 8. `track_group_problems`

The ordered membership of problems within a group.

| Column | Type | Null? | Default | Notes |
|---|---|---|---|---|
| `group_id` | `text` FK→`track_groups.id` | NO (PK) | — | `ON DELETE CASCADE`. |
| `problem_slug` | `text` FK→`problems.slug` | NO (PK) | — | `ON DELETE RESTRICT` (must remove the membership row before deleting a problem). |
| `order_index` | `integer` | NO | — | Sort order within the group. |

**Composite PK:** `(group_id, problem_slug)`.

**Domain type:** `interface TrackGroupProblem { groupId: TrackGroupId; problemSlug: ProblemSlug; orderIndex: number }`.

**Indexes:**
- `idx_tgp_group_id_order` on `(group_id, order_index)` — list problems within a group in order.
- `idx_tgp_problem_slug` on `(problem_slug)` — reverse lookup "which tracks contain this problem?".

**FKs:** cascade on `group_id`, restrict on `problem_slug`.

---

### 9. `settings_kv`

Generic key-value store for `UserSettings` (encoded as one JSON row keyed
`user_settings`) plus other one-off persisted state.

| Column | Type | Null? | Default | Notes |
|---|---|---|---|---|
| `key` | `text` PK | NO | — | Known keys: `user_settings`, `last_migration_at`, `pre_v7_backup_consumed`. |
| `value` | `text` | NO | — | JSON-encoded value. The settings repo handles parse/serialize inline (charter recommendation #4). |
| `updated_at` | `text` | NO | `current_timestamp` (SQL) | |

**Domain types served by this table:**
- `user_settings` key → `UserSettings` (current shape in
  `src/domain/settings/model.ts` — kept as-is, including nested
  `notifications`/`memoryReview`/`questionFilters`/`timing`/`experimental`
  and the `activeFocus` discriminated union).
- `last_migration_at` → ISO string.

**Indexes:** none beyond the PK.

**FKs:** none.

---

## Derived data (no table, computed in repos)

These were aggregates / fields in the current AppData. The charter explicitly
derives them; we honour that.

- **`StudySetProgress`** — no table. The progress repo computes:
  - `completedSlugs`: problems in the track whose `study_states.last_rating ≥ 1`
    (i.e. seen at least once at "Hard" or better).
  - `startedAt`: `MIN(attempt_history.reviewed_at)` across the track's problems.
  - `lastInteractedAt`: `MAX(attempt_history.reviewed_at)` across the track's
    problems.
  - `activeGroupId`: read from `settings_kv['user_settings'].activeFocus`.
- **Track ordering for user (`studySetOrder`)** — replaced by `tracks.order_index`.
- **`setsEnabled`** (v6 setting) — fully gone. `tracks.enabled` is the SSoT.

---

## Drizzle `relations()` declarations

A single `src/data/db/schema.ts` file holds all tables + relations. Sketch:

```ts
export const tracksRelations = relations(tracks, ({ many }) => ({
  groups: many(trackGroups),
}));

export const trackGroupsRelations = relations(trackGroups, ({ one, many }) => ({
  track: one(tracks, {
    fields: [trackGroups.trackId],
    references: [tracks.id],
  }),
  topic: one(topics, {
    fields: [trackGroups.topicId],
    references: [topics.id],
  }),
  problems: many(trackGroupProblems),
}));

export const trackGroupProblemsRelations = relations(trackGroupProblems, ({ one }) => ({
  group: one(trackGroups, {
    fields: [trackGroupProblems.groupId],
    references: [trackGroups.id],
  }),
  problem: one(problems, {
    fields: [trackGroupProblems.problemSlug],
    references: [problems.slug],
  }),
}));

export const studyStatesRelations = relations(studyStates, ({ one, many }) => ({
  problem: one(problems, {
    fields: [studyStates.problemSlug],
    references: [problems.slug],
  }),
  attempts: many(attemptHistory),
}));

export const attemptHistoryRelations = relations(attemptHistory, ({ one }) => ({
  studyState: one(studyStates, {
    fields: [attemptHistory.problemSlug],
    references: [studyStates.problemSlug],
  }),
}));
```

**Where we use `db.query.*` (RQB) vs `db.select()` manually:**

- **RQB** (`db.query.tracks.findMany({ with: { groups: { with: { problems: true } } } })`) — exactly **one** place: the dashboard's Track view, which renders a track + its groups + each group's ordered problems. Composing this with manual joins would require post-fetch grouping in TypeScript; RQB returns the nested object directly.
- **`db.select()` everywhere else** — queue queries, problem list filters, settings reads, attempt history pulls, search. Simpler, faster to reason about, and tests cleanly against a stub.

---

## Open questions from the charter — resolved

1. **Migration policy on schema changes (pre-MVP):** wipe user data on every
   schema change. Tighten at MVP cut.
2. **Snapshot fingerprint source:** djb2 (or sha-256, doesn't matter as long
   as it's deterministic) hash of the drizzle-kit-generated migration
   file's `migration.sql` contents. Stored in the snapshot key alongside the
   SQL dump. On boot, mismatch ⇒ drop tables, re-run migration, re-seed.
3. **Reactivity primitive:** Phase 7 — defer.
4. **Settings codec:** inline in `src/data/settings/repository.ts`. The
   `settings_kv` row stores `JSON.stringify(userSettings)`. Repo parses on
   read, serialises on write. Round-trip the parsed value through the same
   codec on write so the response shape always matches the next read
   (charter lesson #6).
5. **RQB usage:** tracks only (as listed above). Everything else uses
   `db.select()`.

---

## What this doc does NOT include (deferred to later phases)

- **The seed strategy** for curated tracks (Blind75, NeetCode150, etc.) —
  Phase 5. Seeds will be plain `INSERT` SQL files alongside the drizzle-kit
  migrations, NOT hand-written `CREATE TABLE` files (charter lesson #4).
- **The proxy adapter** that connects sqlite-wasm to Drizzle — Phase 3.
- **Snapshot persistence + boot orchestration** — Phase 6.
- **The v7 blob → SQLite migration path** — there isn't one. Per charter,
  pre-MVP we wipe and re-seed; no user-data carry-over.

---

## Phase 2 readiness checklist

When the user approves this doc, Phase 2 will:

1. Create `src/data/db/schema.ts` with all nine tables above + `relations()`.
2. Create `drizzle.config.ts` at repo root.
3. Run `npx drizzle-kit generate` and commit the migration folder under
   `src/data/db/migrations/`.
4. Diff the generated SQL against this doc column-for-column.
5. Run `scripts/verify-drizzle-schema.ts` (better-sqlite3 in-memory) to
   prove rows round-trip as flat objects.
