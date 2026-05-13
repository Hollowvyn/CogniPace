/**
 * ActiveFocus — the user's currently selected work surface. Persisted
 * on UserSettings (replaces v6 `activeTrackId`). The `kind` discriminator
 * is kept as a single-variant union today; if a non-track focus ever
 * lands (`{ kind: 'queue' }`, etc.), it slots in as a new variant.
 *
 * Owned by tracks today because the only variant is track-shaped. If
 * non-track variants accrete, this can lift to a shared location.
 */
import type { TrackGroupId, TrackId } from "@shared/ids";

export type ActiveFocus =
  | {
      readonly kind: "track";
      id: TrackId;
      /** Optional: when the focused Track is grouped, which group is active. */
      groupId?: TrackGroupId;
    }
  | null;
