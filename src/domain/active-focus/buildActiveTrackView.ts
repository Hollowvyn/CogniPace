/**
 * Builds the dashboard / popup `ActiveTrackView` from the slim Track
 * domain (post-Phase-5 tracks slice). Reads through the hydrated
 * `TrackWithGroups` entity plus the user's study-state map; per-group
 * completion is derived live — there is no `StudySetProgress` table any
 * more.
 *
 * The user's "where am I" pointer:
 *   - `activeFocus.groupId` (persisted in UserSettings) takes priority.
 *   - Falls back to the first group with at least one unfinished slug.
 *   - Falls back further to the first group in the track.
 */
import { getStudyStateSummary } from "../fsrs/studyState";
import {
  findCurrentSlugInGroup,
  trackQuestionStatus,
} from "../views/questionStatus";

import type { ActiveFocus } from "./model";
import type { TrackGroupWithProblems, TrackWithGroups } from "../tracks/model";
import type { Problem, StudyState } from "../types";
import type {
  ActiveTrackView,
  TrackChapterView,
  TrackQuestionView,
  TrackView,
} from "../views";

export interface BuildActiveTrackViewInput {
  activeFocus: ActiveFocus;
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
    activeFocus,
    trackView,
    trackEntity,
    studyStatesBySlug,
    problemsBySlug,
    now,
  } = input;

  if (!activeFocus || activeFocus.kind !== "track") return null;
  if (!trackView) return null;
  if (!trackEntity) return null;

  const groups = trackEntity.groups;
  if (groups.length === 0) return null;

  const activeGroupId =
    activeFocus.groupId ??
    firstIncompleteGroupId(groups, studyStatesBySlug, now) ??
    groups[0].id;
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
        chapterId: group.id,
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

/** Returns the slug picked as next-up for a focus, or null. */
export function nextSlugForFocus(
  trackEntity: TrackWithGroups | null,
  activeFocus: ActiveFocus,
  studyStatesBySlug: Record<string, StudyState>,
  now?: Date,
): string | null {
  if (!trackEntity || !activeFocus || activeFocus.kind !== "track") return null;
  const groups = trackEntity.groups;
  if (groups.length === 0) return null;
  const activeGroupId =
    activeFocus.groupId ??
    firstIncompleteGroupId(groups, studyStatesBySlug, now) ??
    groups[0].id;
  const activeGroup = groups.find((g) => g.id === activeGroupId) ?? groups[0];
  const slugs = activeGroup.problems.map((m) => m.problemSlug) as readonly string[];
  return findCurrentSlugInGroup(slugs, studyStatesBySlug, now);
}

/**
 * Picks the first group with at least one un-started slug. Used as the
 * fallback when the user has never explicitly picked a group within the
 * track (no `activeFocus.groupId`).
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
