import type { ComputeTrackProgressInput } from "./ComputeTrackProgressInput";
import type { GroupCompletion } from "./GroupCompletion";
import type { ProblemSlug, TrackGroupId, TrackId } from "@shared/ids";

export interface TrackProgress {
  trackId: TrackId;
  completedSlugs: ProblemSlug[];
  startedAt: string | null;
  lastInteractedAt: string | null;
  /** Per-group completion counts. Used for `Topic · 5/10` tab labels. */
  groupCompletion: Record<TrackGroupId, GroupCompletion>;
}

/** Derived view; recomputed each read from study_states + attempt_history.
 *  No stored progress aggregate. */
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
          if (
            lastInteractedAt === null ||
            attempt.reviewedAt > lastInteractedAt
          ) {
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
