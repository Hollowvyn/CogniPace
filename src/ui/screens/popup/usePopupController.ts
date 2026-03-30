/** Popup-local state and actions for the recommendation-first surface. */
import { startTransition, useMemo, useState } from "react";

import {
  openDashboardPage,
  openSettingsPage,
} from "../../../data/repositories/extensionNavigationRepository";
import { openProblemPage } from "../../../data/repositories/problemSessionRepository";
import { updateSettings } from "../../../data/repositories/settingsRepository";
import { RecommendedProblemView } from "../../../domain/views";
import { createMockAppShellPayload } from "../../mockData";
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

/** Coordinates popup data loading, recommendation rotation, and user actions. */
export function usePopupController() {
  const { load, payload, setStatus, status } = useAppShellQuery(
    createMockAppShellPayload()
  );
  const [recommendedIndex, setRecommendedIndex] = useState(0);

  const recommended = useMemo(
    () =>
      currentRecommended(
        payload?.popup.recommendedCandidates ?? [],
        payload?.popup.recommended ?? null,
        recommendedIndex
      ),
    [payload?.popup.recommended, payload?.popup.recommendedCandidates, recommendedIndex]
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
      });
    }
  }

  async function onToggleStudyMode(): Promise<void> {
    if (!payload) {
      return;
    }

    const nextMode =
      payload.settings.studyMode === "studyPlan" ? "freestyle" : "studyPlan";
    const response = await updateSettings({ studyMode: nextMode });
    if (!response.ok) {
      setStatus({
        message: response.error ?? "Failed to update study mode.",
        isError: true,
      });
      return;
    }

    await load();
  }

  return {
    activeCourse: payload?.popup.activeCourse ?? null,
    courseNext: payload?.popup.courseNext ?? null,
    hasMultipleRecommended:
      (payload?.popup.recommendedCandidates.length ?? 0) > 1,
    onOpenDashboard: openDashboardPage,
    onOpenProblem,
    onOpenSettings: openSettingsPage,
    onToggleStudyMode,
    payload,
    recommended,
    refresh,
    setRecommendedIndex,
    shuffleRecommendation: () => {
      setRecommendedIndex((current) => {
        const count = payload?.popup.recommendedCandidates.length ?? 1;
        return (current + 1) % count;
      });
    },
    status,
  };
}
