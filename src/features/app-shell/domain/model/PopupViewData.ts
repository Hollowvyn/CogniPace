import type { RecommendedProblemView } from "@features/problems";
import type { TrackCardView, TrackQuestionView } from "@features/tracks";

export interface PopupViewData {
  dueCount: number;
  streakDays: number;
  recommended: RecommendedProblemView | null;
  recommendedCandidates: RecommendedProblemView[];
  /** Next question on the user's active Track. */
  trackNext: TrackQuestionView | null;
  /** Compact card view of the active Track. */
  activeTrack: TrackCardView | null;
}
