import type { AttemptHistoryEntry } from "./AttemptHistoryEntry";
import type { FsrsCardSnapshot } from "./FsrsCardSnapshot";
import type { Rating } from "./Rating";
import type { ReviewLogFields } from "./ReviewLogFields";

export interface StudyState extends ReviewLogFields {
  suspended: boolean;
  bestTimeMs?: number;
  lastSolveTimeMs?: number;
  lastRating?: Rating;
  confidence?: number;
  tags: string[];
  attemptHistory: AttemptHistoryEntry[];
  fsrsCard?: FsrsCardSnapshot;
  /** Optional in v6 callers; required in v7-aware code. */
  createdAt?: string;
  /** Optional in v6 callers; required in v7-aware code. */
  updatedAt?: string;
}
