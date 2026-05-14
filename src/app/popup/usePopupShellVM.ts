/** PopupShell's ViewModel — owns popup data fetching, recommendation
 *  rotation, and user-action intents per the canonical Screen+VM
 *  pattern (one Model object per render; intents are methods). */
import { useDI } from "@app/di";
import { appShellRepository, createMockPopupShellPayload, useAppShellQuery } from "@features/app-shell";
import { openProblemPage, RecommendedProblemView } from "@features/problems";
import { StudyMode } from "@features/settings";
import { startTransition, useMemo, useRef, useState } from "react";

import {
  openDashboardPage,
  openSettingsPage,
} from "../../data/repositories/extensionNavigationRepository";

function currentRecommended(
  candidates: RecommendedProblemView[],
  fallback: RecommendedProblemView | null,
  recommendedIndex: number
): RecommendedProblemView | null {
  if (candidates.length === 0) {
    return fallback;
  }

  return candidates[recommendedIndex % candidates.length] ?? candidates[0];
}

/** Module-level fetcher so its identity is stable across renders.
 *  Inlining `() => appShellRepository.fetchPopupShell()` as the
 *  `useAppShellQuery` argument made the function new each render,
 *  which made `load` new each render, which made the tick-subscription
 *  effect re-subscribe and re-fetch on every render — an infinite
 *  re-render loop the test "rolls back mode changes when runtime
 *  messaging rejects" surfaces. */
const fetchPopupShell = () => appShellRepository.fetchPopupShell();

function popupErrorMessage(error: unknown): string {
  return (error as Error).message || "Failed to update study mode.";
}

/** Coordinates popup data loading, recommendation rotation, and user actions. */
export function usePopupShellVM() {
  const { settingsRepository } = useDI();
  const mockPayload = useMemo(() => createMockPopupShellPayload(), []);
  const { load, payload, setPayload, setStatus, status } = useAppShellQuery(
    mockPayload,
    fetchPopupShell,
  );
  const [recommendedIndex, setRecommendedIndex] = useState(0);
  const [pendingStudyMode, setPendingStudyMode] = useState<StudyMode | null>(
    null
  );
  const studyModeWriteInFlightRef = useRef(false);
  const persistedStudyMode = payload?.settings.studyMode ?? "studyPlan";
  const studyMode = pendingStudyMode ?? persistedStudyMode;
  const isUpdatingStudyMode = pendingStudyMode !== null;

  const recommended = useMemo(
    () =>
      currentRecommended(
        payload?.popup.recommendedCandidates ?? [],
        payload?.popup.recommended ?? null,
        recommendedIndex
      ),
    [
      payload?.popup.recommended,
      payload?.popup.recommendedCandidates,
      recommendedIndex,
    ]
  );

  async function refresh(resetRecommendation = false): Promise<void> {
    if (resetRecommendation) {
      startTransition(() => {
        setRecommendedIndex(0);
      });
    }

    await load();
  }

  async function onOpenProblem(target: {
    slug: string;
    trackId?: string;
    groupId?: string;
  }): Promise<void> {
    try {
      await openProblemPage(target);
    } catch (err) {
      setStatus({
        message: (err as Error).message || "Failed to open problem.",
        isError: true,
        scope: target.trackId ? "track" : "recommendation",
      });
    }
  }

  async function setStudyMode(mode: StudyMode): Promise<void> {
    if (studyMode === mode || studyModeWriteInFlightRef.current) {
      return;
    }

    studyModeWriteInFlightRef.current = true;
    setPendingStudyMode(mode);
    setStatus({
      message: "",
      isError: false,
      scope: "track",
    });

    // Hook → Repository → Client → SW → DataSource → DB.
    let saved;
    try {
      saved = await settingsRepository.setStudyMode(mode);
    } catch (error) {
      studyModeWriteInFlightRef.current = false;
      setPendingStudyMode(null);
      setStatus({
        message: popupErrorMessage(error),
        isError: true,
        scope: "track",
      });
      return;
    }

    setPayload((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        settings: saved,
      };
    });
    studyModeWriteInFlightRef.current = false;
    setPendingStudyMode(null);
    setStatus({
      message:
        mode === "freestyle"
          ? "Freestyle active. The course card stays available so you can jump back into the guided path."
          : "Study mode active. Your next guided question is ready below.",
      isError: false,
      scope: "track",
    });
  }

  return {
    activeTrackDetail: payload?.activeTrack ?? null,
    activeTrack: payload?.popup.activeTrack ?? null,
    trackNext: payload?.popup.trackNext ?? null,
    hasMultipleRecommended:
      (payload?.popup.recommendedCandidates.length ?? 0) > 1,
    isInitialLoading: payload === null && !status.message,
    isUpdatingStudyMode,
    isCourseMode: studyMode === "studyPlan",
    studyMode,
    onOpenDashboard: openDashboardPage,
    openTracksDashboard: () => {
      openDashboardPage("tracks");
    },
    onOpenProblem,
    onOpenSettings: openSettingsPage,
    payload,
    recommended,
    refresh,
    setStudyMode,
    setRecommendedIndex,
    shuffleRecommendation: () => {
      startTransition(() => {
        setRecommendedIndex((current) => {
          const count = payload?.popup.recommendedCandidates.length ?? 1;
          return (current + 1) % count;
        });
      });
    },
    status,
  };
}
