
import type { ActiveTrackView } from "./ActiveTrackView";
import type { PopupViewData } from "./PopupViewData";
import type { UserSettings } from "@features/settings";

export interface PopupShellPayload {
  settings: UserSettings;
  popup: PopupViewData;
  /** Detailed view of the active Track for dashboard surfaces. */
  activeTrack: ActiveTrackView | null;
}
