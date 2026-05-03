import { BUILT_IN_SETS, DEFAULT_COURSE_ID } from "../common/constants";

import { UserSettings } from "./model";

export const INITIAL_USER_SETTINGS: UserSettings = {
  dailyQuestionGoal: 18,
  studyMode: "studyPlan",
  activeCourseId: DEFAULT_COURSE_ID,
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
    skipIgnored: true,
    skipPremium: false,
  },
  timing: {
    requireSolveTime: false,
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
    setsEnabled: { ...INITIAL_USER_SETTINGS.setsEnabled },
    timing: {
      ...INITIAL_USER_SETTINGS.timing,
      difficultyGoalMs: { ...INITIAL_USER_SETTINGS.timing.difficultyGoalMs },
    },
  };
}

export function createInitialSetsEnabled(): Record<string, boolean> {
  return {
    ...Object.fromEntries(BUILT_IN_SETS.map((setName) => [setName, true])),
    Custom: true,
    LeetCode150: true,
  };
}
