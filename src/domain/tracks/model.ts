/**
 * Track aggregate — the slim, charter-pure replacement for the legacy
 * StudySet. A Track is just a named, ordered collection of TrackGroups;
 * each group holds an ordered list of ProblemSlug FKs. There is no kind
 * discriminator, no filter union, no prerequisite DAG. Curated catalogs
 * (Blind75, NeetCode150, etc.) become Tracks with one group per topic;
 * user-created flat lists become Tracks with a single group.
 *
 * Progress is derived from `study_states` + `attempt_history` at read
 * time — there is no `StudySetProgress` aggregate any more.
 */
import type {
  ProblemSlug,
  TopicId,
  TrackGroupId,
  TrackId,
} from "@shared/ids";

export interface Track {
  readonly id: TrackId;
  name: string;
  description?: string;
  /** Whether the queue draws problems from this track. */
  enabled: boolean;
  /** Curated tracks are protected from user delete/rename. */
  isCurated: boolean;
  /** Position in the user-facing track list; lower comes first. */
  orderIndex?: number;
  readonly createdAt: string;
  updatedAt: string;
}

export interface TrackGroup {
  readonly id: TrackGroupId;
  readonly trackId: TrackId;
  /** Optional FK → Topic registry when the group represents a curated topic. */
  topicId?: TopicId;
  /** Display label override; falls back to the topic name (when topicId is set)
   * or the parent track's name. */
  name?: string;
  description?: string;
  /** Sort order within the parent track. */
  orderIndex: number;
}

export interface TrackGroupProblem {
  readonly groupId: TrackGroupId;
  readonly problemSlug: ProblemSlug;
  orderIndex: number;
}

/** Composite shape returned by the tracks repo's relational reads. */
export interface TrackWithGroups extends Track {
  groups: ReadonlyArray<TrackGroupWithProblems>;
}

export interface TrackGroupWithProblems extends TrackGroup {
  problems: ReadonlyArray<TrackGroupProblem>;
}
