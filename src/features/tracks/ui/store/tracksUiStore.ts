import { subscribeToTick } from "@libs/event-bus";
import { useEffect } from "react";
import { create } from "zustand";

import { tracksRepository } from "../../data/repository/TracksRepository";

import { INITIAL_TRACKS_UI_STATE, type TracksUiState } from "./TracksUiState";

import type { TracksUiIntent } from "./TracksUiIntent";
import type { TrackGroupId, TrackId } from "@shared/ids";

// ─── Store shape ─────────────────────────────────────────────────────────────

export interface TracksUiStore extends TracksUiState {
  dispatchIntent: (intent: TracksUiIntent) => void;
  load: () => Promise<void>;
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
      const { tracks, activeTrack, settings } = await tracksRepository.getTracks();

      set({
        tracks,
        activeTrack,
        settings,
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
