/** Repository for problem-session runtime actions triggered by UI surfaces. */
import {Difficulty, Rating, ReviewLogFields, ReviewMode,} from "../../domain/types";
import {sendMessage} from "../../extension/runtime/client";

/** Upserts the current problem context detected from the LeetCode page. */
export async function upsertProblemFromPage(input: {
  slug: string;
  title?: string;
  difficulty?: Difficulty;
  url?: string;
}) {
  return sendMessage("UPSERT_PROBLEM_FROM_PAGE", input);
}

/** Fetches the persisted problem and study-state context for a slug. */
export async function getProblemContext(slug: string) {
  return sendMessage("GET_PROBLEM_CONTEXT", {slug});
}

/** Persists a completed review result for the active problem. */
export async function saveReviewResult(input: {
  slug: string;
  rating: Rating;
  solveTimeMs?: number;
  mode?: ReviewMode;
  interviewPattern?: ReviewLogFields["interviewPattern"];
  timeComplexity?: ReviewLogFields["timeComplexity"];
  spaceComplexity?: ReviewLogFields["spaceComplexity"];
  languages?: ReviewLogFields["languages"];
  notes?: ReviewLogFields["notes"];
  courseId?: string;
  chapterId?: string;
  source?: "overlay" | "dashboard";
}) {
  return sendMessage("SAVE_REVIEW_RESULT", input);
}

/** Replaces the latest saved review result for the active problem. */
export async function overrideLastReviewResult(input: {
  slug: string;
  rating: Rating;
  solveTimeMs?: number;
  mode?: ReviewMode;
  interviewPattern?: ReviewLogFields["interviewPattern"];
  timeComplexity?: ReviewLogFields["timeComplexity"];
  spaceComplexity?: ReviewLogFields["spaceComplexity"];
  languages?: ReviewLogFields["languages"];
  notes?: ReviewLogFields["notes"];
  courseId?: string;
  chapterId?: string;
  source?: "overlay" | "dashboard";
}) {
  return sendMessage("OVERRIDE_LAST_REVIEW_RESULT", input);
}

/** Asks the background worker to open a LeetCode problem page. */
export async function openProblemPage(target: {
  slug: string;
  courseId?: string;
  chapterId?: string;
}) {
  return sendMessage("OPEN_PROBLEM_PAGE", target);
}

/** Asks the background worker to open an internal extension page. */
export async function openExtensionPage(path: string) {
  return sendMessage("OPEN_EXTENSION_PAGE", {path});
}
