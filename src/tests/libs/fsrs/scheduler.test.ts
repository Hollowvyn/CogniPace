import assert from "node:assert/strict";

import { createInitialUserSettings } from "@features/settings";
import { StudyPhaseEnum, type Rating, type StudyState } from "@features/study";
import {
  applyReview,
  overrideLastReview,
} from "@libs/fsrs/scheduler";
import {
  getStudyStateSummary,
  scheduler,
  serializeFsrsCard,
  toFsrsRating,
} from "@libs/fsrs/studyState";
import { createEmptyCard } from "ts-fsrs";
import { describe, it } from "vitest";



const settings = createInitialUserSettings();

describe("FSRS scheduler", () => {
  it("uses a short-term learning step for the first Good review", () => {
    const first = applyReview({
      rating: 2,
      difficulty: "Medium",
      settings,
      now: "2026-03-01T15:00:00.000Z",
    });

    const firstSummary = getStudyStateSummary(
      first,
      new Date("2026-03-01T15:00:00.000Z")
    );
    assert.equal(firstSummary.reviewCount, 1);
    assert.equal(firstSummary.phase, "Learning");
    assert.equal(firstSummary.nextReviewAt, "2026-03-01T15:10:00.000Z");
    assert.equal(first.fsrsCard?.scheduledDays, 0);

    const second = applyReview({
      state: first,
      rating: 2,
      difficulty: "Medium",
      settings,
      now: "2026-03-01T15:10:00.000Z",
    });
    const secondSummary = getStudyStateSummary(
      second,
      new Date("2026-03-01T15:10:00.000Z")
    );
    assert.equal(secondSummary.phase, "Review");
    assert.equal(secondSummary.nextReviewAt, "2026-03-03T15:10:00.000Z");
    assert.equal(second.fsrsCard?.scheduledDays, 2);
  });

  it("keeps suspension outside the FSRS phase enum", () => {
    const reviewed = applyReview({
      rating: 2,
      difficulty: "Medium",
      settings,
      now: "2026-03-01T15:00:00.000Z",
    });
    const suspended = { ...reviewed, suspended: true };
    const summary = getStudyStateSummary(
      suspended,
      new Date("2026-03-01T15:00:00.000Z")
    );

    assert.equal(StudyPhaseEnum.New, 0);
    assert.equal(StudyPhaseEnum.Learning, 1);
    assert.equal("Suspended" in StudyPhaseEnum, false);
    assert.equal(reviewed.fsrsCard?.state, "Learning");
    assert.equal(summary.phase, "Suspended");
    assert.equal(summary.suspended, true);
  });

  it("follows raw FSRS output for early repeats", () => {
    let rawCard = createEmptyCard(new Date("2026-03-25T15:00:00.000Z"));

    const first = applyReview({
      rating: 2,
      difficulty: "Medium",
      settings,
      now: "2026-03-25T15:00:00.000Z",
    });
    rawCard = scheduler.repeat(rawCard, new Date("2026-03-25T15:00:00.000Z"))[
      toFsrsRating(2)
    ].card;

    const second = applyReview({
      state: first,
      rating: 2,
      difficulty: "Medium",
      settings,
      now: "2026-03-25T18:00:00.000Z",
    });
    rawCard = scheduler.repeat(rawCard, new Date("2026-03-25T18:00:00.000Z"))[
      toFsrsRating(2)
    ].card;

    const firstDue = new Date(getStudyStateSummary(first).nextReviewAt!);
    const secondDue = new Date(getStudyStateSummary(second).nextReviewAt!);

    assert.equal(firstDue.getUTCHours(), 15);
    assert.ok(secondDue.getTime() > firstDue.getTime());
    assert.deepEqual(second.fsrsCard, serializeFsrsCard(rawCard));
  });

  it("matches the raw FSRS scheduler across sequential reviews", () => {
    const ratings: Rating[] = [2, 2, 2, 1];
    let rawCard = createEmptyCard(new Date("2026-03-01T15:00:00.000Z"));
    let appState: StudyState | undefined;
    let reviewAt = new Date("2026-03-01T15:00:00.000Z");

    for (const rating of ratings) {
      rawCard = scheduler.repeat(rawCard, reviewAt)[toFsrsRating(rating)].card;
      appState = applyReview({
        state: appState,
        rating,
        settings,
        now: reviewAt.toISOString(),
      });

      assert.deepEqual(appState.fsrsCard, serializeFsrsCard(rawCard));
      reviewAt = rawCard.due;
    }
  });

  it("matches the raw FSRS scheduler for same-moment rapid resubmits", () => {
    const ratings: Rating[] = [3, 3, 3, 2, 2];
    const reviewAt = new Date("2026-03-29T21:00:00.000Z");
    let rawCard = createEmptyCard(reviewAt);
    let appState: StudyState | undefined;

    for (const rating of ratings) {
      rawCard = scheduler.repeat(rawCard, reviewAt)[toFsrsRating(rating)].card;
      appState = applyReview({
        state: appState,
        rating,
        settings,
        now: reviewAt.toISOString(),
      });

      assert.deepEqual(appState.fsrsCard, serializeFsrsCard(rawCard));
    }
  });

  it("rebuilds FSRS from replaced history when overriding the last review", () => {
    const first = applyReview({
      rating: 2,
      logSnapshot: {
        interviewPattern: "Hash map lookup",
        notes: "Track complements.",
      },
      settings,
      now: "2026-03-01T15:00:00.000Z",
    });

    const second = applyReview({
      state: first,
      rating: 1,
      logSnapshot: {
        interviewPattern: "Sliding window",
        languages: "TypeScript",
        notes: "Missed a boundary case.",
      },
      settings,
      now: "2026-03-03T15:00:00.000Z",
    });

    const overridden = overrideLastReview({
      state: second,
      rating: 3,
      logSnapshot: {
        interviewPattern: "Two pointers",
        timeComplexity: "O(n)",
        spaceComplexity: "O(1)",
        languages: "TypeScript",
        notes: "Use mirrored indices.",
      },
      settings,
      now: "2026-03-03T15:00:00.000Z",
    });

    const replayed = applyReview({
      state: first,
      rating: 3,
      logSnapshot: {
        interviewPattern: "Two pointers",
        timeComplexity: "O(n)",
        spaceComplexity: "O(1)",
        languages: "TypeScript",
        notes: "Use mirrored indices.",
      },
      settings,
      now: "2026-03-03T15:00:00.000Z",
    });

    assert.equal(overridden.attemptHistory.length, 2);
    assert.deepEqual(overridden.fsrsCard, replayed.fsrsCard);
    assert.equal(
      overridden.attemptHistory[1]?.logSnapshot?.interviewPattern,
      "Two pointers"
    );
    assert.equal(overridden.interviewPattern, "Two pointers");
    assert.equal(overridden.timeComplexity, "O(n)");
    assert.equal(overridden.spaceComplexity, "O(1)");
    assert.equal(overridden.languages, "TypeScript");
    assert.equal(overridden.notes, "Use mirrored indices.");
  });

  it.each([
    { now: "2026-03-01T15:05:00.000Z", target: 0.85, expectedDue: false },
    { now: "2026-03-03T15:00:00.000Z", target: 0.95, expectedDue: true },
    { now: "2026-03-02T15:00:00.000Z", target: 0.70, expectedDue: false },
  ])(
    "calculates isDue as $expectedDue for target $target at $now",
    ({ now, target, expectedDue }) => {
      const state = applyReview({
        rating: 2,
        settings,
        now: "2026-03-01T15:00:00.000Z",
      });
      const summary = getStudyStateSummary(state, new Date(now), target);
      assert.equal(summary.isDue, expectedDue);
    }
  );

  it("enforces solve-time requirement when enabled in settings", () => {
    const activeSettings = {
      ...settings,
      timing: { ...settings.timing, requireSolveTime: true },
    };

    assert.throws(
      () =>
        applyReview({
          rating: 2,
          settings: activeSettings,
          now: "2026-03-01T15:00:00.000Z",
        }),
      /solve time is required/i
    );

    const valid = applyReview({
      rating: 2,
      solveTimeMs: 120000,
      settings: activeSettings,
      now: "2026-03-01T15:00:00.000Z",
    });
    assert.equal(valid.lastSolveTimeMs, 120000);
  });
});
