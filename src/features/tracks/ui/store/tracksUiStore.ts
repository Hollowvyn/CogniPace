import { tracksRepository } from "../../data/repository/TracksRepository";
import { getStudyStateSummary } from "@libs/fsrs/studyState";
import { problemRepository } from "@features/problems/data/repository/ProblemRepository";
import { subscribeToTick } from "@libs/event-bus";
import { useEffect } from "react";
import { create } from "zustand";
import type { TrackGroupId, TrackId } from "@shared/ids";

import type { TracksUiIntent } from "./TracksUiIntent";
import { INITIAL_TRACKS_UI_STATE, type TracksUiState } from "./TracksUiState";

// ─── Store shape ─────────────────────────────────────────────────────────────

export interface TracksUiStore extends TracksUiState {
  dispatchIntent: (intent: TracksUiIntent) => void;
  load: () => Promise<void>;
}

// ─── Pure helpers (no store access) ──────────────────────────────────────────

function computeActiveTrackDueCount(
  activeTrack: TracksUiState["activeTrack"],
  library: TracksUiState["library"],
): number {
  if (!activeTrack) return 0;
  const trackSlugs = new Set<string>();
  for (const group of activeTrack.groups) {
    for (const problem of group.problems) trackSlugs.add(problem.slug);
  }
  const now = new Date();
  let count = 0;
  for (const problem of library) {
    if (trackSlugs.has(problem.slug) && problem.studyState) {
      if (getStudyStateSummary(problem.studyState, now).isDue) count++;
    }
  }
  return count;
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useTracksUiStore = create<TracksUiStore>((set, get) => {
  // ── Actions ──────────────────────────────────────────────────────────────

  function selectGroup(groupId: TrackGroupId): void {
    set({ selectedGroupId: groupId });
  }

  function switchTrack(trackId: TrackId): void {
    void tracksRepository.setActiveTrack(trackId);
  }

  function stopTrack(): void {
    void tracksRepository.setActiveTrack(null);
  }

  // ── Load ─────────────────────────────────────────────────────────────────

  async function load(): Promise<void> {
    if (get().isLoading) return;
    set({ isLoading: true, error: null });

    try {
      const [{ tracks, activeTrackId, activeTrack }, library] = await Promise.all([
        tracksRepository.getTracks(),
        problemRepository.getLibrary(),
      ]);

      set({
        tracks,
        activeTrackId,
        activeTrack,
        library,
        activeTrackDueCount: computeActiveTrackDueCount(activeTrack, library),
        isLoading: false,
      });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : "Failed to load tracks",
      });
    }
  }

  // ── Intent dispatch ───────────────────────────────────────────────────────

  function dispatchIntent(intent: TracksUiIntent): void {
    switch (intent.type) {
      case "SELECT_TRACK_GROUP":  selectGroup(intent.groupId); break;
      case "SWITCH_TRACK":  switchTrack(intent.trackId); break;
      case "STOP_TRACK":    stopTrack(); break;
    }
  }

  return {
    ...INITIAL_TRACKS_UI_STATE,
    dispatchIntent,
    load,
  };
});

// ─── Auto-refresh hook ────────────────────────────────────────────────────────

export function useTracksAutoRefresh(): void {
  const load = useTracksUiStore(s => s.load);
  useEffect(() => {
    return subscribeToTick(() => {
      void load().catch(err => console.error("[TracksStore] refresh failed:", err));
    });
  }, [load]);
}
