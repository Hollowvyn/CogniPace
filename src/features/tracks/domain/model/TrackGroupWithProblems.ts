import type { TrackGroup } from "./TrackGroup";
import type { TrackGroupProblem } from "./TrackGroupProblem";

export interface TrackGroupWithProblems extends TrackGroup {
  problems: ReadonlyArray<TrackGroupProblem>;
}
