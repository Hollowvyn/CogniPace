import { UserSettings, UserSettingsPatch } from "./model";
import { sanitizeStoredUserSettings } from "./sanitize";

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

export function mergeUserSettings(
  current: UserSettings,
  patch: UserSettingsPatch
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
