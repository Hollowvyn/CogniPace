import type { RecommendedProblemView } from "@features/problems";

export interface PopupViewData {
  dueCount: number;
  streakDays: number;
  recommended: RecommendedProblemView | null;
  recommendedCandidates: RecommendedProblemView[];
}
