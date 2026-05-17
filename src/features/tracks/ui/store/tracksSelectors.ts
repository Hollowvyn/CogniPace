import { asTrackGroupId } from "@shared/ids";

import type { TracksUiState } from "./TracksUiState";
import type { TrackGroupId } from "@shared/ids";


export function selectActiveGroupId(s: TracksUiState): TrackGroupId | null {
  if (!s.activeTrack || s.activeTrack.groups.length === 0) return null;
  if (s.selectedGroupId && s.activeTrack.groups.some(g => g.id === s.selectedGroupId)) {
    return s.selectedGroupId;
  }
  return asTrackGroupId(s.activeTrack.groups[0]?.id ?? "");
}
