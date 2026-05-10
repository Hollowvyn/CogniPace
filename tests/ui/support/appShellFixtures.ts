import { StudyState, StudyStateSummary } from "../../../src/domain/types";
import { TrackQuestionView, StudyStateView } from "../../../src/domain/views";
import { createMockAppShellPayload } from "../../../src/ui/mockData";

/** Wrap a bare summary into a StudyStateView for fixture rows. */
function viewFromSummary(summary: StudyStateSummary): StudyStateView {
  return {
    ...summary,
    recentAttempts: [],
    tags: [],
  };
}

export function makeStudyState(nextReviewAt?: string): StudyState {
  return {
    attemptHistory: [],
    fsrsCard: nextReviewAt
      ? {
          difficulty: 4,
          due: nextReviewAt,
          elapsedDays: 2,
          lapses: 0,
          learningSteps: 0,
          reps: 1,
          scheduledDays: 2,
          stability: 2,
          state: "Review",
        }
      : undefined,
    suspended: false,
    tags: [],
  };
}

export function makePayload() {
  const payload = createMockAppShellPayload();
  payload.popup.recommended = {
    slug: "two-sum",
    title: "Two Sum",
    url: "https://leetcode.com/problems/two-sum/",
    difficulty: "Easy",
    reason: "Due now",
    nextReviewAt: "2026-03-30T00:00:00.000Z",
    alsoCourseNext: false,
  };
  payload.popup.recommendedCandidates = [
    payload.popup.recommended,
    {
      slug: "group-anagrams",
      title: "Group Anagrams",
      url: "https://leetcode.com/problems/group-anagrams/",
      difficulty: "Medium",
      reason: "Review focus",
      nextReviewAt: "2026-03-31T00:00:00.000Z",
      alsoCourseNext: true,
    },
  ] as NonNullable<typeof payload.popup.recommended>[];

  const nextQuestion: TrackQuestionView = {
    slug: "contains-duplicate",
    title: "Contains Duplicate",
    url: "https://leetcode.com/problems/contains-duplicate/",
    difficulty: "Easy",
    chapterId: "arrays-1",
    chapterTitle: "Arrays",
    status: "READY",
    reviewPhase: "Review",
    nextReviewAt: "2026-03-30T00:00:00.000Z",
    inLibrary: true,
    isCurrent: true,
  };

  payload.popup.trackNext = nextQuestion;
  payload.popup.activeTrack = {
    id: "Blind75",
    name: "Blind 75",
    description: "Classic interview baseline.",
    sourceSet: "Blind75",
    active: true,
    totalQuestions: 75,
    completedQuestions: 15,
    completionPercent: 20,
    dueCount: 2,
    totalChapters: 8,
    completedChapters: 2,
    nextQuestionTitle: "Contains Duplicate",
    nextChapterTitle: "Arrays",
  };

  payload.activeTrack = {
    ...payload.popup.activeTrack,
    activeChapterId: "arrays-1",
    activeChapterTitle: "Arrays",
    nextQuestion,
    chapters: [
      {
        id: "arrays-1",
        title: "Arrays",
        order: 1,
        status: "CURRENT",
        totalQuestions: 2,
        completedQuestions: 1,
        questions: [
          nextQuestion,
          {
            ...nextQuestion,
            slug: "two-sum",
            title: "Two Sum",
            status: "DUE_NOW",
            isCurrent: false,
          },
        ],
      },
    ],
  };

  payload.queue.items = [
    {
      slug: "two-sum",
      problem: {
        id: "1",
        leetcodeSlug: "two-sum",
        slug: "two-sum",
        title: "Two Sum",
        difficulty: "Easy",
        url: "https://leetcode.com/problems/two-sum/",
        topics: [],
        topicIds: [],
        companyIds: [],
        sourceSet: ["Blind75"],
        createdAt: "2026-03-01T00:00:00.000Z",
        updatedAt: "2026-03-01T00:00:00.000Z",
      },
      studyState: makeStudyState("2026-03-30T00:00:00.000Z"),
      studyStateSummary: {
        phase: "Review",
        nextReviewAt: "2026-03-30T00:00:00.000Z",
        lastReviewedAt: "2026-03-29T00:00:00.000Z",
        reviewCount: 1,
        lapses: 0,
        difficulty: 4,
        stability: 2,
        scheduledDays: 2,
        suspended: false,
        isStarted: true,
        isDue: true,
        isOverdue: false,
        overdueDays: 0,
      },
      due: true,
      category: "due",
    },
  ];

  const blind75Problem = payload.queue.items[0].problem;
  const mergeIntervalsProblem = {
    ...payload.queue.items[0].problem,
    id: "2",
    leetcodeSlug: "merge-intervals",
    slug: "merge-intervals",
    title: "Merge Intervals",
    difficulty: "Medium" as const,
    url: "https://leetcode.com/problems/merge-intervals/",
  };

  payload.library = [
    {
      problem: blind75Problem,
      studyState: viewFromSummary(payload.queue.items[0].studyStateSummary),
      view: {
        slug: blind75Problem.slug,
        title: blind75Problem.title,
        difficulty: blind75Problem.difficulty,
        isPremium: blind75Problem.isPremium ?? false,
        url: blind75Problem.url,
        topics: [],
        companies: [],
        editedFields: [],
      },
      trackMemberships: [],
    },
    {
      problem: mergeIntervalsProblem,
      studyState: viewFromSummary({
        phase: "Learning",
        nextReviewAt: "2026-04-02T00:00:00.000Z",
        lastReviewedAt: "2026-03-28T00:00:00.000Z",
        reviewCount: 0,
        lapses: 0,
        difficulty: 5,
        stability: 1,
        scheduledDays: 1,
        suspended: false,
        isStarted: true,
        isDue: false,
        isOverdue: false,
        overdueDays: 0,
      }),
      view: {
        slug: mergeIntervalsProblem.slug,
        title: mergeIntervalsProblem.title,
        difficulty: mergeIntervalsProblem.difficulty,
        isPremium: mergeIntervalsProblem.isPremium ?? false,
        url: mergeIntervalsProblem.url,
        topics: [],
        companies: [],
        editedFields: [],
      },
      trackMemberships: [],
    },
  ];

  return payload;
}

export function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, reject, resolve };
}
