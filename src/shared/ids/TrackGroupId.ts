import type { Brand } from "./utils/Brand";

/** UUID-based identifier for a TrackGroup. */
export type TrackGroupId = Brand<string, "TrackGroupId">;

/** Brand a UUID string as a TrackGroup id. */
export function asTrackGroupId(value: string): TrackGroupId {
  return value.trim() as TrackGroupId;
}

/** Generate a fresh UUID-based TrackGroup id. */
export function newTrackGroupId(): TrackGroupId {
  return crypto.randomUUID() as TrackGroupId;
}
