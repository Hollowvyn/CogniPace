import type { Problem } from "@features/problems";
import type { TrackGroupId, TrackId } from "@shared/ids";
import type { TrackView } from "../../domain/model";

export interface TracksUiState {
  // Data from repositories
  tracks: TrackView[];
  activeTrackId: TrackId | null;
  activeTrack: TrackView | null;
  library: Problem[];

  // Computed in load()
  activeTrackDueCount: number;

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
  library: [],
  activeTrackDueCount: 0,
  selectedGroupId: null,
  isLoading: false,
  error: null,
};
