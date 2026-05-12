import type { Brand } from "./utils/Brand";

/** Identifier for a Track. Curated tracks use slug-style ids; user
 *  tracks use UUIDs. The brand is the same regardless of origin. */
export type TrackId = Brand<string, "TrackId">;

/** Brand a slug-style or UUID string as a Track id. */
export function asTrackId(value: string): TrackId {
  return value.trim() as TrackId;
}

/** Generate a fresh UUID-based Track id (for user-created tracks). */
export function newTrackId(): TrackId {
  return crypto.randomUUID() as TrackId;
}
