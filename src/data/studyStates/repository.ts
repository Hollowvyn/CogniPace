/**
 * StudyState aggregate repository — Phase 5 SSoT for the StudyState
 * + attempt_history pair.
 *
 * The runtime `StudyState` domain shape carries inline:
 *   - core flags: suspended, tags, bestTimeMs, lastSolveTimeMs,
 *                 lastRating, confidence
 *   - last-review log fields (interviewPattern / timeComplexity /
 *                 spaceComplexity / languages / notes — extends
 *                 `ReviewLogFields`)
 *   - `fsrsCard?: FsrsCardSnapshot` — the spaced-repetition card state
 *   - `attemptHistory: AttemptHistoryEntry[]` — append-only review log
 *
 * The SQLite schema splits this into two tables:
 *   - `study_states` (one row per problem_slug PK→FK problems)
 *     - flag/log fields inline
 *     - fsrs_* scalars flattened (nullable until first review)
 *   - `attempt_history` (one row per review event)
 *     - id PK autoincrement, problem_slug FK CASCADE, reviewed_at,
 *       rating, solve_time_ms, mode, log_snapshot JSON
 *
 * Repos own the assembly: `toStudyState(row, attempts) -> StudyState`
 * joins the two; writes split back into a `study_states` upsert plus
 * `appendAttempt` calls for each new attempt. Reviews are append-only
 * — we never replace an attempt row, only insert.
 *
 * StudyState is created lazily: a Problem can exist with no row in
 * `study_states`. The first review materialises the row via
 * `ensureStudyState` + `recordReview`. Before that, the slug simply
 * has no study state and views render "not started".
 */
import { asc, desc, eq } from "drizzle-orm";

import { asProblemSlug, type ProblemSlug } from "../../domain/common/ids";
import { nowIso } from "../../domain/common/time";
import { createDefaultStudyState } from "../../domain/study-state/defaults";
import * as schema from "../db/schema";

import type {
  AttemptHistoryEntry,
  FsrsCardSnapshot,
  Rating,
  ReviewLogFields,
  ReviewMode,
  StudyState,
} from "../../domain/types";
import type { Db } from "../db/client";

type StudyStateRow = typeof schema.studyStates.$inferSelect;
type StudyStateInsert = typeof schema.studyStates.$inferInsert;
type AttemptRow = typeof schema.attemptHistory.$inferSelect;
type AttemptInsert = typeof schema.attemptHistory.$inferInsert;

/**
 * Schema rows → domain StudyState. The FSRS scalars collapse into a
 * single `fsrsCard?` snapshot iff *all* required FSRS columns are
 * populated; if any are null, `fsrsCard` is omitted (the user hasn't
 * had a first review yet).
 */
