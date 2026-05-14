/** Repository for problem-session runtime actions triggered by UI surfaces.
 *
 *  Each function is a thin wrapper around the typed RPC proxy. They throw
 *  on failure (the proxy unwraps the envelope and rethrows the handler's
 *  error message) and return the resolved data on success — callers use
 *  try/catch instead of envelope checking. */
import { api } from "@app/api";
import { Rating, ReviewLogFields, ReviewMode } from "@features/study";

import { Difficulty } from "../../domain/model";

/** Upserts the current problem context detected from the LeetCode page. */
export async function upsertProblemFromPage(input: {
  slug: string;
  title?: string;
  difficulty?: Difficulty;
  isPremium?: boolean;
  url?: string;
}) {
  return api.upsertProblemFromPage(input);
}

/** Fetches the persisted problem and study-state context for a slug. */
export async function getProblemContext(slug: string) {
  return api.getProblemContext({ slug });
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
  trackId?: string;
  groupId?: string;
  source?: "overlay" | "dashboard";
}) {
  return api.saveReviewResult(input);
}

/** Persists the overlay's structured log draft without appending review history. */
export async function saveOverlayLogDraft(input: {
  slug: string;
  interviewPattern?: ReviewLogFields["interviewPattern"];
  timeComplexity?: ReviewLogFields["timeComplexity"];
  spaceComplexity?: ReviewLogFields["spaceComplexity"];
  languages?: ReviewLogFields["languages"];
  notes?: ReviewLogFields["notes"];
}) {
  return api.saveOverlayLogDraft(input);
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
  trackId?: string;
  groupId?: string;
  source?: "overlay" | "dashboard";
}) {
  return api.overrideLastReviewResult(input);
}

/** Asks the background worker to open a LeetCode problem page. */
export async function openProblemPage(target: {
  slug: string;
  trackId?: string;
  groupId?: string;
}) {
  return api.openProblemPage(target);
}

/** Asks the background worker to open an internal extension page. */
export async function openExtensionPage(path: string) {
  return api.openExtensionPage({ path });
}
