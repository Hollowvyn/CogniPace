/**
 * ActiveFocus — the user's currently selected work surface. Lives on
 * UserSettings (replaces v6 `activeTrackId`). The `kind` discriminator is
 * kept for forward-compat with future variants (e.g. `{ kind: 'queue' }`).
 */
import type { TrackGroupId, TrackId } from "../common/ids";

export type ActiveFocus =
  | {
      readonly kind: "track";
      id: TrackId;
      /** Optional: when the focused Track is grouped, which group is active. */
      groupId?: TrackGroupId;
    }
  | null;
