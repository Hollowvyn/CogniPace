import assert from "node:assert/strict";

import { createDefaultStudyState } from "../src/shared/constants";
import { listStudyPlans } from "../src/shared/curatedSets";
import { buildActiveCourseView, syncCourseProgress } from "../src/shared/courses";
import { buildTodayQueue } from "../src/shared/queue";
import { buildRecommendedCandidates } from "../src/shared/recommendations";
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

function makeReviewedState(nextReviewAt: string): StudyState {
  return {
    ...createDefaultStudyState(),
    status: "REVIEWING",
    reviewCount: 1,
    lastReviewedAt: "2026-03-10T00:00:00.000Z",
    nextReviewAt,
    intervalDays: 4,
    lastRating: 2,
    attemptHistory: [
      {
        reviewedAt: "2026-03-10T00:00:00.000Z",
        rating: 2,
        mode: "FULL_SOLVE"
      }
    ]
  };
}

function testLegacyStorageMigration(): void {
  const migrated = normalizeStoredAppData({
    problemsBySlug: {
      "two-sum": makeProblem("two-sum", "Two Sum", "Easy")
    },
    studyStatesBySlug: {
      "two-sum": makeReviewedState("2026-03-12T00:00:00.000Z")
    },
    settings: {
      activeStudyPlanId: "Blind75",
      dailyNewLimit: 5
    }
  });

  assert.equal(migrated.settings.activeCourseId, "Blind75");
  assert.ok(migrated.coursesById.Blind75);
  assert.ok(migrated.courseProgressById.Blind75);

  const activeChapterId = migrated.courseProgressById.Blind75.activeChapterId;
  const chapterProgress = migrated.courseProgressById.Blind75.chapterProgressById[activeChapterId];
  assert.ok(chapterProgress);
}

function testCourseProgressionSelection(): void {
  const data = normalizeStoredAppData({
    settings: {
      activeStudyPlanId: "Blind75"
    }
  });

  data.problemsBySlug["two-sum"] = makeProblem("two-sum", "Two Sum", "Easy");
  data.problemsBySlug["best-time-to-buy-and-sell-stock"] = makeProblem(
    "best-time-to-buy-and-sell-stock",
    "Best Time To Buy And Sell Stock",
    "Easy"
  );
  data.studyStatesBySlug["two-sum"] = makeReviewedState("2026-03-11T00:00:00.000Z");
  data.studyStatesBySlug["best-time-to-buy-and-sell-stock"] = makeReviewedState("2026-03-14T00:00:00.000Z");

  syncCourseProgress(data, "2026-03-15T00:00:00.000Z");
  const active = buildActiveCourseView(data, "Blind75");

  assert.ok(active);
  assert.equal(active?.nextQuestion?.slug, "contains-duplicate");
  assert.equal(active?.chapters[0].status, "CURRENT");
}

function testRecommendedAndCourseNextStaySeparate(): void {
  const data = normalizeStoredAppData({
    settings: {
      activeStudyPlanId: "Blind75"
    }
  });

  data.problemsBySlug["two-sum"] = makeProblem("two-sum", "Two Sum", "Easy");
  data.problemsBySlug["best-time-to-buy-and-sell-stock"] = makeProblem(
    "best-time-to-buy-and-sell-stock",
    "Best Time To Buy And Sell Stock",
    "Easy"
  );
  data.studyStatesBySlug["two-sum"] = makeReviewedState("2026-03-01T00:00:00.000Z");
  data.studyStatesBySlug["best-time-to-buy-and-sell-stock"] = makeReviewedState("2026-04-01T00:00:00.000Z");

  syncCourseProgress(data, "2026-03-15T00:00:00.000Z");
  const queue = buildTodayQueue(data, new Date("2026-03-15T00:00:00.000Z"));
  const active = buildActiveCourseView(data, "Blind75");
  const recommended = buildRecommendedCandidates(queue, active?.nextQuestion?.slug, new Date("2026-03-15T00:00:00.000Z").getTime());

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

function run(): void {
  testLegacyStorageMigration();
  testCourseProgressionSelection();
  testRecommendedAndCourseNextStaySeparate();
  testByteByteGoCourseSeed();
  console.log("logic tests passed");
}

run();
