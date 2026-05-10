import type { StudyState } from "./model";

/** Creates a fresh StudyState for a problem the user has just engaged with. */
export function createDefaultStudyState(now: string): StudyState {
  return {
    suspended: false,
    tags: [],
    attemptHistory: [],
    createdAt: now,
    updatedAt: now,
  };
}
