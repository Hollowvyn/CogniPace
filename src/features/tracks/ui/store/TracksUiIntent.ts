import type { TrackGroupId, TrackId } from "@shared/ids";

export type TracksUiIntent =
  | { type: "SELECT_TRACK_GROUP"; groupId: TrackGroupId }
  | { type: "SWITCH_TRACK"; trackId: TrackId }
  | { type: "STOP_TRACK" };
