import { sanitizeStoredUserSettings } from "./sanitize";

import type { UserSettings } from "./UserSettings";
import type { UserSettingsPatch } from "./UserSettingsPatch";

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
