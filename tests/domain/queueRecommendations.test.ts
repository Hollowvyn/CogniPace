import assert from "node:assert/strict";

import { describe, it } from "vitest";

import { normalizeStoredAppData } from "../../src/data/repositories/appDataRepository";
import {
  buildActiveCourseView,
  syncCourseProgress,
} from "../../src/domain/courses/courseProgress";
import { buildRecommendedCandidates } from "../../src/domain/queue/buildRecommendedCandidates";
import { buildTodayQueue } from "../../src/domain/queue/buildTodayQueue";
import { makeProblem, makeScheduledState } from "../support/domainFixtures";

describe("queue recommendations", () => {
  it("keeps the recommended review and course-next problem separate", () => {
    const data = normalizeStoredAppData({
      settings: {
        activeCourseId: "Blind75",
      },
    });

    data.problemsBySlug["two-sum"] = makeProblem("two-sum", "Two Sum", "Easy");
    data.problemsBySlug["best-time-to-buy-and-sell-stock"] = makeProblem(
      "best-time-to-buy-and-sell-stock",
      "Best Time To Buy And Sell Stock",
      "Easy"
    );
    data.studyStatesBySlug["two-sum"] = makeScheduledState(
      "2026-03-01T00:00:00.000Z"
    );
    data.studyStatesBySlug["best-time-to-buy-and-sell-stock"] =
      makeScheduledState("2026-04-01T00:00:00.000Z");

    syncCourseProgress(data, "2026-03-15T00:00:00.000Z");
    const queue = buildTodayQueue(data, new Date("2026-04-15T00:00:00.000Z"));
    const active = buildActiveCourseView(data, "Blind75");
    const recommended = buildRecommendedCandidates(
      queue,
      active?.nextQuestion?.slug
    );

    assert.ok(active?.nextQuestion);
    assert.equal(active?.nextQuestion?.slug, "contains-duplicate");
    assert.equal(recommended[0]?.slug, "two-sum");
    assert.equal(recommended[0]?.alsoCourseNext, false);
  });

  it("uses the total daily question goal and skips ignored or premium problems", () => {
    const data = normalizeStoredAppData({
      settings: {
        dailyQuestionGoal: 2,
        skipIgnoredQuestions: true,
        skipPremiumQuestions: true,
      },
    });

    data.problemsBySlug["two-sum"] = makeProblem("two-sum", "Two Sum", "Easy");
    data.problemsBySlug["group-anagrams"] = makeProblem(
      "group-anagrams",
      "Group Anagrams",
      "Medium"
    );
    data.problemsBySlug["ignored-problem"] = makeProblem(
      "ignored-problem",
      "Ignored Problem",
      "Medium"
    );
    data.problemsBySlug["premium-problem"] = {
      ...makeProblem("premium-problem", "Premium Problem", "Hard"),
      isPremium: true,
    } as (typeof data.problemsBySlug)["two-sum"];

    data.studyStatesBySlug["two-sum"] = makeScheduledState(
      "2026-03-01T00:00:00.000Z"
    );
    data.studyStatesBySlug["group-anagrams"] = makeScheduledState(
      "2026-03-02T00:00:00.000Z"
    );
    data.studyStatesBySlug["ignored-problem"] = {
      ...makeScheduledState("2026-03-03T00:00:00.000Z"),
      suspended: true,
    };
    data.studyStatesBySlug["premium-problem"] = makeScheduledState(
      "2026-03-04T00:00:00.000Z"
    );

    const queue = buildTodayQueue(data, new Date("2026-04-15T00:00:00.000Z"));

    assert.equal(queue.dueCount, 2);
    assert.deepEqual(
      queue.items.map((item) => item.slug),
      ["two-sum", "group-anagrams"]
    );
  });
});
