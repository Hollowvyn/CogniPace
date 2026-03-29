import assert from "node:assert/strict";

import { createDefaultStudyState, DEFAULT_SETTINGS } from "../src/shared/constants";
import { listStudyPlans } from "../src/shared/curatedSets";
import { buildActiveCourseView, syncCourseProgress } from "../src/shared/courses";
import { buildTodayQueue } from "../src/shared/queue";
import { buildRecommendedCandidates } from "../src/shared/recommendations";
import { applyReview } from "../src/shared/scheduler";
import { getStudyStateSummary } from "../src/shared/studyState";
import { normalizeStoredAppData } from "../src/shared/storage";
import { Problem, StudyState } from "../src/shared/types";

function makeProblem(slug: string, title: string, difficulty: Problem["difficulty"] = "Medium"): Problem {
  return {
    id: slug,
    leetcodeSlug: slug,
    title,
    difficulty,
    url: `https://leetcode.com/problems/${slug}/`,
    topics: [],
    sourceSet: ["Blind75"],
    createdAt: "2026-03-01T00:00:00.000Z",
    updatedAt: "2026-03-01T00:00:00.000Z"
  };
}

function makeScheduledState(nextReviewAt: string): StudyState {
  return {
    ...createDefaultStudyState(),
    lastRating: 2,
    attemptHistory: [
      {
        reviewedAt: "2026-03-10T00:00:00.000Z",
        rating: 2,
        mode: "FULL_SOLVE"
      }
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
      lastReview: "2026-03-10T00:00:00.000Z"
    }
  };
}

function makeLegacyReviewedFixture(nextReviewAt: string, withHistory = true): StudyState {
  return {
    ...createDefaultStudyState(),
    attemptHistory: withHistory
      ? [
          {
            reviewedAt: "2026-03-10T00:00:00.000Z",
            rating: 2,
            mode: "FULL_SOLVE"
          }
        ]
      : [],
    lastRating: 2,
    status: "REVIEWING",
    reviewCount: 1,
    lastReviewedAt: "2026-03-10T00:00:00.000Z",
    nextReviewAt,
    intervalDays: 4
  } as unknown as StudyState;
}

function testLegacyStorageMigrationRebuildsHistoryIntoFsrsCard(): void {
  const migrated = normalizeStoredAppData({
    problemsBySlug: {
      "two-sum": makeProblem("two-sum", "Two Sum", "Easy")
    },
    studyStatesBySlug: {
      "two-sum": makeLegacyReviewedFixture("2026-03-12T00:00:00.000Z", true)
    },
    settings: {
      activeCourseId: "Blind75",
      dailyNewLimit: 5
    }
  });

  assert.equal(migrated.settings.activeCourseId, "Blind75");
  assert.ok(migrated.coursesById.Blind75);
  assert.ok(migrated.courseProgressById.Blind75);

  const summary = getStudyStateSummary(migrated.studyStatesBySlug["two-sum"]);
  assert.ok(migrated.studyStatesBySlug["two-sum"]?.fsrsCard);
  assert.equal(summary.reviewCount, 1);
  assert.equal(summary.phase, "Review");
}

function testStorageMigrationPreservesExistingFsrsCardWithoutHistory(): void {
  const scheduled = makeScheduledState("2026-03-12T00:00:00.000Z");
  const migrated = normalizeStoredAppData({
    studyStatesBySlug: {
      "two-sum": {
        ...scheduled,
        attemptHistory: []
      }
    }
  });

  const summary = getStudyStateSummary(migrated.studyStatesBySlug["two-sum"]);
  assert.equal(summary.nextReviewAt, "2026-03-12T00:00:00.000Z");
  assert.equal(summary.phase, "Review");
}

function testLegacyFallbackConvertsWithoutHistory(): void {
  const migrated = normalizeStoredAppData({
    studyStatesBySlug: {
      "two-sum": makeLegacyReviewedFixture("2026-03-12T00:00:00.000Z", false)
    }
  });

  const summary = getStudyStateSummary(migrated.studyStatesBySlug["two-sum"]);
  assert.equal(summary.nextReviewAt, "2026-03-12T00:00:00.000Z");
  assert.equal(summary.phase, "Review");
}

