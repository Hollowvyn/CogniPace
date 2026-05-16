import type { Track } from "../../domain/model";
import type { TrackGroupId, TrackId } from "@shared/ids";

export interface TracksUiState {
  // Data from repositories
  tracks: Track[];
  activeTrackId: TrackId | null;
  activeTrack: Track | null;

  // Canonical UI interaction state
  selectedGroupId: TrackGroupId | null;

  // Async operation state
  isLoading: boolean;
  error: string | null;
}

export const INITIAL_TRACKS_UI_STATE: TracksUiState = {
  tracks: [],
  activeTrackId: null,
  activeTrack: null,
  selectedGroupId: null,
  isLoading: false,
  error: null,
};
