/**
 * UserSettings — the aggregate DomainModel for user-tunable settings,
 * plus every function that operates on it.
 *
 * Layout convention: the type is the file. Functions that *only*
 * make sense for this model (defaults, equality, clone, merge,
 * sanitize, predicates) live alongside, so a reader opening this
 * file gets the full story of "what is a UserSettings, and what can
 * I do with it?" without hopping between siblings.
 *
 * Sub-types each have their own file in this folder (StudyMode,
 * TimingSettings, NotificationSettings, etc.) — those are independent
 * value objects, not helpers for this aggregate.
 *
 * Layer note (Android-style):
 *   - Entity (persistence)   = `settings_kv` row in
 *                              `platform/db/schema/settingsKv.ts`.
 *                              The DataSource serializes this
 *                              aggregate to/from JSON in `value`.
 *   - DomainModel            = this file. Business shape; what every
 *                              layer above `data/` consumes.
 *   - UiModel                = not separate for settings — the View
 *                              renders this DomainModel directly.
 */
import { asTrackGroupId, asTrackId } from "@shared/ids";

import {
  BUILT_IN_SETS,
  DEFAULT_TRACK_ID,
} from "../../../../domain/common/constants";

import type { DifficultyGoalSettings } from "./DifficultyGoalSettings";
import type { ExperimentalSettings } from "./ExperimentalSettings";
import type { MemoryReviewSettings } from "./MemoryReviewSettings";
import type { NotificationSettings } from "./NotificationSettings";
import type { QuestionFilterSettings } from "./QuestionFilterSettings";
import type { ReviewOrder } from "./ReviewOrder";
import type { StudyMode } from "./StudyMode";
import type { TimingSettings } from "./TimingSettings";
import type { ActiveFocus } from "../../../../domain/active-focus/model";

/* ────────────────────────────────────────────────────────────────────
 * Type
 * ──────────────────────────────────────────────────────────────────── */

export interface UserSettings {
  dailyQuestionGoal: number;
  studyMode: StudyMode;
  /** @deprecated v6 — replaced by `tracks.enabled` (SQLite). Kept on the
   * settings shape for legacy import compat; new code consults the
   * tracks repo. */
  setsEnabled: Record<string, boolean>;
  /** Discriminated current selection across all Tracks. The single source
   * of truth for "which Track is the user focused on right now". */
  activeFocus: ActiveFocus;
  notifications: NotificationSettings;
  memoryReview: MemoryReviewSettings;
  questionFilters: QuestionFilterSettings;
  timing: TimingSettings;
  experimental: ExperimentalSettings;
}

/* ────────────────────────────────────────────────────────────────────
 * Defaults — fresh snapshot factories
 * ──────────────────────────────────────────────────────────────────── */

/** Canonical default snapshot. Cloned by `createInitialUserSettings`
 *  so callers can mutate freely without disturbing this constant. */
export const INITIAL_USER_SETTINGS: UserSettings = {
  dailyQuestionGoal: 18,
  studyMode: "studyPlan",
  activeFocus: { kind: "track", id: asTrackId(DEFAULT_TRACK_ID) },
  setsEnabled: {
    Blind75: true,
    ByteByteGo101: true,
    NeetCode150: true,
    NeetCode250: true,
    Grind75: true,
    LeetCode75: true,
    LeetCode150: true,
    Custom: true,
  },
  notifications: {
    enabled: false,
    dailyTime: "09:00",
  },
  memoryReview: {
    targetRetention: 0.85,
    reviewOrder: "dueFirst",
  },
  questionFilters: {
    skipPremium: false,
  },
  timing: {
    requireSolveTime: false,
    hardMode: false,
    difficultyGoalMs: {
      Easy: 20 * 60 * 1000,
      Medium: 35 * 60 * 1000,
      Hard: 50 * 60 * 1000,
    },
  },
  experimental: {
    autoDetectSolved: false,
  },
};

