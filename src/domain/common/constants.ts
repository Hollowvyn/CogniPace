/** Shared persisted defaults and app-wide constants. */
import { STORAGE_SCHEMA_VERSION, StudyState } from "../types";

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

/** Creates the empty persisted study-state baseline for a tracked problem. */
export function createDefaultStudyState(): StudyState {
  return {
    suspended: false,
    tags: [],
    attemptHistory: [],
  };
}
