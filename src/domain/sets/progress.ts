/**
 * StudySetProgress aggregate — captures the user's progress through a
 * specific StudySet. Lazily created when a user first focuses on a Set,
 * lifecycle is independent from the Set itself.
 */
import type {
  ProblemSlug,
  SetGroupId,
  StudySetId,
} from "../common/ids";

export interface SetGroupProgress {
  groupId: SetGroupId;
  completedSlugs: ProblemSlug[];
  lastInteractedAt?: string;
}

export interface StudySetProgress {
  setId: StudySetId;
  activeGroupId?: SetGroupId;
  startedAt: string;
  lastInteractedAt: string;
  /** Per-group progress, keyed by SetGroup.id. */
  groupProgressById: Record<string, SetGroupProgress>;
  /** Aggregate across all groups, for quick "% complete" rendering. */
  completedSlugs: ProblemSlug[];
}
