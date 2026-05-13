/**
 * Helpers that classify a single curated-track question into a UI status
 * (CURRENT / LOCKED / QUEUED / READY / DUE_NOW) from the SSoT — the user's
 * StudyState plus the question's position in its group. Lifted out of the
 * v6 course module so it survives the v6 delete.
 */
import { getStudyStateSummary } from "@libs/fsrs/studyState";

import type {
  TrackChapterStatusView,
  TrackQuestionStatusView,
} from "../model/views";
import type { Problem } from "@features/problems";
import type { StudyState } from "@features/study";

export interface TrackQuestionStatusInput {
  slug: string;
  /** Ordered list of slugs in the same group as `slug`. */
  groupSlugs: readonly string[];
  /** Whether the surrounding group is complete / current / upcoming. */
  groupStatus: TrackChapterStatusView;
  studyStatesBySlug: Record<string, StudyState>;
  problemsBySlug: Record<string, Problem>;
  now?: Date;
}

export function trackQuestionStatus(
  input: TrackQuestionStatusInput,
): TrackQuestionStatusView {
  const { slug, groupSlugs, groupStatus, studyStatesBySlug, problemsBySlug, now } =
    input;
  const summary = getStudyStateSummary(studyStatesBySlug[slug], now);
  if (summary.isDue) return "DUE_NOW";
  if (summary.isStarted) return "QUEUED";
  if (groupStatus === "UPCOMING") return "LOCKED";

  const inLibrary = Boolean(problemsBySlug[slug]);
  const currentSlug = findCurrentSlugInGroup(groupSlugs, studyStatesBySlug, now);
  if (currentSlug === slug) return inLibrary ? "READY" : "CURRENT";
  return "LOCKED";
}

/** First slug in the group whose StudyState is not yet started. */
export function findCurrentSlugInGroup(
  groupSlugs: readonly string[],
  studyStatesBySlug: Record<string, StudyState>,
  now?: Date,
): string | null {
  const current = groupSlugs.find(
    (slug) => !getStudyStateSummary(studyStatesBySlug[slug], now).isStarted,
  );
  return current ?? null;
}
