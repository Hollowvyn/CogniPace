import type { Track } from "./Track";
import type { TrackGroupWithProblems } from "./TrackGroupWithProblems";

/** Composite shape returned by the tracks repo's relational reads. */
export interface TrackWithGroups extends Track {
  groups: ReadonlyArray<TrackGroupWithProblems>;
}
