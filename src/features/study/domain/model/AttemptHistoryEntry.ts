import type { Rating } from "./Rating";
import type { ReviewLogFields } from "./ReviewLogFields";
import type { ReviewMode } from "./ReviewMode";

export interface AttemptHistoryEntry {
  reviewedAt: string;
  rating: Rating;
  solveTimeMs?: number;
  mode: ReviewMode;
  logSnapshot?: ReviewLogFields;
}
