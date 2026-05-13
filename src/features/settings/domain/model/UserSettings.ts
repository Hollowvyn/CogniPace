/** UserSettings — aggregate DomainModel. The type + its identity ops
 *  (defaults, clone, merge, equality) live here; the boundary parser
 *  (`sanitizeStoredUserSettings`) lives in `utils/`. Sub-types each
 *  have their own sibling file. */
import { asTrackId } from "@shared/ids";

import {
  BUILT_IN_SETS,
  DEFAULT_TRACK_ID,
} from "../../../../domain/common/constants";

import { sanitizeStoredUserSettings } from "./utils/sanitizeStoredUserSettings";

import type { ExperimentalSettings } from "./ExperimentalSettings";
import type { MemoryReviewSettings } from "./MemoryReviewSettings";
import type { NotificationSettings } from "./NotificationSettings";
import type { QuestionFilterSettings } from "./QuestionFilterSettings";
import type { StudyMode } from "./StudyMode";
import type { TimingSettings } from "./TimingSettings";
import type { UserSettingsPatch } from "./UserSettingsPatch";
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
  patch: UserSettingsPatch,
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