/** Build a fresh, mutable UserSettings snapshot from the defaults. */
export function createInitialUserSettings(): UserSettings {
  return {
    ...INITIAL_USER_SETTINGS,
    experimental: { ...INITIAL_USER_SETTINGS.experimental },
    memoryReview: { ...INITIAL_USER_SETTINGS.memoryReview },
    notifications: { ...INITIAL_USER_SETTINGS.notifications },
    questionFilters: { ...INITIAL_USER_SETTINGS.questionFilters },
    setsEnabled: { ...INITIAL_USER_SETTINGS.setsEnabled },
    timing: {
      ...INITIAL_USER_SETTINGS.timing,
      difficultyGoalMs: { ...INITIAL_USER_SETTINGS.timing.difficultyGoalMs },
    },
  };
}

/** Default `setsEnabled` map. Kept for legacy v6 import paths; new
 *  code consults the tracks repo for enabled-state. */
export function createInitialSetsEnabled(): Record<string, boolean> {
  return {
    ...Object.fromEntries(BUILT_IN_SETS.map((setName) => [setName, true])),
    Custom: true,
    LeetCode150: true,
  };
}

/* ────────────────────────────────────────────────────────────────────
 * Clone & merge
 * ──────────────────────────────────────────────────────────────────── */

/** Deep clone a UserSettings snapshot. Every nested object is copied
 *  so callers can mutate the result freely without disturbing the
 *  source — used by the settings editor when seeding a draft. */
export function cloneUserSettings(settings: UserSettings): UserSettings {
  return {
    ...settings,
    experimental: { ...settings.experimental },
    memoryReview: { ...settings.memoryReview },
    notifications: { ...settings.notifications },
    questionFilters: { ...settings.questionFilters },
    setsEnabled: { ...settings.setsEnabled },
    timing: {
      ...settings.timing,
      difficultyGoalMs: { ...settings.timing.difficultyGoalMs },
    },
  };
}

/** Apply a `UserSettingsPatch` on top of a current snapshot. Nested
 *  objects merge field-by-field; the result is sanitized so the SW
 *  never persists a malformed snapshot. */
export function mergeUserSettings(
  current: UserSettings,
  patch: import("./UserSettingsPatch").UserSettingsPatch,
): UserSettings {
  return sanitizeStoredUserSettings({
    ...current,
    ...patch,
    experimental: {
      ...current.experimental,
      ...(patch.experimental ?? {}),
    },
    memoryReview: {
      ...current.memoryReview,
      ...(patch.memoryReview ?? {}),
    },
    notifications: {
      ...current.notifications,
      ...(patch.notifications ?? {}),
    },
    questionFilters: {
      ...current.questionFilters,
      ...(patch.questionFilters ?? {}),
    },
    setsEnabled: {
      ...current.setsEnabled,
      ...(patch.setsEnabled ?? {}),
    },
    timing: {
      ...current.timing,
      ...(patch.timing ?? {}),
      difficultyGoalMs: {
        ...current.timing.difficultyGoalMs,
        ...(patch.timing?.difficultyGoalMs ?? {}),
      },
    },
  });
}

/* ────────────────────────────────────────────────────────────────────
 * Equality
 * ──────────────────────────────────────────────────────────────────── */

/** Stable JSON stringify with sorted keys — `JSON.stringify` doesn't
 *  guarantee key order, so we sort to make value-equality reliable. */
function stableStringify(value: unknown): string {
  if (!value || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>).sort(
    ([left], [right]) => left.localeCompare(right),
  );

  return `{${entries
    .map(
      ([key, entryValue]) =>
        `${JSON.stringify(key)}:${stableStringify(entryValue)}`,
    )
    .join(",")}}`;
}

/** Deep value equality between two UserSettings snapshots. Used by the
 *  settings editor to decide whether the user has unsaved changes. */
export function areUserSettingsEqual(
  left: UserSettings,
  right: UserSettings,
): boolean {
  return stableStringify(left) === stableStringify(right);
}

/* ────────────────────────────────────────────────────────────────────
 * Sanitize / predicates
 * ──────────────────────────────────────────────────────────────────── */

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function numberInRange(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(min, Math.min(max, value))
    : fallback;
}

function nonNegativeInteger(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.round(value))
    : fallback;
}

function positiveInteger(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(1, Math.round(value))
    : fallback;
}

function isTimeString(value: string): boolean {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
}

function timeString(value: unknown, fallback: string): string {
  return typeof value === "string" && isTimeString(value) ? value : fallback;
}

