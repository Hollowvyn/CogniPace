import assert from "node:assert/strict";

import { createEmptyCard } from "ts-fsrs";
import { describe, it } from "vitest";

import { DEFAULT_SETTINGS } from "../../src/domain/common/constants";
import {
  applyReview,
  overrideLastReview,
} from "../../src/domain/fsrs/scheduler";
import {
  getFsrsScheduler,
  getStudyStateSummary,
  serializeFsrsCard,
  toFsrsRating,
} from "../../src/domain/fsrs/studyState";
import { Rating, StudyState } from "../../src/domain/types";

describe("FSRS scheduler", () => {
  it("uses a short-term learning step for the first Good review", () => {
    const first = applyReview({
      rating: 2,
      difficulty: "Medium",
      settings: DEFAULT_SETTINGS,
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
      settings: DEFAULT_SETTINGS,
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

  it("follows raw FSRS output for early repeats", () => {
    const scheduler = getFsrsScheduler();
    let rawCard = createEmptyCard(new Date("2026-03-25T15:00:00.000Z"));

    const first = applyReview({
      rating: 2,
      difficulty: "Medium",
      settings: DEFAULT_SETTINGS,
      now: "2026-03-25T15:00:00.000Z",
    });
    rawCard = scheduler.repeat(rawCard, new Date("2026-03-25T15:00:00.000Z"))[
      toFsrsRating(2)
    ].card;

    const second = applyReview({
      state: first,
      rating: 2,
      difficulty: "Medium",
      settings: DEFAULT_SETTINGS,
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
    const scheduler = getFsrsScheduler();
    const ratings: Rating[] = [2, 2, 2, 1];
    let rawCard = createEmptyCard(new Date("2026-03-01T15:00:00.000Z"));
    let appState: StudyState | undefined;
    let reviewAt = new Date("2026-03-01T15:00:00.000Z");

    for (const rating of ratings) {
      rawCard = scheduler.repeat(rawCard, reviewAt)[toFsrsRating(rating)].card;
      appState = applyReview({
        state: appState,
        rating,
        settings: DEFAULT_SETTINGS,
        now: reviewAt.toISOString(),
      });

      assert.deepEqual(appState.fsrsCard, serializeFsrsCard(rawCard));
      reviewAt = rawCard.due;
    }
  });

  it("matches the raw FSRS scheduler for same-moment rapid resubmits", () => {
    const scheduler = getFsrsScheduler();
    const ratings: Rating[] = [3, 3, 3, 2, 2];
    const reviewAt = new Date("2026-03-29T21:00:00.000Z");
    let rawCard = createEmptyCard(reviewAt);
    let appState: StudyState | undefined;

    for (const rating of ratings) {
      rawCard = scheduler.repeat(rawCard, reviewAt)[toFsrsRating(rating)].card;
      appState = applyReview({
        state: appState,
        rating,
        settings: DEFAULT_SETTINGS,
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
      settings: DEFAULT_SETTINGS,
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
      settings: DEFAULT_SETTINGS,
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
      settings: DEFAULT_SETTINGS,
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
      settings: DEFAULT_SETTINGS,
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
});
