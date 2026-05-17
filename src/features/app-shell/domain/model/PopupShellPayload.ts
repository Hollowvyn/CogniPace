import type { PopupViewData } from "./PopupViewData";
import type { Problem } from "@features/problems";
import type { UserSettings } from "@features/settings";
import type { Track } from "@features/tracks";

export interface PopupShellPayload {
  settings: UserSettings;
  popup: PopupViewData;
  /** Every problem in the user's library as domain aggregates. */
  problems: Problem[];
  /** Active Track aggregate with ordered groups and problems. */
  activeTrack: Track | null;
}
