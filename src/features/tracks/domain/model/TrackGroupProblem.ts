import type { ProblemSlug, TrackGroupId } from "@shared/ids";

export interface TrackGroupProblem {
  readonly groupId: TrackGroupId;
  readonly problemSlug: ProblemSlug;
  orderIndex: number;
}
