import {createDefaultStudyState} from "./constants";
import {
  getFsrsCard,
  getFsrsScheduler,
  hasReviewLogFields,
  normalizeReviewLogFields,
  normalizeStudyState,
  serializeFsrsCard,
  toFsrsRating,
} from "./studyState";
import {AttemptHistoryEntry, Difficulty, Rating, ReviewLogFields, ReviewMode, StudyState, UserSettings,} from "./types";
import {nowIso} from "./utils";

export interface ApplyReviewInput {
  state?: StudyState;
  difficulty?: Difficulty;
  rating: Rating;
  solveTimeMs?: number;
  mode?: ReviewMode;
  logSnapshot?: ReviewLogFields;
  settings: UserSettings;
  now?: string;
}

export function applyReview(input: ApplyReviewInput): StudyState {
  const now = input.now ?? nowIso();
  const state = input.state ? {...input.state} : createDefaultStudyState();

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
  const normalizedLogSnapshot = normalizeReviewLogFields(input.logSnapshot);

  const historyEntry: AttemptHistoryEntry = {
    reviewedAt: now,
    rating: input.rating,
    solveTimeMs: input.solveTimeMs,
    mode: input.mode ?? "FULL_SOLVE",
    logSnapshot: hasReviewLogFields(normalizedLogSnapshot)
      ? normalizedLogSnapshot
      : undefined,
  };

  return {
    ...state,
    ...normalizedLogSnapshot,
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
    fsrs: serializeFsrsCard(nextCard),
  };
}

export interface OverrideLastReviewInput {
  state?: StudyState;
  rating: Rating;
  solveTimeMs?: number;
  mode?: ReviewMode;
  logSnapshot?: ReviewLogFields;
  settings: UserSettings;
  now?: string;
}

export function overrideLastReview(input: OverrideLastReviewInput): StudyState {
  const now = input.now ?? nowIso();
  const state = input.state ? {...input.state} : createDefaultStudyState();
  const previousEntry = state.attemptHistory[state.attemptHistory.length - 1];

  if (!previousEntry) {
    throw new Error("No review result exists to override.");
  }

  const solveTimeMs = input.solveTimeMs ?? previousEntry.solveTimeMs;
  if (
    input.settings.requireSolveTime &&
    typeof solveTimeMs !== "number"
  ) {
    throw new Error("Solve time is required by your settings.");
  }

  const normalizedLogSnapshot = normalizeReviewLogFields(
    input.logSnapshot ?? previousEntry.logSnapshot
  );
  const nextEntry: AttemptHistoryEntry = {
    ...previousEntry,
    rating: input.rating,
    solveTimeMs,
    mode: input.mode ?? previousEntry.mode,
    logSnapshot: hasReviewLogFields(normalizedLogSnapshot)
      ? normalizedLogSnapshot
      : undefined,
  };

  return normalizeStudyState(
    {
      ...state,
      ...normalizedLogSnapshot,
      attemptHistory: [...state.attemptHistory.slice(0, -1), nextEntry],
      bestTimeMs: undefined,
      lastRating: undefined,
      lastSolveTimeMs: undefined,
      fsrsCard: undefined,
    },
    now
  );
}

/** Returns the earliest scheduled due date across all non-suspended study states, or null if none exist.
 *  Pass `after` to exclude dates on or before that cutoff — useful for scheduling alarms without re-triggering already-due cards. */
export function findEarliestDueDate(
  studyStatesBySlug: Record<string, StudyState>,
  after?: Date
): Date | null {
  let earliest: Date | null = null;

  for (const state of Object.values(studyStatesBySlug)) {
    if (state.suspended || !state.fsrsCard?.due) continue;

    const due = new Date(state.fsrsCard.due);
    if (Number.isNaN(due.getTime())) continue;
    if (after && due <= after) continue;

    if (!earliest || due < earliest) {
      earliest = due;
    }
  }

  return earliest;
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
    interviewPattern: state.interviewPattern,
    timeComplexity: state.timeComplexity,
    spaceComplexity: state.spaceComplexity,
    languages: state.languages,
    tags: state.tags,
    confidence: state.confidence,
  };
}
