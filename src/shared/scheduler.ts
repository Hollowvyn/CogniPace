import { createDefaultStudyState } from "./constants";
import {
  AttemptHistoryEntry,
  Difficulty,
  Rating,
  ReviewMode,
  StudyState,
  UserSettings
} from "./types";
import { addDaysIso, difficultyGoalMs, nowIso } from "./utils";

const MAX_INTERVAL_DAYS = 180;

function getIntensityMultiplier(settings: UserSettings): number {
  if (settings.scheduleIntensity === "aggressive") {
    return 0.85;
  }
  if (settings.scheduleIntensity === "chill") {
    return 1.15;
  }
  return 1;
}

export function getEffectiveRating(
  rating: Rating,
  solveTimeMs: number | undefined,
  settings: UserSettings
): Rating {
  if (!settings.slowSolveDowngradeEnabled) {
    return rating;
  }

  if (typeof solveTimeMs !== "number") {
    return rating;
  }

  if (solveTimeMs <= settings.slowSolveThresholdMs) {
    return rating;
  }

  return Math.max(0, rating - 1) as Rating;
}

function firstIntervalForRating(rating: Rating): number {
  if (rating === 0) {
    return 0;
  }
  if (rating === 1) {
    return 1;
  }
  if (rating === 2) {
    return 3;
  }
  return 4;
}

function computeNextInterval(
  state: StudyState,
  rating: Rating,
  settings: UserSettings
): {
  intervalDays: number;
  ease: number;
} {
  const multiplier = getIntensityMultiplier(settings);
  const isFirstReview = state.reviewCount === 0;

  if (isFirstReview) {
    const firstInterval = firstIntervalForRating(rating);
    let firstEase = state.ease;

    if (rating === 0) {
      firstEase = Math.max(1.3, firstEase - 0.2);
    } else if (rating === 1) {
      firstEase = Math.max(1.3, firstEase - 0.05);
    } else if (rating === 3) {
      firstEase = Math.min(3, firstEase + 0.05);
    }

    const interval = rating === 0 ? 0 : Math.min(MAX_INTERVAL_DAYS, firstInterval * multiplier);
    return { intervalDays: interval, ease: firstEase };
  }

  let ease = state.ease;
  let intervalDays = state.intervalDays || 0;

  if (rating === 0) {
    ease = Math.max(1.3, ease - 0.2);
    intervalDays = 1;
  } else if (rating === 1) {
    ease = Math.max(1.3, ease - 0.05);
    intervalDays = Math.max(1, intervalDays > 0 ? intervalDays * 1.2 : 1);
  } else if (rating === 2) {
    intervalDays = Math.max(3, intervalDays > 0 ? intervalDays * ease : 3);
  } else if (rating === 3) {
    ease = Math.min(3, ease + 0.05);
    intervalDays = Math.max(4, intervalDays > 0 ? intervalDays * (ease + 0.15) : 4);
  }

  intervalDays = Math.min(MAX_INTERVAL_DAYS, intervalDays * multiplier);

  return {
    intervalDays,
    ease
  };
}

function lastRatings(history: AttemptHistoryEntry[], count: number): Rating[] {
  return history.slice(-count).map((entry) => entry.rating);
}

function ratingAverage(ratings: Rating[]): number {
  if (ratings.length === 0) {
    return 0;
  }
  const total = ratings.reduce<number>((sum, rating) => sum + rating, 0);
  return total / ratings.length;
}

function lapsesInLastDays(history: AttemptHistoryEntry[], days: number, now: Date): number {
  const cutoff = now.getTime() - days * 24 * 60 * 60 * 1000;
  return history.filter(
    (entry) => entry.rating === 0 && new Date(entry.reviewedAt).getTime() >= cutoff
  ).length;
}

function computeStatus(
  nextState: StudyState,
  now: Date,
  difficulty: Difficulty
): StudyState["status"] {
  if (nextState.status === "SUSPENDED") {
    return "SUSPENDED";
  }

  if (nextState.reviewCount === 0) {
    return "NEW";
  }

  if (nextState.lastRating === 0) {
    return "LEARNING";
  }

  const history = nextState.attemptHistory;
  const lastTwo = lastRatings(history, 2);
  const lastThree = lastRatings(history, 3);
  const currentInterval = nextState.intervalDays;
  const timedSolveWithinGoal =
    typeof nextState.lastSolveTimeMs === "number" &&
    nextState.lastSolveTimeMs <= difficultyGoalMs(difficulty);

  const canBeReviewing = currentInterval >= 7 && lastTwo.length === 2 && lastTwo.every((rating) => rating >= 2);
  if (canBeReviewing) {
    const recentLapses = lapsesInLastDays(history, 30, now);
    const canBeMastered =
      currentInterval >= 30 &&
      lastThree.length === 3 &&
      ratingAverage(lastThree) >= 2.5 &&
      recentLapses === 0 &&
      timedSolveWithinGoal;

    if (canBeMastered) {
      return "MASTERED";
    }

    return "REVIEWING";
  }

  return "LEARNING";
}

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
  const nowDate = new Date(now);
  const state = input.state ? { ...input.state } : createDefaultStudyState();

  if (input.settings.requireSolveTime && typeof input.solveTimeMs !== "number") {
    throw new Error("Solve time is required by your settings.");
  }

  const effectiveRating = getEffectiveRating(input.rating, input.solveTimeMs, input.settings);
  const next = computeNextInterval(state, effectiveRating, input.settings);

  const historyEntry: AttemptHistoryEntry = {
    reviewedAt: now,
    rating: effectiveRating,
    solveTimeMs: input.solveTimeMs,
    mode: input.mode ?? "FULL_SOLVE",
    notesSnapshot: input.notesSnapshot
  };

  const nextReviewAt = next.intervalDays <= 0 ? now : addDaysIso(now, next.intervalDays);

  const reviewCount = state.reviewCount + 1;
  const lapses = state.lapses + (effectiveRating === 0 ? 1 : 0);

  const updated: StudyState = {
    ...state,
    status: state.status,
    reviewCount,
    lapses,
    ease: next.ease,
    intervalDays: next.intervalDays,
    lastRating: effectiveRating,
    lastReviewedAt: now,
    lastSolveTimeMs: input.solveTimeMs,
    nextReviewAt,
    bestTimeMs:
      typeof input.solveTimeMs === "number"
        ? Math.min(state.bestTimeMs ?? Number.MAX_SAFE_INTEGER, input.solveTimeMs)
        : state.bestTimeMs,
    attemptHistory: [...state.attemptHistory, historyEntry]
  };

  updated.status = computeStatus(updated, nowDate, input.difficulty ?? "Unknown");
  if (effectiveRating === 0) {
    updated.status = "LEARNING";
  }

  return updated;
}

export function resetSchedule(state?: StudyState, keepNotes = true): StudyState {
  const baseline = createDefaultStudyState();

  if (!state) {
    return baseline;
  }

  if (!keepNotes) {
    return baseline;
  }

  return {
    ...baseline,
    notes: state.notes,
    tags: state.tags,
    confidence: state.confidence
  };
}
