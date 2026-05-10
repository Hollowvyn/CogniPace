import assert from "node:assert/strict";

import { describe, it } from "vitest";

import {
  assertAuthorizedRuntimeMessage,
  canonicalProblemUrlForOpen,
  validateExtensionPagePath,
  validateRuntimeMessage,
} from "../../src/extension/runtime/validator";

describe("runtime validation", () => {
  it("rejects unknown message types", () => {
    assert.throws(
      () =>
        validateRuntimeMessage({
          type: "NOT_A_REAL_MESSAGE",
          payload: {},
        }),
      /unknown message type/i
    );
  });

  it("rejects missing payloads", () => {
    assert.throws(
      () =>
        validateRuntimeMessage({
          type: "GET_APP_SHELL_DATA",
        } as never),
      /payload must be an object/i
    );
  });

  it("rejects wrong payload field types", () => {
    assert.throws(
      () =>
        validateRuntimeMessage({
          type: "SAVE_REVIEW_RESULT",
          payload: {
            slug: "two-sum",
            rating: "2",
          },
        }),
      /rating/i
    );
  });

  it("rejects unauthorized content-script senders", () => {
    const message = validateRuntimeMessage({
      type: "UPDATE_SETTINGS",
      payload: {
        studyMode: "freestyle",
      },
    });

    assert.throws(
      () =>
        assertAuthorizedRuntimeMessage(
          message,
          {
            id: "test-extension",
            url: "https://leetcode.com/problems/two-sum/",
          },
          "test-extension",
          "chrome-extension://test-extension/"
        ),
      /unauthorized content-script message/i
    );
  });

  it("rejects extension senders without urls", () => {
    const message = validateRuntimeMessage({
      type: "GET_APP_SHELL_DATA",
      payload: {},
    });

    assert.throws(() =>
      assertAuthorizedRuntimeMessage(
        message,
        {
          id: "test-extension",
        },
        "test-extension",
        "chrome-extension://test-extension/"
      )
    );
  });

  it("accepts popup shell reads with empty payloads", () => {
    assert.doesNotThrow(() =>
      validateRuntimeMessage({
        type: "GET_POPUP_SHELL_DATA",
        payload: {},
      })
    );
  });

  it("accepts allowed content-script senders", () => {
    const message = validateRuntimeMessage({
      type: "SAVE_REVIEW_RESULT",
      payload: {
        slug: "two-sum",
        rating: 2,
      },
    });

    assert.doesNotThrow(() =>
      assertAuthorizedRuntimeMessage(
        message,
        {
          id: "test-extension",
          url: "https://leetcode.com/problems/two-sum/",
        },
        "test-extension",
        "chrome-extension://test-extension/"
      )
    );
  });

  it("accepts premium metadata on page upserts", () => {
    assert.doesNotThrow(() =>
      validateRuntimeMessage({
        type: "UPSERT_PROBLEM_FROM_PAGE",
        payload: {
          slug: "two-sum",
          title: "Two Sum",
          difficulty: "Easy",
          isPremium: true,
          url: "https://leetcode.com/problems/two-sum/",
        },
      })
    );
  });

  it("accepts the current settings payload and global history reset", () => {
    assert.doesNotThrow(() =>
      validateRuntimeMessage({
        type: "UPDATE_SETTINGS",
        payload: {
          dailyQuestionGoal: 18,
          memoryReview: {
            targetRetention: 0.85,
            reviewOrder: "dueFirst",
          },
          notifications: {
            enabled: true,
            dailyTime: "09:00",
          },
          questionFilters: {
            skipPremium: false,
          },
          timing: {
            requireSolveTime: false,
            difficultyGoalMs: {
              Easy: 20 * 60 * 1000,
              Medium: 35 * 60 * 1000,
              Hard: 50 * 60 * 1000,
            },
          },
        },
      })
    );

    assert.doesNotThrow(() =>
      validateRuntimeMessage({
        type: "RESET_STUDY_HISTORY",
        payload: {},
      })
    );
  });

  it("rejects removed legacy settings fields", () => {
    assert.throws(
      () =>
        validateRuntimeMessage({
          type: "UPDATE_SETTINGS",
          payload: {
            dailyNewLimit: 6,
            dailyReviewLimit: 14,
            notificationTime: "09:00",
          },
        }),
      /unexpected field "dailyNewLimit"/i
    );
  });

  describe("safe-open targets", () => {
    it.each([
      {
        input: "dashboard.html?view=settings",
        expected: "dashboard.html?view=settings",
      },
      { input: "database.html", expected: "database.html" },
    ])("accepts valid path $input", ({ input, expected }) => {
      assert.equal(validateExtensionPagePath(input), expected);
    });

    it.each([
      { input: "https://evil.example.com", error: /invalid extension path/i },
      { input: "dashboard.html?view=hax", error: /invalid dashboard view/i },
      { input: "dashboard.html?foo=bar", error: /invalid dashboard path/i },
      {
        input: "dashboard.html?view=settings&view=analytics",
        error: /invalid dashboard path/i,
      },
      { input: "../dashboard.html", error: /invalid extension path/i },
      { input: "settings.html", error: /unknown extension path/i },
    ])("rejects invalid path $input", ({ input, error }) => {
      assert.throws(() => validateExtensionPagePath(input), error);
    });

    it("canonicalizes problem slugs", () => {
      assert.equal(
        canonicalProblemUrlForOpen(" Two-Sum "),
        "https://leetcode.com/problems/two-sum/"
      );
    });
  });
});