function toStudyState(row: StudyStateRow, attempts: AttemptRow[]): StudyState {
  const fsrsCard = buildFsrsCard(row);
  const state: StudyState = {
    suspended: row.suspended,
    tags: row.tags,
    attemptHistory: attempts.map(toAttempt),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
  if (row.bestTimeMs !== null) state.bestTimeMs = row.bestTimeMs;
  if (row.lastSolveTimeMs !== null) state.lastSolveTimeMs = row.lastSolveTimeMs;
  if (row.lastRating !== null) state.lastRating = row.lastRating;
  if (row.confidence !== null) state.confidence = row.confidence;
  if (fsrsCard) state.fsrsCard = fsrsCard;
  if (row.interviewPattern !== null) state.interviewPattern = row.interviewPattern;
  if (row.timeComplexity !== null) state.timeComplexity = row.timeComplexity;
  if (row.spaceComplexity !== null) state.spaceComplexity = row.spaceComplexity;
  if (row.languages !== null) state.languages = row.languages;
  if (row.notes !== null) state.notes = row.notes;
  return state;
}

function toAttempt(row: AttemptRow): AttemptHistoryEntry {
  const out: AttemptHistoryEntry = {
    reviewedAt: row.reviewedAt,
    rating: row.rating as Rating,
    mode: row.mode as ReviewMode,
  };
  if (row.solveTimeMs !== null) out.solveTimeMs = row.solveTimeMs;
  if (row.logSnapshot) out.logSnapshot = row.logSnapshot as ReviewLogFields;
  return out;
}

function buildFsrsCard(row: StudyStateRow): FsrsCardSnapshot | undefined {
  if (
    row.fsrsDue === null ||
    row.fsrsStability === null ||
    row.fsrsDifficulty === null ||
    row.fsrsElapsedDays === null ||
    row.fsrsScheduledDays === null ||
    row.fsrsLearningSteps === null ||
    row.fsrsReps === null ||
    row.fsrsLapses === null ||
    row.fsrsState === null
  ) {
    return undefined;
  }
  const card: FsrsCardSnapshot = {
    due: row.fsrsDue,
    stability: row.fsrsStability,
    difficulty: row.fsrsDifficulty,
    elapsedDays: row.fsrsElapsedDays,
    scheduledDays: row.fsrsScheduledDays,
    learningSteps: row.fsrsLearningSteps,
    reps: row.fsrsReps,
    lapses: row.fsrsLapses,
    state: row.fsrsState,
  };
  if (row.fsrsLastReview !== null) card.lastReview = row.fsrsLastReview;
  return card;
}

/** Domain StudyState → schema insert payload for the study_states row.
 * Attempt history is NOT included here — append it separately via
 * `appendAttempt` so the append-only history isn't recreated on every
 * write. */
function toRow(slug: string, state: StudyState): StudyStateInsert {
  const card = state.fsrsCard;
  return {
    problemSlug: slug,
    suspended: state.suspended,
    tags: state.tags,
    bestTimeMs: state.bestTimeMs ?? null,
    lastSolveTimeMs: state.lastSolveTimeMs ?? null,
    lastRating: state.lastRating ?? null,
    confidence: state.confidence ?? null,
    fsrsDue: card?.due ?? null,
    fsrsStability: card?.stability ?? null,
    fsrsDifficulty: card?.difficulty ?? null,
    fsrsElapsedDays: card?.elapsedDays ?? null,
    fsrsScheduledDays: card?.scheduledDays ?? null,
    fsrsLearningSteps: card?.learningSteps ?? null,
    fsrsReps: card?.reps ?? null,
    fsrsLapses: card?.lapses ?? null,
    fsrsState: card?.state ?? null,
    fsrsLastReview: card?.lastReview ?? null,
    interviewPattern: state.interviewPattern ?? null,
    timeComplexity: state.timeComplexity ?? null,
    spaceComplexity: state.spaceComplexity ?? null,
    languages: state.languages ?? null,
    notes: state.notes ?? null,
    createdAt: state.createdAt ?? nowIso(),
    updatedAt: state.updatedAt ?? nowIso(),
  };
}

function toAttemptRow(slug: string, entry: AttemptHistoryEntry): AttemptInsert {
  return {
    problemSlug: slug,
    reviewedAt: entry.reviewedAt,
    rating: entry.rating,
    solveTimeMs: entry.solveTimeMs ?? null,
    mode: entry.mode,
    logSnapshot: entry.logSnapshot ?? null,
  };
}

/** Lookup by slug; undefined when no row (the lazy-materialised case). */
export async function getStudyState(
  db: Db,
  slug: ProblemSlug,
): Promise<StudyState | undefined> {
  const [stateRow] = await db
    .select()
    .from(schema.studyStates)
    .where(eq(schema.studyStates.problemSlug, slug));
  if (!stateRow) return undefined;
  const attempts = await db
    .select()
    .from(schema.attemptHistory)
    .where(eq(schema.attemptHistory.problemSlug, slug))
    .orderBy(asc(schema.attemptHistory.reviewedAt));
  return toStudyState(stateRow, attempts);
}

/**
 * Returns every study state keyed by problem slug. Used by handler
 * hydration to fill `data.studyStatesBySlug` for view-layer
 * consumers (libraryRows, buildStudySetView, etc.).
 *
 * Uses ONE query each for states + attempts and joins in memory so
 * we don't end up running n+1 selects across hundreds of problems.
 */
export async function listStudyStates(
  db: Db,
): Promise<Record<string, StudyState>> {
  const [stateRows, attemptRows] = [
    await db.select().from(schema.studyStates),
    await db
      .select()
      .from(schema.attemptHistory)
      .orderBy(asc(schema.attemptHistory.reviewedAt)),
  ];
  const attemptsBySlug = new Map<string, AttemptRow[]>();
  for (const a of attemptRows) {
    const bucket = attemptsBySlug.get(a.problemSlug);
    if (bucket) bucket.push(a);
    else attemptsBySlug.set(a.problemSlug, [a]);
  }
  const out: Record<string, StudyState> = {};
  for (const row of stateRows) {
    out[row.problemSlug] = toStudyState(
      row,
      attemptsBySlug.get(row.problemSlug) ?? [],
    );
  }
  return out;
}

/**
 * Write the study_states row. Insert-or-update by problem_slug PK.
 * Attempt history is NOT touched here — the append-only log is
 * managed independently via `appendAttempt`. Returns the round-tripped
 * value (charter lesson #6) so the caller's next read matches.
 *
 * Throws if the FK references a non-existent problem.
 */
export async function upsertStudyState(
  db: Db,
  slug: ProblemSlug,
  state: StudyState,
): Promise<StudyState> {
  const row = toRow(slug, { ...state, updatedAt: nowIso() });
  await db
    .insert(schema.studyStates)
    .values(row)
    .onConflictDoUpdate({
      target: schema.studyStates.problemSlug,
      set: {
        suspended: row.suspended,
        tags: row.tags,
        bestTimeMs: row.bestTimeMs,
        lastSolveTimeMs: row.lastSolveTimeMs,
        lastRating: row.lastRating,
        confidence: row.confidence,
        fsrsDue: row.fsrsDue,
        fsrsStability: row.fsrsStability,
        fsrsDifficulty: row.fsrsDifficulty,
        fsrsElapsedDays: row.fsrsElapsedDays,
        fsrsScheduledDays: row.fsrsScheduledDays,
        fsrsLearningSteps: row.fsrsLearningSteps,
        fsrsReps: row.fsrsReps,
        fsrsLapses: row.fsrsLapses,
        fsrsState: row.fsrsState,
        fsrsLastReview: row.fsrsLastReview,
        interviewPattern: row.interviewPattern,
        timeComplexity: row.timeComplexity,
        spaceComplexity: row.spaceComplexity,
        languages: row.languages,
        notes: row.notes,
        updatedAt: row.updatedAt,
      },
    });
  const fresh = await getStudyState(db, slug);
  if (!fresh) {
    throw new Error(
      `upsertStudyState: post-insert re-read returned undefined for "${slug}"`,
    );
  }
  return fresh;
}

/**
 * Append a single attempt to attempt_history. The study_states row
 * MUST already exist (FK constraint). Returns the inserted attempt
 * with its assigned id.
 */
export async function appendAttempt(
  db: Db,
  slug: ProblemSlug,
  entry: AttemptHistoryEntry,
): Promise<void> {
  await db.insert(schema.attemptHistory).values(toAttemptRow(slug, entry));
}

/**
 * Replace the most recent attempt for a slug. Used by
 * `overrideLastReviewResult` to correct a misclicked rating. If no
 * attempts exist yet, inserts as a fresh row. The id of the latest
 * attempt is preserved when updating — the row is mutated in place.
 *
 * Latest is defined by max(id), which is also max(reviewedAt) for
 * inserts that arrived in chronological order (autoincrement matches
 * insertion order). Out-of-order inserts shouldn't happen — review
 * events are append-only by construction.
 */
export async function replaceLastAttempt(
  db: Db,
  slug: ProblemSlug,
  entry: AttemptHistoryEntry,
): Promise<void> {
  const [latest] = await db
    .select()
    .from(schema.attemptHistory)
    .where(eq(schema.attemptHistory.problemSlug, slug))
    .orderBy(desc(schema.attemptHistory.id))
    .limit(1);
  if (latest) {
    await db
      .update(schema.attemptHistory)
      .set({
        reviewedAt: entry.reviewedAt,
        rating: entry.rating,
        solveTimeMs: entry.solveTimeMs ?? null,
        mode: entry.mode,
        logSnapshot: entry.logSnapshot ?? null,
      })
      .where(eq(schema.attemptHistory.id, latest.id));
  } else {
    await db.insert(schema.attemptHistory).values(toAttemptRow(slug, entry));
  }
}

/**
 * Materialise a default StudyState if one doesn't exist yet. The
 * Problem row MUST already exist (FK constraint on problem_slug).
 * Returns the resolved state — either the existing one or the freshly
 * created default.
 */
export async function ensureStudyState(
  db: Db,
  slug: ProblemSlug,
): Promise<StudyState> {
  const existing = await getStudyState(db, slug);
  if (existing) return existing;
  const fresh = createDefaultStudyState(nowIso());
  return upsertStudyState(db, slug, fresh);
}

/**
 * Wipe every attempt for a slug without touching the state row.
 * Used by the schedule-reset flow: a user resetting their FSRS
 * schedule expects the review history to be erased too (matches the
 * v7 `resetSchedule` semantics).
 */
export async function clearAttempts(
  db: Db,
  slug: ProblemSlug,
): Promise<void> {
  await db
    .delete(schema.attemptHistory)
    .where(eq(schema.attemptHistory.problemSlug, slug));
}

/**
 * Wipe ALL study states and attempt history across every slug. Used
 * by the user-facing "Reset study history" action in settings. Does
 * NOT touch problems / settings / topics — only the study layer is
 * cleared, matching the action's name and expectation.
 *
 * Order matters: attempt_history is wiped first to avoid relying on
 * FK CASCADE (works either way, but explicit is clearer).
 */
export async function clearAllStudyHistory(db: Db): Promise<void> {
  await db.delete(schema.attemptHistory);
  await db.delete(schema.studyStates);
}

/**
 * Drop a study state and its attempt history. Triggered when a
 * Problem is removed (handled implicitly by FK CASCADE) or by an
 * explicit user reset. Throws if no row to delete — callers can
 * pre-check via `getStudyState` for the soft path.
 */
export async function removeStudyState(
  db: Db,
  slug: ProblemSlug,
): Promise<void> {
  const result = await db
    .delete(schema.studyStates)
    .where(eq(schema.studyStates.problemSlug, slug))
    .returning();
  if (result.length === 0) {
    throw new Error(
      `removeStudyState: no study state with slug "${slug}" to remove`,
    );
  }
}

/**
 * Listing helper for the attempt history UI. Returns attempts for a
 * single slug ordered chronologically. `limit` caps the result;
 * `descending=true` reverses for "most recent first" rendering.
 */
export async function listAttempts(
  db: Db,
  slug: ProblemSlug,
  opts: { limit?: number; descending?: boolean } = {},
): Promise<AttemptHistoryEntry[]> {
  let query = db
    .select()
    .from(schema.attemptHistory)
    .where(eq(schema.attemptHistory.problemSlug, slug))
    .orderBy(asc(schema.attemptHistory.reviewedAt))
    .$dynamic();
  if (opts.limit !== undefined) query = query.limit(opts.limit);
  const rows = await query;
  const mapped = rows.map(toAttempt);
  if (opts.descending) mapped.reverse();
  return mapped;
}

export { asProblemSlug };
