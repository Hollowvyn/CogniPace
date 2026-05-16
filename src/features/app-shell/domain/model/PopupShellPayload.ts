import type { PopupViewData } from "./PopupViewData";
import type { Problem } from "@features/problems";
import type { UserSettings } from "@features/settings";
import type { Track } from "@features/tracks";
import type { TrackId } from "@shared/ids";

export interface PopupShellPayload {
  settings: UserSettings;
  popup: PopupViewData;
  /** Every problem in the user's library as domain aggregates. */
  problems: Problem[];
  /** ID of the user's currently-focused track. */
  activeTrackId: TrackId | null;
  /** Active Track aggregate with ordered groups and problems. */
  activeTrack: Track | null;
}
