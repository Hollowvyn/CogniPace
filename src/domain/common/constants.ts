/** Shared persisted defaults and app-wide constants. */
import { STORAGE_SCHEMA_VERSION, StudyState, UserSettings } from "../types";

export const STORAGE_KEY = "leetcode_spaced_repetition_data_v2";
export const LEGACY_STORAGE_KEY = "leetcode_spaced_repetition_data_v1";
export const CURRENT_STORAGE_SCHEMA_VERSION = STORAGE_SCHEMA_VERSION;

export const DEFAULT_COURSE_ID = "Blind75";

export const BUILT_IN_SETS = [
  "Blind75",
  "ByteByteGo101",
  "NeetCode150",
  "NeetCode250",
  "Grind75",
  "LeetCode75",
];

export const DEFAULT_SETTINGS: UserSettings = {
  dailyQuestionGoal: 18,
  dailyNewLimit: 3,
  dailyReviewLimit: 15,
  reviewOrder: "dueFirst",
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
  requireSolveTime: false,
  difficultyGoalMs: {
    Easy: 20 * 60 * 1000,
    Medium: 35 * 60 * 1000,
    Hard: 50 * 60 * 1000,
  },
  skipIgnoredQuestions: true,
  skipPremiumQuestions: false,
  autoDetectSolved: false,
  notifications: false,
  notificationTime: "09:00",
  quietHours: {
    startHour: 22,
    endHour: 8,
  },
  /** Target retention threshold. Cards become due when retrievability drops below this. */
  targetRetention: 0.85,
};

/** Creates the empty persisted study-state baseline for a tracked problem. */
export function createDefaultStudyState(): StudyState {
  return {
    suspended: false,
    tags: [],
    attemptHistory: [],
  };
}
