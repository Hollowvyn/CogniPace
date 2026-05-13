
import { sanitizeStoredUserSettings } from "./sanitizeStoredUserSettings";

import type { ExperimentalSettings } from "./ExperimentalSettings";
import type { MemoryReviewSettings } from "./MemoryReviewSettings";
import type { NotificationSettings } from "./NotificationSettings";
import type { QuestionFilterSettings } from "./QuestionFilterSettings";
import type { StudyMode } from "./StudyMode";
import type { TimingSettings } from "./TimingSettings";
import type { UserSettingsPatch } from "./UserSettingsPatch";
import type { TrackId } from "@shared/ids";

export interface UserSettings {
  dailyQuestionGoal: number;
  studyMode: StudyMode;
  /** ID of the user's currently-focused track. `null` on fresh install
   *  until the user picks one. Group selection within the track is
   *  derived (first-incomplete-group); not persisted. */
  activeTrackId: TrackId | null;
  notifications: NotificationSettings;
  memoryReview: MemoryReviewSettings;
  questionFilters: QuestionFilterSettings;
  timing: TimingSettings;
  experimental: ExperimentalSettings;
}

export const INITIAL_USER_SETTINGS: UserSettings = {
  dailyQuestionGoal: 18,
  studyMode: "studyPlan",
  activeTrackId: null,
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

export function createInitialUserSettings(): UserSettings {
  return {
    ...INITIAL_USER_SETTINGS,
    experimental: { ...INITIAL_USER_SETTINGS.experimental },
    memoryReview: { ...INITIAL_USER_SETTINGS.memoryReview },
    notifications: { ...INITIAL_USER_SETTINGS.notifications },
    questionFilters: { ...INITIAL_USER_SETTINGS.questionFilters },
    timing: {
      ...INITIAL_USER_SETTINGS.timing,
      difficultyGoalMs: { ...INITIAL_USER_SETTINGS.timing.difficultyGoalMs },
    },
  };
}

export function cloneUserSettings(settings: UserSettings): UserSettings {
  return {
    ...settings,
    experimental: { ...settings.experimental },
    memoryReview: { ...settings.memoryReview },
    notifications: { ...settings.notifications },
    questionFilters: { ...settings.questionFilters },
    timing: {
      ...settings.timing,
      difficultyGoalMs: { ...settings.timing.difficultyGoalMs },
    },
  };
}

/** Patch on top of `current`. Sanitises the result so the SW never
 *  persists a malformed snapshot from a wire-shape patch. */
export function mergeUserSettings(
  current: UserSettings,
  patch: UserSettingsPatch,
): UserSettings {
  return sanitizeStoredUserSettings({
    ...current,
    ...patch,
    experimental: { ...current.experimental, ...(patch.experimental ?? {}) },
    memoryReview: { ...current.memoryReview, ...(patch.memoryReview ?? {}) },
    notifications: {
      ...current.notifications,
      ...(patch.notifications ?? {}),
    },
    questionFilters: {
      ...current.questionFilters,
      ...(patch.questionFilters ?? {}),
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

/** JSON.stringify with sorted keys — needed because key order isn't
 *  guaranteed, so a naive stringify-then-compare gives false negatives. */
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
    .map(([key, v]) => `${JSON.stringify(key)}:${stableStringify(v)}`)
    .join(",")}}`;
}

export function areUserSettingsEqual(
  left: UserSettings,
  right: UserSettings,
): boolean {
  return stableStringify(left) === stableStringify(right);
}
