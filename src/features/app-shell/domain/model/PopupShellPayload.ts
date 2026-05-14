import type { PopupViewData } from "./PopupViewData";
import type { UserSettings } from "@features/settings";
import type { ActiveTrackView } from "@features/tracks";

export interface PopupShellPayload {
  settings: UserSettings;
  popup: PopupViewData;
  /** Detailed view of the active Track for dashboard surfaces. */
  activeTrack: ActiveTrackView | null;
}
