/** Popup-local state and actions for the recommendation-first surface. */
import {
  settingsRepository,
  setStudyMode as setStudyModeUsecase,
} from "@features/settings";
import { startTransition, useMemo, useRef, useState } from "react";

import { fetchPopupShellPayload } from "../../../data/repositories/appShellRepository";
import {
  openDashboardPage,
  openSettingsPage,
} from "../../../data/repositories/extensionNavigationRepository";
import { openProblemPage } from "../../../data/repositories/problemSessionRepository";
import { StudyMode } from "../../../domain/types";
import { RecommendedProblemView } from "../../../domain/views";
import { createMockPopupShellPayload } from "../../mockData";
import { useAppShellQuery } from "../../state/useAppShellQuery";

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

function popupErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  return "Failed to update study mode.";
}

/** Coordinates popup data loading, recommendation rotation, and user actions. */
export function usePopupController() {
  const mockPayload = useMemo(() => createMockPopupShellPayload(), []);
  const { load, payload, setPayload, setStatus, status } = useAppShellQuery(
    mockPayload,
    fetchPopupShellPayload
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
    courseId?: string;
    chapterId?: string;
  }): Promise<void> {
    const response = await openProblemPage(target);
    if (!response.ok) {
      setStatus({
        message: response.error ?? "Failed to open problem.",
        isError: true,
        scope: target.courseId ? "course" : "recommendation",
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
      scope: "course",
    });

    // Hook → Usecase → Repository → Client → SW → DataSource → DB.
    let saved;
    try {
      saved = await setStudyModeUsecase(settingsRepository, mode);
    } catch (error) {
      studyModeWriteInFlightRef.current = false;
      setPendingStudyMode(null);
      setStatus({
        message: popupErrorMessage(error),
        isError: true,
        scope: "course",
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
      scope: "course",
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
