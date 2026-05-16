import { asTrackGroupId } from "@shared/ids";

import type { TracksUiState } from "./TracksUiState";
import type { TrackView } from "../../domain/model";
import type { Problem } from "@features/problems";
import type { TrackGroupId } from "@shared/ids";

// Selectors operate on TracksUiState directly (flat store fields).
// Use as: useTracksUiStore(selectXxx)

export function selectOtherTracks(s: TracksUiState): TrackView[] {
  return s.tracks.filter(
    track => track.enabled && (!s.activeTrack || track.id !== s.activeTrack.id),
  );
}

export function selectActiveGroupId(s: TracksUiState): TrackGroupId | null {
  if (!s.activeTrack || s.activeTrack.groups.length === 0) return null;
  if (s.selectedGroupId && s.activeTrack.groups.some(g => g.id === s.selectedGroupId)) {
    return s.selectedGroupId;
  }
  return asTrackGroupId(s.activeTrack.groups[0]?.id ?? "");
}

export function selectLibraryBySlug(s: TracksUiState): Map<string, Problem> {
  return new Map(s.library.map(p => [p.slug, p]));
}