function isReviewOrder(value: unknown): value is ReviewOrder {
  return (
    value === "dueFirst" ||
    value === "mixByDifficulty" ||
    value === "weakestFirst"
  );
}

function reviewOrder(value: unknown, fallback: ReviewOrder): ReviewOrder {
  return isReviewOrder(value) ? value : fallback;
}

function isStudyMode(value: unknown): value is StudyMode {
  return value === "studyPlan" || value === "freestyle";
}

function studyMode(value: unknown, fallback: StudyMode): StudyMode {
  return isStudyMode(value) ? value : fallback;
}

function booleanValue(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function settingsRecord(value: unknown, fallback: object): UnknownRecord {
  return isRecord(value) ? value : (fallback as UnknownRecord);
}

function sanitizeActiveFocus(value: unknown): ActiveFocus | undefined {
  if (value === null) return null;
  if (!isRecord(value)) return undefined;
  if (value.kind !== "track") return undefined;
  if (typeof value.id !== "string" || !value.id.trim()) return undefined;
  const focus: ActiveFocus = {
    kind: "track",
    id: asTrackId(value.id),
  };
  if (typeof value.groupId === "string" && value.groupId.trim()) {
    focus.groupId = asTrackGroupId(value.groupId);
  }
  return focus;
}

function sanitizeSetsEnabled(value: unknown): Record<string, boolean> {
  if (!isRecord(value)) {
    return createInitialSetsEnabled();
  }

  return {
    ...createInitialSetsEnabled(),
    ...Object.fromEntries(
      Object.entries(value).filter(
        (entry): entry is [string, boolean] => typeof entry[1] === "boolean",
      ),
    ),
  };
}

function sanitizeDifficultyGoalMs(
  value: unknown,
  fallback: DifficultyGoalSettings,
): DifficultyGoalSettings {
  let base: DifficultyGoalSettings;
  if (!isRecord(value)) {
    base = { ...fallback };
  } else {
    base = {
      Easy: positiveInteger(value.Easy, fallback.Easy),
      Medium: positiveInteger(value.Medium, fallback.Medium),
      Hard: positiveInteger(value.Hard, fallback.Hard),
    };
  }

  const STEP_MS = 60000;
  base.Easy = Math.max(10 * STEP_MS, Math.min(base.Easy, 58 * STEP_MS));
  base.Medium = Math.max(
    base.Easy + STEP_MS,
    Math.min(base.Medium, 59 * STEP_MS),
  );
  base.Hard = Math.max(
    base.Medium + STEP_MS,
    Math.min(base.Hard, 60 * STEP_MS),
  );

  return base;
}

function isNonNegativeInteger(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    Number.isInteger(value) &&
    value >= 0
  );
}

function isPositiveInteger(value: unknown): value is number {
  return isNonNegativeInteger(value) && value > 0;
}

function isBooleanRecord(value: unknown): value is Record<string, boolean> {
  return (
    isRecord(value) &&
    Object.values(value).every((entry) => typeof entry === "boolean")
  );
}

function isDifficultyGoalSettings(
  value: unknown,
): value is DifficultyGoalSettings {
  return (
    isRecord(value) &&
    isPositiveInteger(value.Easy) &&
    isPositiveInteger(value.Medium) &&
    isPositiveInteger(value.Hard)
  );
}

/** Cheap structural check — does this object at least carry the
 *  grouped nested-object surface (notifications, memoryReview, …)? */
export function hasGroupedUserSettings(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isRecord(value.notifications) &&
    isRecord(value.memoryReview) &&
    isRecord(value.questionFilters) &&
    isRecord(value.timing) &&
    isRecord(value.experimental)
  );
}

/** Type guard — does this value match the full persisted UserSettings
 *  shape exactly? Used to decide whether a stored blob can be loaded
 *  as-is or must be sanitized. */
