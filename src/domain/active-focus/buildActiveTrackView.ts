/**
 * v7 derivation of the dashboard "active track" view. Replaces the v6
 * `buildActiveTrackView` so popup, Overview, and Tracks-tab surfaces all
 * read from the same StudySet + StudyState SSoT. Output shape matches
 * `ActiveTrackView` (renamed `ActiveTrackView` in a later phase) so UI
 * consumers don't move.
 */
import { getStudyStateSummary } from "../fsrs/studyState";
import {
  findCurrentSlugInGroup,
  firstIncompleteGroupId,
  trackQuestionStatus,
} from "../views/questionStatus";

import type { ActiveFocus } from "./model";
import type { StudySet } from "../sets/model";
import type { StudySetProgress } from "../sets/progress";
import type { Problem, StudyState } from "../types";
import type {
  ActiveTrackView,
  TrackChapterView,
  TrackQuestionView,
  StudySetView,
} from "../views";

export interface BuildActiveTrackViewInput {
  activeFocus: ActiveFocus;
  /** Hydrated track view for the active focus, if any. */
  trackView: StudySetView | null;
  /** Raw StudySet entity — drives per-question status from
   * `group.problemSlugs`. */
  trackEntity: StudySet | null;
  /** Optional v7 progress aggregate — used for `activeChapterId` selection
   * via `progress.activeGroupId`. Falls back to first incomplete group. */
  trackProgress: StudySetProgress | null;
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
    trackProgress,
    studyStatesBySlug,
    problemsBySlug,
    now,
  } = input;

  if (!activeFocus || activeFocus.kind !== "track") return null;
  if (!trackView || trackView.kind !== "grouped") return null;
  if (!trackEntity) return null;

  const groups = trackEntity.groups;
  if (groups.length === 0) return null;

  const activeGroupId =
    activeFocus.groupId ??
    trackProgress?.activeGroupId ??
    firstIncompleteGroupId(groups, studyStatesBySlug, now) ??
    groups[0].id;
  const activeGroup = groups.find((group) => group.id === activeGroupId) ?? groups[0];

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
    const groupName = view?.name ?? group.nameOverride ?? group.id;
    const slugs = group.problemSlugs as readonly string[];
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
      const titleOverride = group.problemTitleOverrides?.[slug];
      const fallbackTitle =
        titleOverride ?? problem?.title ?? slugToReadableTitle(slug);
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
    nextQuestionTitle: nextQuestion ? (nextQuestion as TrackQuestionView).title : undefined,
    nextChapterTitle: activeGroupView?.name ?? activeGroup.id,
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
  trackEntity: StudySet | null,
  activeFocus: ActiveFocus,
  trackProgress: StudySetProgress | null,
  studyStatesBySlug: Record<string, StudyState>,
  now?: Date,
): string | null {
  if (!trackEntity || !activeFocus || activeFocus.kind !== "track") return null;
  const groups = trackEntity.groups;
  if (groups.length === 0) return null;
  const activeGroupId =
    activeFocus.groupId ??
    trackProgress?.activeGroupId ??
    firstIncompleteGroupId(groups, studyStatesBySlug, now) ??
    groups[0].id;
  const activeGroup = groups.find((g) => g.id === activeGroupId) ?? groups[0];
  return findCurrentSlugInGroup(
    activeGroup.problemSlugs as readonly string[],
    studyStatesBySlug,
    now,
  );
}
