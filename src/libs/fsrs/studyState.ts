import {Card, createEmptyCard, fsrs, generatorParameters, Rating as FsrsRating, State as FsrsState,} from "ts-fsrs";

import {
  AttemptHistoryEntry,
  FsrsCardSnapshot,
  Rating,
  ReviewLogFields,
  StudyPhase,
  StudyState,
  StudyStateSummary,
} from "./types";
import {uniqueStrings} from "./utils";

type LegacyStudyStatus =
  | "NEW"
  | "LEARNING"
  | "REVIEWING"
  | "MASTERED"
  | "SUSPENDED";

export interface LegacyStudyStateInput extends Partial<StudyState> {
  status?: LegacyStudyStatus;
  lastReviewedAt?: string;
  nextReviewAt?: string;
  reviewCount?: number;
  lapses?: number;
  ease?: number;
  intervalDays?: number;
}

type FsrsGrade =
  | FsrsRating.Again
  | FsrsRating.Hard
  | FsrsRating.Good
  | FsrsRating.Easy;

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_EASE = 2.5;
const scheduler = fsrs(generatorParameters());

type UnknownRecord = Record<string, unknown>;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function difficultyFromEase(ease: number): number {
  const normalized = clamp(ease, 1.3, 3);
  return clamp(1 + ((3.05 - normalized) / 1.75) * 9, 1, 10);
}

function legacyStateFromStatus(
  status?: LegacyStudyStatus,
  lastRating?: Rating,
  reviewCount?: number
): FsrsState {
  if (!reviewCount || reviewCount <= 0) {
    return FsrsState.New;
  }
  if (lastRating === 0) {
    return FsrsState.Relearning;
  }
  if (status === "LEARNING") {
    return FsrsState.Learning;
  }
  return FsrsState.Review;
}

function toFsrsState(state: FsrsCardSnapshot["state"]): FsrsState {
  switch (state) {
    case "Learning":
      return FsrsState.Learning;
    case "Review":
      return FsrsState.Review;
    case "Relearning":
      return FsrsState.Relearning;
    default:
      return FsrsState.New;
  }
}

function phaseFromFsrsState(
  state: FsrsState
): Exclude<StudyPhase, "Suspended"> {
  switch (state) {
    case FsrsState.Learning:
      return "Learning";
    case FsrsState.Review:
      return "Review";
    case FsrsState.Relearning:
      return "Relearning";
    default:
      return "New";
  }
}

export function toFsrsRating(rating: Rating): FsrsGrade {
  switch (rating) {
    case 0:
      return FsrsRating.Again;
    case 1:
      return FsrsRating.Hard;
    case 2:
      return FsrsRating.Good;
    default:
      return FsrsRating.Easy;
  }
}

function daysBetween(later: Date, earlier: Date): number {
  return Math.max(
    0,
    Math.round((later.getTime() - earlier.getTime()) / DAY_MS)
  );
}

/**
 * Calculate the current retrievability (probability of recall) for a card.
 * Uses the FSRS formula: R = 0.9 ^ (t / S)
 * where t = days since last review, S = stability
 *
 * @param elapsedDays - Days since last review
 * @param stability - Card's stability (how long until memory decays)
 * @returns Retrievability between 0 and 1
 */
export function calculateRetrievability(
  elapsedDays: number,
  stability: number
): number {
  if (stability <= 0) return 0;
  if (elapsedDays <= 0) return 1;
  // FSRS decay formula: R = 0.9 ^ (t / S)
  return Math.pow(0.9, elapsedDays / stability);
}

