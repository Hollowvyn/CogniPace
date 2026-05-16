import type { AppShellPayload } from "../../domain/model/AppShellPayload";
import type { RecommendedProblemView } from "@features/problems";
import type { StudyMode } from "@features/settings";
import type { Track } from "@features/tracks";

export interface UseOverviewVMInput {
  payload: AppShellPayload | null;
  onOpenProblem: (target: {
    slug: string;
    groupId?: string;
    trackId?: string;
  }) => Promise<void>;
  onGoToTracks: () => void;
  onGoToSettings: () => void;
  onToggleMode: () => Promise<void>;
}

export interface OverviewScreenModel {
  recommended: RecommendedProblemView | null;
  activeTrack: Track | null;
  dueCount: number;
  streakDays: number;
  reviewCardCount: number;
  queueItems: AppShellPayload["queue"]["items"];
  studyMode: StudyMode;
  reviewOrder: string;
  onOpenProblem: UseOverviewVMInput["onOpenProblem"];
  onGoToTracks: () => void;
  onGoToSettings: () => void;
  onToggleMode: () => Promise<void>;
}

export function useOverviewVM(input: UseOverviewVMInput): OverviewScreenModel {
  const { payload } = input;

  const activeTrackEntity = payload?.tracks.find(t => t.id === payload.activeTrackId);

  return {
    recommended: payload?.popup.recommended ?? null,
    activeTrack: activeTrackEntity ?? null,
    dueCount: payload?.queue.dueCount ?? 0,
    streakDays: payload?.analytics.streakDays ?? 0,
    reviewCardCount: payload?.analytics.phaseCounts.Review ?? 0,
    queueItems: payload?.queue.items ?? [],
    studyMode: payload?.settings.studyMode ?? "studyPlan",
    reviewOrder: payload?.settings.memoryReview.reviewOrder ?? "dueFirst",
    onOpenProblem: input.onOpenProblem,
    onGoToTracks: input.onGoToTracks,
    onGoToSettings: input.onGoToSettings,
    onToggleMode: input.onToggleMode,
  };
}
