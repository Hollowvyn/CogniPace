import { Rating } from "../../../../../domain/types";

export interface OverlaySubmitDecisionInput {
  elapsedMs: number;
  explicitRating?: Rating;
  forceLock?: boolean;
  goalMs: number;
  hardMode: boolean;
  selectedRating: Rating;
}

export interface OverlaySubmitDecision {
  lockFailureRating: boolean;
  rating: Rating;
}

export function deriveOverlaySubmitDecision(
  input: OverlaySubmitDecisionInput
): OverlaySubmitDecision {
  const isHardModeOvertime = input.hardMode && input.elapsedMs > input.goalMs;

  if (isHardModeOvertime) {
    return {
      lockFailureRating: true,
      rating: 0,
    };
  }

  return {
    lockFailureRating: input.forceLock === true,
    rating: input.explicitRating ?? input.selectedRating,
  };
}