function bestTimeFromHistory(
  history: AttemptHistoryEntry[]
): number | undefined {
  const values = history
    .map((entry) => entry.solveTimeMs)
    .filter(
      (value): value is number =>
        typeof value === "number" && Number.isFinite(value) && value > 0
    );

  if (values.length === 0) {
    return undefined;
  }

  return Math.min(...values);
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeOptionalLogValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function normalizeReviewLogFields(
  value?: Partial<ReviewLogFields> | null
): ReviewLogFields {
  return {
    interviewPattern: normalizeOptionalLogValue(value?.interviewPattern),
    timeComplexity: normalizeOptionalLogValue(value?.timeComplexity),
    spaceComplexity: normalizeOptionalLogValue(value?.spaceComplexity),
    languages: normalizeOptionalLogValue(value?.languages),
    notes: normalizeOptionalLogValue(value?.notes),
  };
}

export function hasReviewLogFields(
  value?: Partial<ReviewLogFields> | null
): boolean {
  const normalized = normalizeReviewLogFields(value);
  return Boolean(
    normalized.interviewPattern ||
    normalized.timeComplexity ||
    normalized.spaceComplexity ||
    normalized.languages ||
    normalized.notes
  );
}

function latestLogSnapshot(
  history: AttemptHistoryEntry[]
): ReviewLogFields | undefined {
  for (let index = history.length - 1; index >= 0; index -= 1) {
    const candidate = history[index]?.logSnapshot;
    if (hasReviewLogFields(candidate)) {
      return normalizeReviewLogFields(candidate);
    }
  }

  return undefined;
}

function normalizeAttemptHistory(history: unknown): AttemptHistoryEntry[] {
  if (!Array.isArray(history)) {
    return [];
  }

  const normalized = history
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const candidate = entry as Partial<AttemptHistoryEntry>;
      const rawLogSnapshot = isRecord(candidate.logSnapshot)
        ? candidate.logSnapshot
        : undefined;
      const normalizedLogSnapshot = normalizeReviewLogFields({
        interviewPattern: normalizeOptionalLogValue(
          rawLogSnapshot?.interviewPattern
        ),
        timeComplexity: normalizeOptionalLogValue(
          rawLogSnapshot?.timeComplexity
        ),
        spaceComplexity: normalizeOptionalLogValue(
          rawLogSnapshot?.spaceComplexity
        ),
        languages: normalizeOptionalLogValue(rawLogSnapshot?.languages),
        notes:
          normalizeOptionalLogValue(rawLogSnapshot?.notes) ??
          normalizeOptionalLogValue(
            (candidate as Partial<{ notesSnapshot?: string }>).notesSnapshot
          ),
      });
      const reviewedAt =
        typeof candidate.reviewedAt === "string"
          ? candidate.reviewedAt
          : undefined;
      const reviewedAtDate = reviewedAt ? new Date(reviewedAt) : null;
      const rating =
        typeof candidate.rating === "number" ? candidate.rating : undefined;

      if (
        !reviewedAt ||
        !reviewedAtDate ||
        Number.isNaN(reviewedAtDate.getTime()) ||
        rating === undefined ||
        rating < 0 ||
        rating > 3
      ) {
        return null;
      }

      return {
        reviewedAt: reviewedAtDate.toISOString(),
        rating: rating as Rating,
        solveTimeMs:
          typeof candidate.solveTimeMs === "number" &&
          Number.isFinite(candidate.solveTimeMs)
            ? candidate.solveTimeMs
            : undefined,
        mode: candidate.mode === "RECALL" ? "RECALL" : "FULL_SOLVE",
        logSnapshot: hasReviewLogFields(normalizedLogSnapshot)
          ? normalizedLogSnapshot
          : undefined,
      } as AttemptHistoryEntry;
    })
    .filter((entry): entry is AttemptHistoryEntry => entry !== null);

  return normalized.sort(
    (left, right) =>
      new Date(left.reviewedAt).getTime() - new Date(right.reviewedAt).getTime()
  );
}

export function serializeFsrsCard(card: Card): FsrsCardSnapshot {
  return {
    due: card.due.toISOString(),
    stability: Number.isFinite(card.stability) ? card.stability : 0,
    difficulty: Number.isFinite(card.difficulty) ? card.difficulty : 5,
    elapsedDays: Number.isFinite(card.elapsed_days) ? card.elapsed_days : 0,
    scheduledDays: Number.isFinite(card.scheduled_days)
      ? card.scheduled_days
      : 0,
    learningSteps: Number.isFinite(card.learning_steps)
      ? card.learning_steps
      : 0,
    reps: Number.isFinite(card.reps) ? card.reps : 0,
    lapses: Number.isFinite(card.lapses) ? card.lapses : 0,
    state: FsrsState[card.state] as FsrsCardSnapshot["state"],
    lastReview: card.last_review?.toISOString(),
  };
}

