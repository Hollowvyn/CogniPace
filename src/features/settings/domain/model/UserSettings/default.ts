/**
 * Default-factory for the UserSettings DomainModel.
 *
 * Lives next to the type because the defaults are part of the model
 * surface — "what does a fresh UserSettings look like?" is a model
 * question, not a util. Replaces the older `seed.ts` name (which
 * smelled like a database concept).
 */
import { asTrackId } from "@shared/ids";

import {
  BUILT_IN_SETS,
  DEFAULT_TRACK_ID,
} from "../../../../../domain/common/constants";

import type { UserSettings } from "./UserSettings";

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