function testCourseProgressionSelection(): void {
  const data = normalizeStoredAppData({
    settings: {
      activeCourseId: "Blind75"
    }
  });

  data.problemsBySlug["two-sum"] = makeProblem("two-sum", "Two Sum", "Easy");
  data.problemsBySlug["best-time-to-buy-and-sell-stock"] = makeProblem(
    "best-time-to-buy-and-sell-stock",
    "Best Time To Buy And Sell Stock",
    "Easy"
  );
  data.studyStatesBySlug["two-sum"] = makeScheduledState("2026-03-11T00:00:00.000Z");
  data.studyStatesBySlug["best-time-to-buy-and-sell-stock"] = makeScheduledState("2026-03-14T00:00:00.000Z");

  syncCourseProgress(data, "2026-03-15T00:00:00.000Z");
  const active = buildActiveCourseView(data, "Blind75");

  assert.ok(active);
  assert.equal(active?.nextQuestion?.slug, "contains-duplicate");
  assert.equal(active?.chapters[0].status, "CURRENT");
}

function testRecommendedAndCourseNextStaySeparate(): void {
  const data = normalizeStoredAppData({
    settings: {
      activeCourseId: "Blind75"
    }
  });

  data.problemsBySlug["two-sum"] = makeProblem("two-sum", "Two Sum", "Easy");
  data.problemsBySlug["best-time-to-buy-and-sell-stock"] = makeProblem(
    "best-time-to-buy-and-sell-stock",
    "Best Time To Buy And Sell Stock",
    "Easy"
  );
  data.studyStatesBySlug["two-sum"] = makeScheduledState("2026-03-01T00:00:00.000Z");
  data.studyStatesBySlug["best-time-to-buy-and-sell-stock"] = makeScheduledState("2026-04-01T00:00:00.000Z");

  syncCourseProgress(data, "2026-03-15T00:00:00.000Z");
  const queue = buildTodayQueue(data, new Date("2026-03-15T00:00:00.000Z"));
  const active = buildActiveCourseView(data, "Blind75");
  const recommended = buildRecommendedCandidates(
    queue,
    active?.nextQuestion?.slug,
    new Date("2026-03-15T00:00:00.000Z").getTime()
  );

  assert.ok(active?.nextQuestion);
  assert.equal(active?.nextQuestion?.slug, "contains-duplicate");
  assert.equal(recommended[0]?.slug, "two-sum");
  assert.equal(recommended[0]?.alsoCourseNext, false);
}

function testByteByteGoCourseSeed(): void {
  const data = normalizeStoredAppData();
  const summary = listStudyPlans().find((plan) => plan.id === "ByteByteGo101");
  const course = buildActiveCourseView(data, "ByteByteGo101");

  assert.ok(summary);
  assert.equal(summary?.problemCount, 101);
  assert.equal(summary?.topicCount, 19);

  assert.ok(course);
  assert.equal(course?.name, "ByteByteGo Coding Patterns 101");
  assert.equal(course?.totalQuestions, 101);
  assert.equal(course?.totalChapters, 19);
  assert.equal(course?.nextQuestion?.title, "Pair Sum - Sorted");
  assert.equal(course?.nextQuestion?.difficulty, "Easy");
  assert.equal(course?.nextQuestion?.slug, "two-sum-ii-input-array-is-sorted");
}

function testFsrsReviewUsesExactIntervals(): void {
  const reviewed = applyReview({
    rating: 2,
    difficulty: "Medium",
    settings: DEFAULT_SETTINGS,
    now: "2026-03-01T15:00:00.000Z"
  });

  const summary = getStudyStateSummary(reviewed, new Date("2026-03-01T15:00:00.000Z"));
  assert.equal(summary.reviewCount, 1);
  assert.equal(summary.phase, "Review");
  assert.equal(summary.nextReviewAt, "2026-03-04T15:00:00.000Z");
  assert.equal(reviewed.fsrsCard?.scheduledDays, 3);
}

function testEarlyRepeatFollowsRawFsrsOutput(): void {
  const first = applyReview({
    rating: 2,
    difficulty: "Medium",
    settings: DEFAULT_SETTINGS,
    now: "2026-03-25T15:00:00.000Z"
  });

  const second = applyReview({
    state: first,
    rating: 2,
    difficulty: "Medium",
    settings: DEFAULT_SETTINGS,
    now: "2026-03-25T18:00:00.000Z"
  });

  const firstDue = new Date(getStudyStateSummary(first).nextReviewAt!);
  const secondDue = new Date(getStudyStateSummary(second).nextReviewAt!);

  assert.equal(firstDue.getUTCHours(), 15);
  assert.ok(secondDue.getTime() > firstDue.getTime());
}

function run(): void {
  testLegacyStorageMigrationRebuildsHistoryIntoFsrsCard();
  testStorageMigrationPreservesExistingFsrsCardWithoutHistory();
  testLegacyFallbackConvertsWithoutHistory();
  testCourseProgressionSelection();
  testRecommendedAndCourseNextStaySeparate();
  testByteByteGoCourseSeed();
  testFsrsReviewUsesExactIntervals();
  testEarlyRepeatFollowsRawFsrsOutput();
  console.log("logic tests passed");
}

run();
