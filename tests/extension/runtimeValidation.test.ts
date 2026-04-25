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

  it("accepts extension senders without urls", () => {
    const message = validateRuntimeMessage({
      type: "GET_APP_SHELL_DATA",
      payload: {},
    });

    assert.doesNotThrow(() =>
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

  describe("safe-open targets", () => {
    it.each([
      { input: "dashboard.html?view=settings", expected: "dashboard.html?view=settings" },
      { input: "database.html", expected: "database.html" },
    ])("accepts valid path $input", ({ input, expected }) => {
      assert.equal(validateExtensionPagePath(input), expected);
    });

    it.each([
      { input: "https://evil.example.com", error: /invalid extension path/i },
      { input: "dashboard.html?view=hax", error: /invalid dashboard view/i },
      { input: "dashboard.html?foo=bar", error: /invalid dashboard path/i },
      { input: "dashboard.html?view=settings&view=analytics", error: /invalid dashboard path/i },
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
