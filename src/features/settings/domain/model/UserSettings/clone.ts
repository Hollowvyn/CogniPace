import type { UserSettings } from "./UserSettings";

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