export function isPersistedUserSettings(value: unknown): value is UserSettings {
  if (!hasGroupedUserSettings(value)) {
    return false;
  }

  const source = value as UnknownRecord;
  const notifications = source.notifications as UnknownRecord;
  const memoryReview = source.memoryReview as UnknownRecord;
  const questionFilters = source.questionFilters as UnknownRecord;
  const timing = source.timing as UnknownRecord;
  const experimental = source.experimental as UnknownRecord;

  return (
    isNonNegativeInteger(source.dailyQuestionGoal) &&
    isStudyMode(source.studyMode) &&
    sanitizeActiveFocus(source.activeFocus) !== undefined &&
    isBooleanRecord(source.setsEnabled) &&
    typeof notifications.enabled === "boolean" &&
    typeof notifications.dailyTime === "string" &&
    isTimeString(notifications.dailyTime) &&
    typeof memoryReview.targetRetention === "number" &&
    Number.isFinite(memoryReview.targetRetention) &&
    memoryReview.targetRetention >= 0.7 &&
    memoryReview.targetRetention <= 0.95 &&
    isReviewOrder(memoryReview.reviewOrder) &&
    typeof questionFilters.skipPremium === "boolean" &&
    typeof timing.requireSolveTime === "boolean" &&
    typeof timing.hardMode === "boolean" &&
    isDifficultyGoalSettings(timing.difficultyGoalMs) &&
    typeof experimental.autoDetectSolved === "boolean"
  );
}

/** Coerce an arbitrary value into a valid UserSettings, replacing any
 *  malformed fields with the canonical defaults. Idempotent: passing a
 *  sanitized result back through yields the same shape. */
export function sanitizeStoredUserSettings(value: unknown): UserSettings {
  const initial = createInitialUserSettings();
  const source = isRecord(value) ? value : {};

  const notifications = settingsRecord(
    source.notifications,
    initial.notifications,
  );
  const memoryReview = settingsRecord(source.memoryReview, initial.memoryReview);
  const questionFilters = settingsRecord(
    source.questionFilters,
    initial.questionFilters,
  );
  const timing = settingsRecord(source.timing, initial.timing);
  const experimental = settingsRecord(source.experimental, initial.experimental);

  const sanitizedRequireSolveTime = booleanValue(
    timing.requireSolveTime,
    initial.timing.requireSolveTime,
  );

  // Honour the v6 `activeCourseId` field on legacy import payloads to
  // recover an active focus when none is set explicitly.
  const legacyCourseIdFallback =
    typeof source.activeCourseId === "string" && source.activeCourseId.trim()
      ? source.activeCourseId
      : DEFAULT_TRACK_ID;
  const explicitActiveFocus = sanitizeActiveFocus(source.activeFocus);
  const sanitizedActiveFocus: ActiveFocus =
    explicitActiveFocus !== undefined
      ? explicitActiveFocus
      : { kind: "track", id: asTrackId(legacyCourseIdFallback) };

  return {
    dailyQuestionGoal: nonNegativeInteger(
      source.dailyQuestionGoal,
      initial.dailyQuestionGoal,
    ),
    studyMode: studyMode(source.studyMode, initial.studyMode),
    setsEnabled: sanitizeSetsEnabled(source.setsEnabled),
    activeFocus: sanitizedActiveFocus,
    notifications: {
      enabled: booleanValue(
        notifications.enabled,
        initial.notifications.enabled,
      ),
      dailyTime: timeString(
        notifications.dailyTime,
        initial.notifications.dailyTime,
      ),
    },
    memoryReview: {
      targetRetention: numberInRange(
        memoryReview.targetRetention,
        initial.memoryReview.targetRetention,
        0.7,
        0.95,
      ),
      reviewOrder: reviewOrder(
        memoryReview.reviewOrder,
        initial.memoryReview.reviewOrder,
      ),
    },
    questionFilters: {
      skipPremium: booleanValue(
        questionFilters.skipPremium,
        initial.questionFilters.skipPremium,
      ),
    },
    timing: {
      requireSolveTime: sanitizedRequireSolveTime,
      hardMode:
        sanitizedRequireSolveTime &&
        booleanValue(timing.hardMode, initial.timing.hardMode),
      difficultyGoalMs: sanitizeDifficultyGoalMs(
        timing.difficultyGoalMs,
        initial.timing.difficultyGoalMs,
      ),
    },
    experimental: {
      autoDetectSolved: booleanValue(
        experimental.autoDetectSolved,
        initial.experimental.autoDetectSolved,
      ),
    },
  };
}