export function deserializeFsrsCard(snapshot?: FsrsCardSnapshot): Card | null {
  if (!snapshot) {
    return null;
  }

  const due = new Date(snapshot.due);
  if (Number.isNaN(due.getTime())) {
    return null;
  }

  const lastReview = snapshot.lastReview
    ? new Date(snapshot.lastReview)
    : undefined;
  if (
    snapshot.lastReview &&
    (!lastReview || Number.isNaN(lastReview.getTime()))
  ) {
    return null;
  }

  return {
    due,
    stability: Math.max(
      0.1,
      Number.isFinite(snapshot.stability) ? snapshot.stability : 0.1
    ),
    difficulty: clamp(
      Number.isFinite(snapshot.difficulty) ? snapshot.difficulty : 5,
      1,
      10
    ),
    elapsed_days: Math.max(0, Math.round(snapshot.elapsedDays || 0)),
    scheduled_days: Math.max(0, Math.round(snapshot.scheduledDays || 0)),
    learning_steps: Math.max(0, Math.round(snapshot.learningSteps || 0)),
    reps: Math.max(0, Math.round(snapshot.reps || 0)),
    lapses: Math.max(0, Math.round(snapshot.lapses || 0)),
    state: toFsrsState(snapshot.state),
    last_review: lastReview,
  };
}

function rebuildFsrsCardFromHistory(
  history: AttemptHistoryEntry[]
): Card | null {
  if (history.length === 0) {
    return null;
  }

  let card = createEmptyCard(new Date(history[0].reviewedAt));
  for (const entry of history) {
    card = scheduler.repeat(card, new Date(entry.reviewedAt))[
      toFsrsRating(entry.rating)
      ].card;
  }

  return card;
}

function hasLegacyScheduleData(state?: LegacyStudyStateInput): boolean {
  if (!state) {
    return false;
  }

  return Boolean(
    state.nextReviewAt ||
    state.lastReviewedAt ||
    state.reviewCount ||
    state.intervalDays ||
    state.status ||
    state.lapses
  );
}

function buildLegacyFsrsCard(state: LegacyStudyStateInput, now: string): Card {
  const reviewDate = state.lastReviewedAt
    ? new Date(state.lastReviewedAt)
    : new Date(now);
  const dueDate = state.nextReviewAt
    ? new Date(state.nextReviewAt)
    : new Date(now);

  return {
    due: Number.isNaN(dueDate.getTime()) ? new Date(now) : dueDate,
    stability: Math.max(0.1, state.intervalDays || 0.1),
    difficulty: difficultyFromEase(
      Number.isFinite(state.ease as number)
        ? (state.ease as number)
        : DEFAULT_EASE
    ),
    elapsed_days: daysBetween(new Date(now), reviewDate),
    scheduled_days: Math.max(0, Math.round(state.intervalDays || 0)),
    learning_steps: state.status === "LEARNING" ? 1 : 0,
    reps: Math.max(0, Math.round(state.reviewCount || 0)),
    lapses: Math.max(0, Math.round(state.lapses || 0)),
    state: legacyStateFromStatus(
      state.status,
      state.lastRating,
      state.reviewCount
    ),
    last_review: Number.isNaN(reviewDate.getTime()) ? undefined : reviewDate,
  };
}

