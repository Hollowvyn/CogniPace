import { createMockAppShellPayload } from "@features/app-shell/data/mockData";
import { asProblemSlug, asTrackGroupId, asTrackId } from "@shared/ids";

import type { AppShellPayload } from "@features/app-shell";
import type { Problem } from "@features/problems";
import type { StudyState } from "@features/study";
import type { Track } from "@features/tracks";

function makeStudyState(nextReviewAt?: string): StudyState {
  return {
    attemptHistory: nextReviewAt
      ? [
          {
            reviewedAt: "2026-03-10T00:00:00.000Z",
            rating: 2,
            mode: "FULL_SOLVE",
          },
        ]
      : [],
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
          lastReview: "2026-03-10T00:00:00.000Z",
        }
      : undefined,
    suspended: false,
    tags: [],
  };
}

export function makePayload(): AppShellPayload {
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

  const blind75Problem: Problem = {
    slug: asProblemSlug("two-sum"),
    title: "Two Sum",
    difficulty: "Easy" as const,
    url: "https://leetcode.com/problems/two-sum/",
    isPremium: false,
    topicIds: [],
    companyIds: [],
    createdAt: "2026-03-01T00:00:00.000Z",
    updatedAt: "2026-03-01T00:00:00.000Z",
    studyState: makeStudyState("2026-03-30T00:00:00.000Z"),
    topics: [],
    companies: [],
  };
  const containsDuplicateProblem: Problem = {
    ...blind75Problem,
    slug: asProblemSlug("contains-duplicate"),
    title: "Contains Duplicate",
    studyState: null,
  };

  payload.problems = [
    {
      ...blind75Problem,
    },
    containsDuplicateProblem,
    {
      ...blind75Problem,
      slug: asProblemSlug("merge-intervals"),
      title: "Merge Intervals",
      difficulty: "Medium",
      studyState: makeStudyState("2026-04-02T00:00:00.000Z"),
    },
  ];
  const activeTrack: Track = {
    id: asTrackId("Blind75"),
    name: "Blind 75",
    description: "Classic interview baseline.",
    enabled: true,
    isCurated: true,
    createdAt: "2026-03-01T00:00:00.000Z",
    updatedAt: "2026-03-01T00:00:00.000Z",
    groups: [
      {
        id: asTrackGroupId("arrays-1"),
        trackId: asTrackId("Blind75"),
        name: "Arrays",
        problems: [blind75Problem, containsDuplicateProblem],
      },
    ],
  };
  payload.activeTrack = activeTrack;
  payload.tracks = [activeTrack];

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
