import assert from "node:assert/strict";

import { describe, it } from "vitest";

import { normalizeStoredAppData } from "../../src/data/repositories/appDataRepository";
import { getStudyStateSummary } from "../../src/domain/fsrs/studyState";
import { StudyState } from "../../src/domain/types";
import {
  makeLegacyReviewedFixture,
  makeProblem,
  makeScheduledState,
} from "../support/domainFixtures";

describe("storage migration", () => {
  it("rebuilds legacy review history into an FSRS card", () => {
    const migrated = normalizeStoredAppData({
      problemsBySlug: {
        "two-sum": makeProblem("two-sum", "Two Sum", "Easy"),
      },
      studyStatesBySlug: {
        "two-sum": makeLegacyReviewedFixture("2026-03-12T00:00:00.000Z", true),
      },
      settings: {
        activeCourseId: "Blind75",
        dailyNewLimit: 5,
      },
    });

    assert.equal(migrated.settings.activeCourseId, "Blind75");
    assert.equal(migrated.settings.dailyQuestionGoal, 18);
    assert.ok(migrated.coursesById.Blind75);
    assert.ok(migrated.courseProgressById.Blind75);

    const summary = getStudyStateSummary(migrated.studyStatesBySlug["two-sum"]);
    assert.ok(migrated.studyStatesBySlug["two-sum"]?.fsrsCard);
    assert.equal(summary.reviewCount, 1);
    assert.equal(summary.phase, "Review");
  });

  it("preserves an existing FSRS card without history", () => {
    const scheduled = makeScheduledState("2026-03-12T00:00:00.000Z");
    const migrated = normalizeStoredAppData({
      studyStatesBySlug: {
        "two-sum": {
          ...scheduled,
          attemptHistory: [],
        },
      },
    });

    const summary = getStudyStateSummary(migrated.studyStatesBySlug["two-sum"]);
    assert.equal(summary.nextReviewAt, "2026-03-12T00:00:00.000Z");
    assert.equal(summary.phase, "Review");
  });

  it("derives the total daily question goal from complete legacy limits", () => {
    const migrated = normalizeStoredAppData({
      settings: {
        dailyNewLimit: 6,
        dailyReviewLimit: 14,
      },
    });

    assert.equal(migrated.settings.dailyQuestionGoal, 20);
  });

  it("converts legacy fallback schedule data without history", () => {
    const migrated = normalizeStoredAppData({
      studyStatesBySlug: {
        "two-sum": makeLegacyReviewedFixture("2026-03-12T00:00:00.000Z", false),
      },
    });

    const summary = getStudyStateSummary(migrated.studyStatesBySlug["two-sum"]);
    assert.equal(summary.nextReviewAt, "2026-03-12T00:00:00.000Z");
    assert.equal(summary.phase, "Review");
  });

  it("migrates legacy notes snapshots into structured logs", () => {
    const migrated = normalizeStoredAppData({
      studyStatesBySlug: {
        "two-sum": {
          attemptHistory: [
            {
              reviewedAt: "2026-03-10T00:00:00.000Z",
              rating: 2,
              mode: "FULL_SOLVE",
              notesSnapshot: "Remember the complement map.",
            },
          ],
          suspended: false,
          tags: [],
        } as unknown as StudyState,
      },
    });

    const nextState = migrated.studyStatesBySlug["two-sum"];
    assert.equal(nextState?.notes, "Remember the complement map.");
    assert.equal(
      nextState?.attemptHistory[0]?.logSnapshot?.notes,
      "Remember the complement map."
    );
  });
});
