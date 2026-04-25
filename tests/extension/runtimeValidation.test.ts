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

  it("uses canonical safe-open targets", () => {
    assert.equal(
      canonicalProblemUrlForOpen(" Two-Sum "),
      "https://leetcode.com/problems/two-sum/"
    );
    assert.equal(
      validateExtensionPagePath("dashboard.html?view=settings"),
      "dashboard.html?view=settings"
    );
    assert.equal(validateExtensionPagePath("database.html"), "database.html");
    assert.throws(
      () => validateExtensionPagePath("https://evil.example.com"),
      /invalid extension path/i
    );
    assert.throws(
      () => validateExtensionPagePath("dashboard.html?view=hax"),
      /invalid dashboard view/i
    );
    assert.throws(
      () => validateExtensionPagePath("dashboard.html?foo=bar"),
      /invalid dashboard path/i
    );
    assert.throws(
      () =>
        validateExtensionPagePath(
          "dashboard.html?view=settings&view=analytics"
        ),
      /invalid dashboard path/i
    );
    assert.throws(
      () => validateExtensionPagePath("../dashboard.html"),
      /invalid extension path/i
    );
    assert.throws(
      () => validateExtensionPagePath("settings.html"),
      /unknown extension path/i
    );
  });
});
