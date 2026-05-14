/**
 * Builds the dashboard / popup `ActiveTrackView` for the user's
 * currently-focused track. The "current group" within the track is
 * derived live — first group with an unstarted slug, falling back to
 * the first group. Group selection is NOT persisted; the user's only
 * persisted track preference is which track is focused.
 */
import { getStudyStateSummary } from "@libs/fsrs/studyState";

import {
  findCurrentSlugInGroup,
  trackQuestionStatus,
} from "./questionStatus";

import type { TrackGroupWithProblems } from "../model/TrackGroupWithProblems";
import type { TrackWithGroups } from "../model/TrackWithGroups";
import type {
  ActiveTrackView,
  TrackChapterView,
  TrackQuestionView,
  TrackView,
} from "../model/views";
import type { Problem } from "@features/problems";
import type { StudyState } from "@features/study";
import type { TrackId } from "@shared/ids";

export interface BuildActiveTrackViewInput {
  activeTrackId: TrackId | null;
  /** Hydrated view of the active track (matches the entity). */
  trackView: TrackView | null;
  /** Raw Track entity — drives per-question status from each group's
   * `problems` membership list. */
  trackEntity: TrackWithGroups | null;
  studyStatesBySlug: Record<string, StudyState>;
  problemsBySlug: Record<string, Problem>;
  now?: Date;
}

export function buildActiveTrackView(
  input: BuildActiveTrackViewInput,
): ActiveTrackView | null {
  const {
    activeTrackId,
    trackView,
    trackEntity,
    studyStatesBySlug,
    problemsBySlug,
    now,
  } = input;

  if (!activeTrackId) return null;
  if (!trackView) return null;
  if (!trackEntity) return null;

  const groups = trackEntity.groups;
  if (groups.length === 0) return null;

  const activeGroupId =
    firstIncompleteGroupId(groups, studyStatesBySlug, now) ?? groups[0].id;
  const activeGroup =
    groups.find((group) => group.id === activeGroupId) ?? groups[0];

  const trackGroupViewsById = new Map(
    trackView.groups.map((view) => [view.id, view]),
  );

  let totalQuestions = 0;
  let completedQuestions = 0;
  let totalCompletedGroups = 0;
  let dueCount = 0;
  let nextQuestion: TrackQuestionView | null = null;

  const chapters: TrackChapterView[] = groups.map((group, index) => {
    const view = trackGroupViewsById.get(group.id);
    const groupName = view?.name ?? group.name ?? group.id;
    const slugs = group.problems.map((m) => m.problemSlug) as readonly string[];
    const completedInGroup = slugs.reduce(
      (acc, slug) =>
        getStudyStateSummary(studyStatesBySlug[slug], now).isStarted
          ? acc + 1
          : acc,
      0,
    );
    const isComplete = slugs.length > 0 && completedInGroup === slugs.length;
    if (isComplete) totalCompletedGroups += 1;
    totalQuestions += slugs.length;
    completedQuestions += completedInGroup;

    const status: TrackChapterView["status"] = isComplete
      ? "COMPLETE"
      : group.id === activeGroup.id
        ? "CURRENT"
        : "UPCOMING";

    const questions: TrackQuestionView[] = slugs.map((slug) => {
      const summary = getStudyStateSummary(studyStatesBySlug[slug], now);
      if (summary.isDue) dueCount += 1;
      const problem = problemsBySlug[slug];
      const fallbackTitle = problem?.title ?? slugToReadableTitle(slug);
      const fallbackUrl =
        problem?.url ?? `https://leetcode.com/problems/${slug}/`;
      const difficulty = problem?.difficulty ?? "Unknown";
      const questionStatus = trackQuestionStatus({
        slug,
        groupSlugs: slugs,
        groupStatus: status,
        studyStatesBySlug,
        problemsBySlug,
        now,
      });
      const questionView: TrackQuestionView = {
        slug,
        title: fallbackTitle,
        url: fallbackUrl,
        difficulty,
        groupId: group.id,
        chapterTitle: groupName,
        status: questionStatus,
        reviewPhase: summary.phase,
        nextReviewAt: summary.nextReviewAt,
        inLibrary: Boolean(problem),
        isCurrent:
          questionStatus === "CURRENT" || questionStatus === "READY",
      };
      if (!nextQuestion && questionView.isCurrent) {
        nextQuestion = questionView;
      }
      return questionView;
    });

    return {
      id: group.id,
      title: groupName,
      order: index,
      status,
      totalQuestions: slugs.length,
      completedQuestions: completedInGroup,
      questions,
    };
  });

  const completionPercent =
    totalQuestions === 0
      ? 0
      : Math.round((completedQuestions / totalQuestions) * 100);

  const activeGroupView = trackGroupViewsById.get(activeGroup.id);

  return {
    id: trackEntity.id,
    name: trackEntity.name,
    description: trackEntity.description ?? "",
    sourceSet: trackEntity.id,
    active: true,
    totalQuestions,
    completedQuestions,
    completionPercent,
    dueCount,
    totalChapters: groups.length,
    completedChapters: totalCompletedGroups,
    nextQuestionTitle: nextQuestion
      ? (nextQuestion as TrackQuestionView).title
      : undefined,
    nextChapterTitle: activeGroupView?.name ?? activeGroup.name ?? activeGroup.id,
    activeChapterId: activeGroup.id,
    activeChapterTitle: activeGroupView?.name ?? null,
    nextQuestion,
    chapters,
  };
}

/** Last-resort title when no Problem entity exists yet. */
function slugToReadableTitle(slug: string): string {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/** Returns the slug picked as next-up in the active track's current
 *  group, or null. The "current group" is derived (first incomplete). */
export function nextSlugForActiveTrack(
  trackEntity: TrackWithGroups | null,
  activeTrackId: TrackId | null,
  studyStatesBySlug: Record<string, StudyState>,
  now?: Date,
): string | null {
  if (!trackEntity || !activeTrackId) return null;
  const groups = trackEntity.groups;
  if (groups.length === 0) return null;
  const activeGroupId =
    firstIncompleteGroupId(groups, studyStatesBySlug, now) ?? groups[0].id;
  const activeGroup = groups.find((g) => g.id === activeGroupId) ?? groups[0];
  const slugs = activeGroup.problems.map((m) => m.problemSlug) as readonly string[];
  return findCurrentSlugInGroup(slugs, studyStatesBySlug, now);
}

/**
 * Picks the first group with at least one un-started slug. Used as the
 * fallback when no group is explicitly picked.
 */
function firstIncompleteGroupId(
  groups: ReadonlyArray<TrackGroupWithProblems>,
  studyStatesBySlug: Record<string, StudyState>,
  now?: Date,
): string | undefined {
  for (const group of groups) {
    const slugs = group.problems.map((m) => m.problemSlug);
    if (slugs.length === 0) continue;
    const anyUnstarted = slugs.some(
      (slug) => !getStudyStateSummary(studyStatesBySlug[slug], now).isStarted,
    );
    if (anyUnstarted) return group.id;
  }
  return undefined;
}
