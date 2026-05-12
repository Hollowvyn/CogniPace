import type { RecommendedProblemView } from "./RecommendedProblemView";
import type { TrackCardView } from "./TrackCardView";
import type { TrackQuestionView } from "./TrackQuestionView";

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
