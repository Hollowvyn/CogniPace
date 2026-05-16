import type { Track } from "../../domain/model";
import type { TrackGroupId } from "@shared/ids";

export interface TracksUiState {
  // Data from repositories
  tracks: Track[];
  activeTrack: Track | null;

  // Canonical UI interaction state
  selectedGroupId: TrackGroupId | null;

  // Async operation state
  isLoading: boolean;
  error: string | null;
}

export const INITIAL_TRACKS_UI_STATE: TracksUiState = {
  tracks: [],
  activeTrack: null,
  selectedGroupId: null,
  isLoading: false,
  error: null,
};
