import { getStudyStateSummary } from "@libs/fsrs/studyState";

import type { Track } from "./Track";
import type { TrackGroup } from "./TrackGroup";
import type { Problem } from "@features/problems/domain/model";

export interface TrackProgress {
  completedQuestions: number;
  dueCount: number;
  lastInteractedAt: string | null;
  startedAt: string | null;
  totalQuestions: number;
  completionPercent: number;
}

function isStarted(problem: Problem, now = new Date()): boolean {
  return getStudyStateSummary(problem.studyState, now).isStarted;
}

function isDue(problem: Problem, now = new Date()): boolean {
  return getStudyStateSummary(problem.studyState, now).isDue;
}

function attemptDates(problem: Problem): string[] {
  return problem.studyState?.attemptHistory.map((entry) => entry.reviewedAt) ?? [];
}

export function getGroupTotalCount(group: TrackGroup): number {
  return group.problems.length;
}

export function getGroupCompletedCount(
  group: TrackGroup,
  now = new Date(),
): number {
  return group.problems.reduce(
    (count, problem) => count + (isStarted(problem, now) ? 1 : 0),
    0,
  );
}

export function getActiveTrackGroup(
  track: Track,
  now = new Date(),
): TrackGroup | null {
  return (
    track.groups.find((group) =>
      group.problems.some((problem) => !isStarted(problem, now)),
    ) ??
    track.groups[0] ??
    null
  );
}

export function getNextTrackProblem(
  track: Track,
  now = new Date(),
): { group: TrackGroup; problem: Problem } | null {
  const activeGroup = getActiveTrackGroup(track, now);
  if (!activeGroup) return null;
  const problem = activeGroup.problems.find((item) => !isStarted(item, now));
  return problem ? { group: activeGroup, problem } : null;
}

export function getTrackProgress(track: Track, now = new Date()): TrackProgress {
  let completedQuestions = 0;
  let dueCount = 0;
  let totalQuestions = 0;
  let startedAt: string | null = null;
  let lastInteractedAt: string | null = null;

  for (const group of track.groups) {
    totalQuestions += getGroupTotalCount(group);
    completedQuestions += getGroupCompletedCount(group, now);
    for (const problem of group.problems) {
      if (isDue(problem, now)) dueCount += 1;
      for (const reviewedAt of attemptDates(problem)) {
        if (startedAt === null || reviewedAt < startedAt) {
          startedAt = reviewedAt;
        }
        if (lastInteractedAt === null || reviewedAt > lastInteractedAt) {
          lastInteractedAt = reviewedAt;
        }
      }
    }
  }

  return {
    completedQuestions,
    dueCount,
    lastInteractedAt,
    startedAt,
    totalQuestions,
    completionPercent:
      totalQuestions > 0
        ? Math.round((completedQuestions / totalQuestions) * 100)
        : 0,
  };
}
