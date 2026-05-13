/**
 * Track progress — derived view, not a stored aggregate. The legacy
 * `StudySetProgress` table is gone; "how far through this track is the
 * user" is recomputed from the user's review history each read.
 *
 * Definitions (charter `docs/drizzle-data-shape.md` § 8 follow-up):
 *   - completedSlugs: problems in the track whose `study_state` has at
 *     least one attempt with `rating > 0` (Hard / Good / Easy).
 *   - startedAt: MIN(attempt_history.reviewed_at) across the track's
 *     problems; null if the user has never attempted a problem in it.
 *   - lastInteractedAt: MAX(attempt_history.reviewed_at) across the
 *     track's problems; null when there is no history.
 *
 * `activeGroupId` is no longer part of the aggregate — the user's
 * "where am I" pointer lives on `UserSettings.activeFocus.groupId`.
 */
import type { StudyState } from "@features/study";
import type { ProblemSlug, TrackGroupId, TrackId } from "@shared/ids";

export interface TrackProgress {
  trackId: TrackId;
  completedSlugs: ProblemSlug[];
  startedAt: string | null;
  lastInteractedAt: string | null;
  /** Per-group completion counts. Used for `Topic · 5/10` tab labels. */
  groupCompletion: Record<TrackGroupId, GroupCompletion>;
}

export interface GroupCompletion {
  totalCount: number;
  completedCount: number;
}

export interface ComputeTrackProgressInput {
  trackId: TrackId;
  groups: ReadonlyArray<{
    id: TrackGroupId;
    problemSlugs: ReadonlyArray<ProblemSlug>;
  }>;
  /** Study states keyed by slug; only the slugs in this track need to be
   * present — extras are ignored. */
  studyStatesBySlug: Record<string, StudyState>;
}

/** Pure computation — no I/O. Repo composes the SQLite read then calls this. */
export function computeTrackProgress(
  input: ComputeTrackProgressInput,
): TrackProgress {
  const seen = new Set<ProblemSlug>();
  const completedSlugs: ProblemSlug[] = [];
  const groupCompletion: Record<TrackGroupId, GroupCompletion> = {};
  let startedAt: string | null = null;
  let lastInteractedAt: string | null = null;

  for (const group of input.groups) {
    let completedInGroup = 0;
    for (const slug of group.problemSlugs) {
      const study = input.studyStatesBySlug[slug];
      const completedHere = study
        ? study.attemptHistory.some((entry) => entry.rating > 0)
        : false;
      if (completedHere && !seen.has(slug)) {
        seen.add(slug);
        completedSlugs.push(slug);
      }
      if (completedHere) completedInGroup += 1;
      if (study && study.attemptHistory.length > 0) {
        for (const attempt of study.attemptHistory) {
          if (startedAt === null || attempt.reviewedAt < startedAt) {
            startedAt = attempt.reviewedAt;
          }
          if (lastInteractedAt === null || attempt.reviewedAt > lastInteractedAt) {
            lastInteractedAt = attempt.reviewedAt;
          }
        }
      }
    }
    groupCompletion[group.id] = {
      totalCount: group.problemSlugs.length,
      completedCount: completedInGroup,
    };
  }

  return {
    trackId: input.trackId,
    completedSlugs,
    startedAt,
    lastInteractedAt,
    groupCompletion,
  };
}
