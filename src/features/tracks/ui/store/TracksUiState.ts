import { createInitialUserSettings } from "@features/settings";

import type { Track } from "../../domain/model";
import type { UserSettings } from "@features/settings";
import type { TrackGroupId } from "@shared/ids";

export interface TracksUiState {
  // Data from repositories
  tracks: Track[];
  activeTrack: Track | null;
  settings: UserSettings;

  // Canonical UI interaction state
  selectedGroupId: TrackGroupId | null;

  // Async operation state
  isLoading: boolean;
  error: string | null;
}

export const INITIAL_TRACKS_UI_STATE: TracksUiState = {
  tracks: [],
  activeTrack: null,
  settings: createInitialUserSettings(),
  selectedGroupId: null,
  isLoading: false,
  error: null,
};
