/**
 * StudyState aggregate repository — pure mutators on AppDataV7 drafts.
 *
 * StudyState is sparse: a Problem can exist with no row in
 * `studyStatesBySlug`. Calling `recordReview` is the materialisation
 * point; before that, the slug simply has no study state and views
 * render "not started".
 *
 * The FSRS algorithm itself lives in `domain/fsrs/scheduler.ts` and is
 * unchanged. This repository wraps `applyReview` so the v7 StudyState
 * shape (with `createdAt`/`updatedAt`) round-trips correctly.
 */
import type { AppDataV7 } from "../../../domain/data/appDataV7";
import { applyReview, overrideLastReview } from "../../../domain/fsrs/scheduler";
import type { StudyState } from "../../../domain/study-state/model";
import { createDefaultStudyState } from "../../../domain/study-state/defaults";
import type {
  Rating,
  ReviewLogFields,
  ReviewMode,
  UserSettings,
} from "../../../domain/types";
import {
  asProblemSlug,
  type ProblemSlug,
} from "../../../domain/common/ids";

export interface RecordReviewArgs {
  slug: string;
  rating: Rating;
  solveTimeMs?: number;
  mode?: ReviewMode;
  logSnapshot?: ReviewLogFields;
  settings: UserSettings;
}

/**
 * Apply a review rating to a problem's StudyState. Materialises the
 * StudyState lazily — the row only appears in `studyStatesBySlug` after
 * this call. Throws if `settings.timing.requireSolveTime` is true and no
 * `solveTimeMs` is supplied (matches existing FSRS scheduler contract).
 */
export function recordReview(
  data: AppDataV7,
  args: RecordReviewArgs,
  now: string,
): AppDataV7 {
  const slug: ProblemSlug = asProblemSlug(args.slug);
  if (!slug) return data;

  const existing = data.studyStatesBySlug[slug];
  const problem = data.problemsBySlug[slug];
  // The scheduler accepts the v6 StudyState shape; the v7 shape is a
  // structural superset (adds createdAt/updatedAt). We pass a copy
  // through and stitch timestamps back on after.
  const updated = applyReview({
    state: existing,
    difficulty: problem?.difficulty,
    rating: args.rating,
    solveTimeMs: args.solveTimeMs,
    mode: args.mode,
    logSnapshot: args.logSnapshot,
    settings: args.settings,
    now,
  });

  data.studyStatesBySlug[slug] = stitchTimestamps(existing, updated, now);
  return data;
}

export interface OverrideLastReviewArgs {
  slug: string;
  rating: Rating;
  solveTimeMs?: number;
  mode?: ReviewMode;
  logSnapshot?: ReviewLogFields;
  settings: UserSettings;
}

/** Adjust the most recent review entry. Throws if no prior review exists. */
export function overrideLastReviewForSlug(
  data: AppDataV7,
  args: OverrideLastReviewArgs,
  now: string,
): AppDataV7 {
  const slug: ProblemSlug = asProblemSlug(args.slug);
  const existing = data.studyStatesBySlug[slug];
  if (!existing) return data;
  const updated = overrideLastReview({
    state: existing,
    rating: args.rating,
    solveTimeMs: args.solveTimeMs,
    mode: args.mode,
    logSnapshot: args.logSnapshot,
    settings: args.settings,
    now,
  });
  data.studyStatesBySlug[slug] = stitchTimestamps(existing, updated, now);
  return data;
}

/** Suspend a problem (FSRS pauses scheduling). Materialises if needed. */
export function suspend(
  data: AppDataV7,
  slug: string,
  now: string,
): AppDataV7 {
  const branded = asProblemSlug(slug);
  const existing = data.studyStatesBySlug[branded] ?? createDefaultStudyState(now);
  data.studyStatesBySlug[branded] = {
    ...existing,
    suspended: true,
    updatedAt: now,
  };
  return data;
}

/** Resume a previously suspended problem. */
export function resume(
  data: AppDataV7,
  slug: string,
  now: string,
): AppDataV7 {
  const branded = asProblemSlug(slug);
  const existing = data.studyStatesBySlug[branded];
  if (!existing) return data;
  data.studyStatesBySlug[branded] = {
    ...existing,
    suspended: false,
    updatedAt: now,
  };
  return data;
}

/** Update the user-managed personal `tags`. */
export function setTags(
  data: AppDataV7,
  slug: string,
  tags: string[],
  now: string,
): AppDataV7 {
  const branded = asProblemSlug(slug);
  const existing = data.studyStatesBySlug[branded] ?? createDefaultStudyState(now);
  data.studyStatesBySlug[branded] = {
    ...existing,
    tags: [...tags],
    updatedAt: now,
  };
  return data;
}

/** Read-only convenience. Returns undefined when not yet materialised. */
export function getStudyState(
  data: AppDataV7,
  slug: ProblemSlug,
): StudyState | undefined {
  return data.studyStatesBySlug[slug];
}

/**
 * Internal: ensure the v7 timestamps survive a round-trip through the
 * v6-shaped FSRS scheduler. The scheduler returns a structurally-broader
 * StudyState; we attach `createdAt` from the existing record (or fall
 * back to `now` when materialising) and bump `updatedAt`.
 */
function stitchTimestamps(
  existing: StudyState | undefined,
  scheduled: Omit<StudyState, "createdAt" | "updatedAt"> & {
    createdAt?: string;
    updatedAt?: string;
  },
  now: string,
): StudyState {
  return {
    ...scheduled,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}
