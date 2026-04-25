import assert from "node:assert/strict";

import { describe, it } from "vitest";

import { normalizeStoredAppData } from "../../src/data/repositories/appDataRepository";
import {
  buildActiveCourseView,
  syncCourseProgress,
} from "../../src/domain/courses/courseProgress";
import { listStudyPlans } from "../../src/domain/courses/curatedSets";
import { makeProblem, makeScheduledState } from "../support/domainFixtures";

describe("course progression", () => {
  it("selects the next course question after reviewed problems", () => {
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
      "2026-03-11T00:00:00.000Z"
    );
    data.studyStatesBySlug["best-time-to-buy-and-sell-stock"] =
      makeScheduledState("2026-03-14T00:00:00.000Z");

    syncCourseProgress(data, "2026-03-15T00:00:00.000Z");
    const active = buildActiveCourseView(data, "Blind75");

    assert.ok(active);
    assert.equal(active?.nextQuestion?.slug, "contains-duplicate");
    assert.equal(active?.chapters[0].status, "CURRENT");
  });

  it("seeds the ByteByteGo course catalog", () => {
    const data = normalizeStoredAppData();
    const summary = listStudyPlans().find(
      (plan) => plan.id === "ByteByteGo101"
    );
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
    assert.equal(
      course?.nextQuestion?.slug,
      "two-sum-ii-input-array-is-sorted"
    );
  });
});
