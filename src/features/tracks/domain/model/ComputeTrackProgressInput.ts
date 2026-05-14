import type { StudyState } from "@features/study";
import type { ProblemSlug, TrackGroupId, TrackId } from "@shared/ids";

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
