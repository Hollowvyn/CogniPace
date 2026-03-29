import { createDefaultStudyState } from "./constants";
import {
  getFsrsCard,
  getFsrsScheduler,
  serializeFsrsCard,
  toFsrsRating,
} from "./studyState";
import {
  AttemptHistoryEntry,
  Difficulty,
  Rating,
  ReviewMode,
  StudyState,
  UserSettings,
} from "./types";
import { nowIso } from "./utils";

export interface ApplyReviewInput {
  state?: StudyState;
  difficulty?: Difficulty;
  rating: Rating;
  solveTimeMs?: number;
  mode?: ReviewMode;
  notesSnapshot?: string;
  settings: UserSettings;
  now?: string;
}

export function applyReview(input: ApplyReviewInput): StudyState {
  const now = input.now ?? nowIso();
  const state = input.state ? { ...input.state } : createDefaultStudyState();

  if (
    input.settings.requireSolveTime &&
    typeof input.solveTimeMs !== "number"
  ) {
    throw new Error("Solve time is required by your settings.");
  }

  const scheduler = getFsrsScheduler();
  const currentCard = getFsrsCard(state, now);
  const nextCard = scheduler.repeat(currentCard, new Date(now))[
    toFsrsRating(input.rating)
  ].card;

  const historyEntry: AttemptHistoryEntry = {
    reviewedAt: now,
    rating: input.rating,
    solveTimeMs: input.solveTimeMs,
    mode: input.mode ?? "FULL_SOLVE",
    notesSnapshot: input.notesSnapshot,
  };

  return {
    ...state,
    suspended: false,
    lastRating: input.rating,
    lastSolveTimeMs: input.solveTimeMs,
    bestTimeMs:
      typeof input.solveTimeMs === "number"
        ? Math.min(
            state.bestTimeMs ?? Number.MAX_SAFE_INTEGER,
            input.solveTimeMs
          )
        : state.bestTimeMs,
    attemptHistory: [...state.attemptHistory, historyEntry],
    fsrsCard: serializeFsrsCard(nextCard),
  };
}

export function resetSchedule(
  state?: StudyState,
  keepNotes = true
): StudyState {
  const baseline = createDefaultStudyState();

  if (!state || !keepNotes) {
    return baseline;
  }

  return {
    ...baseline,
    notes: state.notes,
    tags: state.tags,
    confidence: state.confidence,
  };
}
