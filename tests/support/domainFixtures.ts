import { createDefaultStudyState } from "../../src/domain/common/constants";
import { Problem, StudyState } from "../../src/domain/types";

export function makeProblem(
  slug: string,
  title: string,
  difficulty: Problem["difficulty"] = "Medium",
  isPremium?: boolean
): Problem {
  return {
    id: slug,
    leetcodeSlug: slug,
    title,
    difficulty,
    isPremium,
    url: `https://leetcode.com/problems/${slug}/`,
    topics: [],
    sourceSet: ["Blind75"],
    createdAt: "2026-03-01T00:00:00.000Z",
    updatedAt: "2026-03-01T00:00:00.000Z",
  };
}

export function makeScheduledState(nextReviewAt: string): StudyState {
  return {
    ...createDefaultStudyState(),
    lastRating: 2,
    attemptHistory: [
      {
        reviewedAt: "2026-03-10T00:00:00.000Z",
        rating: 2,
        mode: "FULL_SOLVE",
      },
    ],
    fsrsCard: {
      due: nextReviewAt,
      stability: 4,
      difficulty: 5,
      elapsedDays: 4,
      scheduledDays: 4,
      learningSteps: 0,
      reps: 1,
      lapses: 0,
      state: "Review",
      lastReview: "2026-03-10T00:00:00.000Z",
    },
  };
}

export function makeLegacyReviewedFixture(
  nextReviewAt: string,
  withHistory = true
): StudyState {
  return {
    ...createDefaultStudyState(),
    attemptHistory: withHistory
      ? [
          {
            reviewedAt: "2026-03-10T00:00:00.000Z",
            rating: 2,
            mode: "FULL_SOLVE",
          },
        ]
      : [],
    lastRating: 2,
    status: "REVIEWING",
    reviewCount: 1,
    lastReviewedAt: "2026-03-10T00:00:00.000Z",
    nextReviewAt,
    intervalDays: 4,
  } as unknown as StudyState;
}
