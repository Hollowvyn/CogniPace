import type { TrackGroupId, TrackId } from "@shared/ids";

export type TracksUiIntent =
  | { type: "SELECT_TRACK_GROUP"; groupId: TrackGroupId }
  | { type: "EXPAND_COLLAPSE_OTHER_TRACKS" }
  | { type: "SWITCH_TRACK"; trackId: TrackId }
  | { type: "STOP_TRACK" };
