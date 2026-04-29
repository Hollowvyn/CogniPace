import { createDefaultStudyState } from "./constants";
import { getStudyStateSummary } from "./studyState";
import { AppData, Problem, QueueItem, StudyState } from "./types";

function cloneStateOrDefault(state?: StudyState): StudyState {
  return state ? { ...state } : createDefaultStudyState();
}

function isSetEnabled(
  problem: Problem,
  setsEnabled: Record<string, boolean>
): boolean {
  if (problem.sourceSet.length === 0) {
    return setsEnabled.Custom !== false;
  }

  return problem.sourceSet.some((set) => setsEnabled[set] !== false);
}

function hasPremiumMetadata(problem: Problem): boolean {
  const candidate = problem as Problem & {
    isPremium?: boolean;
    paidOnly?: boolean;
    premium?: boolean;
  };

  return (
    candidate.isPremium === true ||
    candidate.paidOnly === true ||
    candidate.premium === true
  );
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
  strategy: AppData["settings"]["reviewOrder"]
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
  now = new Date()
): {
  generatedAt: string;
  dueCount: number;
  newCount: number;
  reinforcementCount: number;
  items: QueueItem[];
} {
  const dailyQuestionGoal = Math.max(
    0,
    Math.round(data.settings.dailyQuestionGoal)
  );
  const problems = Object.values(data.problemsBySlug).filter((problem) => {
    if (!isSetEnabled(problem, data.settings.setsEnabled)) {
      return false;
    }

    if (data.settings.skipPremiumQuestions && hasPremiumMetadata(problem)) {
      return false;
    }

    return true;
  });

  const due: QueueItem[] = [];
  const newCandidates: QueueItem[] = [];
  const reinforcementCandidates: QueueItem[] = [];

  for (const problem of problems) {
    const state = cloneStateOrDefault(
      data.studyStatesBySlug[problem.leetcodeSlug]
    );
    const studyStateSummary = getStudyStateSummary(
      state,
      now,
      data.settings.targetRetention
    );
    if (data.settings.skipIgnoredQuestions && studyStateSummary.suspended) {
      continue;
    }

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

  const dueOrdered = orderItems(due, data.settings.reviewOrder);
  const dueForQueue = dueOrdered.slice(0, dailyQuestionGoal);
  const slotsAfterDue = Math.max(0, dailyQuestionGoal - dueForQueue.length);
  const newOrdered = orderItems(newCandidates, data.settings.reviewOrder).slice(
    0,
    slotsAfterDue
  );

  const reinforcementSlots = Math.max(0, slotsAfterDue - newOrdered.length);
  const reinforcementOrdered = orderItems(
    reinforcementCandidates,
    data.settings.reviewOrder
  ).slice(0, reinforcementSlots);

  return {
    generatedAt: now.toISOString(),
    dueCount: dueOrdered.length,
    newCount: newOrdered.length,
    reinforcementCount: reinforcementOrdered.length,
    items: [...dueForQueue, ...newOrdered, ...reinforcementOrdered],
  };
}