function latestReviewedAt(
  history: AttemptHistoryEntry[],
  fallback?: string
): string | undefined {
  const latest = history[history.length - 1]?.reviewedAt;
  if (latest) {
    return latest;
  }

  if (!fallback) {
    return undefined;
  }

  const date = new Date(fallback);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export function normalizeStudyState(
  input?: LegacyStudyStateInput,
  now = new Date().toISOString()
): StudyState {
  const attemptHistory = normalizeAttemptHistory(input?.attemptHistory);
  const lastLogSnapshot = latestLogSnapshot(attemptHistory);
  const normalizedFsrsCard =
    deserializeFsrsCard(input?.fsrsCard) ??
    (hasLegacyScheduleData(input)
      ? buildLegacyFsrsCard(input ?? {}, now)
      : attemptHistory.length > 0
        ? rebuildFsrsCardFromHistory(attemptHistory)
        : null);
  const normalizedLogFields = normalizeReviewLogFields({
    interviewPattern: input?.interviewPattern ?? lastLogSnapshot?.interviewPattern,
    timeComplexity: input?.timeComplexity ?? lastLogSnapshot?.timeComplexity,
    spaceComplexity: input?.spaceComplexity ?? lastLogSnapshot?.spaceComplexity,
    languages: input?.languages ?? lastLogSnapshot?.languages,
    notes: input?.notes ?? lastLogSnapshot?.notes,
  });

  return {
    suspended: input?.suspended === true || input?.status === "SUSPENDED",
    bestTimeMs:
      typeof input?.bestTimeMs === "number" && Number.isFinite(input.bestTimeMs)
        ? input.bestTimeMs
        : bestTimeFromHistory(attemptHistory),
    lastSolveTimeMs:
      typeof input?.lastSolveTimeMs === "number" &&
      Number.isFinite(input.lastSolveTimeMs)
        ? input.lastSolveTimeMs
        : attemptHistory[attemptHistory.length - 1]?.solveTimeMs,
    lastRating:
      typeof input?.lastRating === "number"
        ? (input.lastRating as Rating)
        : attemptHistory[attemptHistory.length - 1]?.rating,
    confidence:
      typeof input?.confidence === "number" && Number.isFinite(input.confidence)
        ? input.confidence
        : undefined,
    ...normalizedLogFields,
    tags: uniqueStrings(Array.isArray(input?.tags) ? input!.tags : []),
    attemptHistory,
    fsrsCard: normalizedFsrsCard
      ? serializeFsrsCard(normalizedFsrsCard)
      : undefined,
  };
}

export function getFsrsCard(
  state: LegacyStudyStateInput | undefined,
  now = new Date().toISOString()
): Card {
  const normalized = normalizeStudyState(state, now);
  return (
    deserializeFsrsCard(normalized.fsrsCard) ?? createEmptyCard(new Date(now))
  );
}

export function getLastReviewedAt(
  state?: StudyState | null
): string | undefined {
  if (!state) {
    return undefined;
  }

  return latestReviewedAt(state.attemptHistory, state.fsrsCard?.lastReview);
}

/** Default target retention if not specified */
const DEFAULT_TARGET_RETENTION = 0.85;

export function getStudyStateSummary(
  state?: StudyState | null,
  now = new Date(),
  targetRetention = DEFAULT_TARGET_RETENTION
): StudyStateSummary {
  if (!state) {
    return {
      phase: "New",
      reviewCount: 0,
      lapses: 0,
      suspended: false,
      isStarted: false,
      isDue: false,
      isOverdue: false,
      overdueDays: 0,
      retrievability: undefined,
    };
  }

  const card = deserializeFsrsCard(state.fsrsCard);
  const nextReviewAt = card?.due.toISOString();
  const reviewCount = card?.reps ?? 0;
  const lastReviewedAt = latestReviewedAt(
    state.attemptHistory,
    card?.last_review?.toISOString()
  );
  const lapses =
    card?.lapses ??
    state.attemptHistory.filter((entry) => entry.rating === 0).length;
  const isStarted = reviewCount > 0 || Boolean(lastReviewedAt);

  // Calculate retrievability based on time since last review and stability
  let retrievability: number | undefined;
  if (card && card.stability > 0 && card.last_review) {
    const elapsedDays = daysBetween(now, card.last_review);
    retrievability = calculateRetrievability(elapsedDays, card.stability);
  }

  // Card is due when retrievability drops below target retention threshold
  const isDue =
    !state.suspended &&
    isStarted &&
    retrievability !== undefined &&
    retrievability < targetRetention;

  // Calculate overdue based on original due date for backwards compatibility
  const nowMs = now.getTime();
  const dueMs = nextReviewAt
    ? new Date(nextReviewAt).getTime()
    : Number.POSITIVE_INFINITY;
  const overdueDays = isDue
    ? Math.max(0, Math.floor((nowMs - dueMs) / DAY_MS))
    : 0;

  return {
    phase: state.suspended
      ? "Suspended"
      : card
        ? phaseFromFsrsState(card.state)
        : "New",
    nextReviewAt,
    lastReviewedAt,
    reviewCount,
    lapses,
    difficulty: card?.difficulty,
    stability: card?.stability,
    scheduledDays: card?.scheduled_days,
    suspended: state.suspended,
    isStarted,
    isDue,
    isOverdue: overdueDays > 0,
    overdueDays,
    retrievability,
  };
}

export function getStudyPhaseLabel(phase: StudyPhase): string {
  return phase.toUpperCase();
}

export function getFsrsScheduler() {
  return scheduler;
}
