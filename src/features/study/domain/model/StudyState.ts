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

/** Creates a fresh StudyState for a problem the user has just engaged
 *  with. The `now` parameter feeds createdAt/updatedAt — v7-required;
 *  v6 callers that don't care use the no-arg variant in
 *  `domain/common/constants.ts`. */
export function createDefaultStudyState(now: string): StudyState {
  return {
    suspended: false,
    tags: [],
    attemptHistory: [],
    createdAt: now,
    updatedAt: now,
  };
}
