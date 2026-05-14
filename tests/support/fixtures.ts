/**
 * Test factories for the current branded-entity domain shapes
 * (Problem, StudyState, Topic, Company). One file, one factory per
 * type, plus a couple of preset states (`makeScheduledState`) that
 * tests reuse when they need a "due at X" study state.
 */
import { createDefaultStudyState } from "@features/study/server";
import {
  asCompanyId,
  asProblemSlug,
  asTopicId,
} from "@shared/ids";

import type { Company, Problem, Topic } from "@features/problems";
import type { StudyState } from "@features/study/server";

export const FIXTURE_NOW = "2026-03-01T00:00:00.000Z";

export function makeProblem(
  slug: string,
  overrides: Partial<Problem> = {},
): Problem {
  const branded = asProblemSlug(slug);
  return {
    leetcodeSlug: branded,
    slug: branded,
    title: overrides.title ?? "Sample Problem",
    difficulty: overrides.difficulty ?? "Medium",
    isPremium: overrides.isPremium ?? false,
    url: overrides.url ?? `https://leetcode.com/problems/${branded}/`,
    topicIds: overrides.topicIds ?? [],
    companyIds: overrides.companyIds ?? [],
    leetcodeId: overrides.leetcodeId,
    userEdits: overrides.userEdits,
    createdAt: overrides.createdAt ?? FIXTURE_NOW,
    updatedAt: overrides.updatedAt ?? FIXTURE_NOW,
  };
}

export function makeStudyState(
  overrides: Partial<StudyState> = {},
): StudyState {
  return { ...createDefaultStudyState(FIXTURE_NOW), ...overrides };
}

export function makeTopic(id: string, name: string, isCustom = false): Topic {
  return {
    id: asTopicId(id),
    name,
    isCustom,
    createdAt: FIXTURE_NOW,
    updatedAt: FIXTURE_NOW,
  };
}

export function makeCompany(
  id: string,
  name: string,
  isCustom = false,
): Company {
  return {
    id: asCompanyId(id),
    name,
    isCustom,
    createdAt: FIXTURE_NOW,
    updatedAt: FIXTURE_NOW,
  };
}

/** Builds a StudyState already on an FSRS review schedule. The card is
 *  due at `nextReviewAt`; one prior attempt is recorded so callers can
 *  exercise "has-history" code paths without constructing the timeline
 *  themselves. */
export function makeScheduledState(nextReviewAt: string): StudyState {
  return {
    ...createDefaultStudyState(FIXTURE_NOW),
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
