import { createDefaultStudyState } from "@libs/fsrs/constants";
import { getStudyStateSummary } from "@libs/fsrs/studyState";


import { isEffectivelySuspended } from "./effectivelySuspended";

import type { QueueItem } from "./QueueItem";
import type { TodayQueue } from "./TodayQueue";
import type { AppData } from "../../../../domain/types/AppData";
import type { StudyState } from "@features/study";

function cloneStateOrDefault(state?: StudyState): StudyState {
  return state ? { ...state } : createDefaultStudyState();
}

function sortByDueDateAsc(items: QueueItem[]): QueueItem[] {
  return [...items].sort((a, b) => {
    const aTs = a.studyStateSummary.nextReviewAt
      ? new Date(a.studyStateSummary.nextReviewAt).getTime()
      : Number.MAX_SAFE_INTEGER;
    const bTs = b.studyStateSummary.nextReviewAt
      ? new Date(b.studyStateSummary.nextReviewAt).getTime()
      : Number.MAX_SAFE_INTEGER;
    return aTs - bTs;
  });
}

function sortWeakest(items: QueueItem[]): QueueItem[] {
  return [...items].sort((a, b) => {
    if (b.studyStateSummary.lapses !== a.studyStateSummary.lapses) {
      return b.studyStateSummary.lapses - a.studyStateSummary.lapses;
    }
    if (
      (b.studyStateSummary.difficulty ?? 0) !==
      (a.studyStateSummary.difficulty ?? 0)
    ) {
      return (
        (b.studyStateSummary.difficulty ?? 0) -
        (a.studyStateSummary.difficulty ?? 0)
      );
    }
    const aTs = a.studyStateSummary.nextReviewAt
      ? new Date(a.studyStateSummary.nextReviewAt).getTime()
      : Number.MAX_SAFE_INTEGER;
    const bTs = b.studyStateSummary.nextReviewAt
      ? new Date(b.studyStateSummary.nextReviewAt).getTime()
      : Number.MAX_SAFE_INTEGER;
    return aTs - bTs;
  });
}

function interleaveByDifficulty(items: QueueItem[]): QueueItem[] {
  const buckets: Record<string, QueueItem[]> = {
    Easy: [],
    Medium: [],
    Hard: [],
    Unknown: [],
  };

  for (const item of sortByDueDateAsc(items)) {
    buckets[item.problem.difficulty].push(item);
  }

  const order: Array<keyof typeof buckets> = [
    "Easy",
    "Medium",
    "Hard",
    "Unknown",
  ];
  const result: QueueItem[] = [];
  let added = true;

  while (added) {
    added = false;
    for (const key of order) {
      const next = buckets[key].shift();
      if (next) {
        result.push(next);
        added = true;
      }
    }
  }

  return result;
}

function orderItems(
  items: QueueItem[],
  strategy: AppData["settings"]["memoryReview"]["reviewOrder"],
): QueueItem[] {
  if (strategy === "weakestFirst") {
    return sortWeakest(items);
  }
  if (strategy === "mixByDifficulty") {
    return interleaveByDifficulty(items);
  }
  return sortByDueDateAsc(items);
}

export function buildTodayQueue(
  data: AppData,
  now = new Date(),
): TodayQueue {
  const dailyQuestionGoal = Math.max(
    0,
    Math.round(data.settings.dailyQuestionGoal),
  );
  // Every problem in the library is queue-eligible. Track enable/disable
  // is enforced at the tracks repo level (Track.enabled column); a
  // disabled track simply doesn't surface its problems in the library
  // payload upstream. The v6 setsEnabled filter retired with Phase A.
  const problems = Object.values(data.problemsBySlug);

  const due: QueueItem[] = [];
  const newCandidates: QueueItem[] = [];
  const reinforcementCandidates: QueueItem[] = [];

  for (const problem of problems) {
    const state = cloneStateOrDefault(
      data.studyStatesBySlug[problem.leetcodeSlug],
    );
    if (isEffectivelySuspended(problem, state, data.settings)) {
      continue;
    }
    const studyStateSummary = getStudyStateSummary(
      state,
      now,
      data.settings.memoryReview.targetRetention,
    );

    if (studyStateSummary.isDue) {
      due.push({
        slug: problem.leetcodeSlug,
        problem,
        studyState: state,
        studyStateSummary,
        due: true,
        category: "due",
      });
      continue;
    }

    if (!studyStateSummary.isStarted) {
      newCandidates.push({
        slug: problem.leetcodeSlug,
        problem,
        studyState: state,
        studyStateSummary,
        due: false,
        category: "new",
      });
      continue;
    }

    reinforcementCandidates.push({
      slug: problem.leetcodeSlug,
      problem,
      studyState: state,
      studyStateSummary,
      due: false,
      category: "reinforcement",
    });
  }

  const dueOrdered = orderItems(due, data.settings.memoryReview.reviewOrder);
  const dueForQueue = dueOrdered.slice(0, dailyQuestionGoal);
  const slotsAfterDue = Math.max(0, dailyQuestionGoal - dueForQueue.length);
  const newOrdered = orderItems(
    newCandidates,
    data.settings.memoryReview.reviewOrder,
  ).slice(0, slotsAfterDue);

  const reinforcementSlots = Math.max(0, slotsAfterDue - newOrdered.length);
  const reinforcementOrdered = orderItems(
    reinforcementCandidates,
    data.settings.memoryReview.reviewOrder,
  ).slice(0, reinforcementSlots);

  return {
    generatedAt: now.toISOString(),
    dueCount: dueOrdered.length,
    newCount: newOrdered.length,
    reinforcementCount: reinforcementOrdered.length,
    items: [...dueForQueue, ...newOrdered, ...reinforcementOrdered],
  };
}
