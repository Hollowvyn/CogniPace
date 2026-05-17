import assert from "node:assert/strict";

import {
  canonicalProblemUrlForOpen,
  dashboardExtensionPathForView,
  validateExtensionPagePath,
} from "@libs/runtime-rpc/url";
import { describe, it } from "vitest";

describe("runtime-rpc URL safety guards", () => {
  describe("validateExtensionPagePath", () => {
    it.each([
      {
        input: "dashboard.html",
        expected: "dashboard.html#/",
      },
      {
        input: "dashboard.html#/library",
        expected: "dashboard.html#/library",
      },
      {
        input: "dashboard.html#/problems/new?background=library",
        expected: "dashboard.html#/problems/new?background=library",
      },
      {
        input: "dashboard.html#/problems/two-sum/edit?background=tracks",
        expected: "dashboard.html#/problems/two-sum/edit?background=tracks",
      },
    ])("accepts valid path $input", ({ input, expected }) => {
      assert.equal(validateExtensionPagePath(input), expected);
    });

    it.each([
      { input: "https://evil.example.com", error: /invalid extension path/i },
      {
        input: "dashboard.html#/library?foo=bar",
        error: /invalid dashboard path/i,
      },
      {
        input: "dashboard.html#/library/problems/new",
        error: /invalid dashboard path/i,
      },
      {
        input: "dashboard.html#/problems/new",
        error: /invalid dashboard problem route/i,
      },
      {
        input: "dashboard.html#/problems/two-sum/edit?background=queue",
        error: /invalid dashboard problem background/i,
      },
      { input: "../dashboard.html", error: /invalid extension path/i },
      { input: "settings.html", error: /unknown extension path/i },
      { input: "database.html", error: /unknown extension path/i },
    ])("rejects invalid path $input", ({ input, error }) => {
      assert.throws(() => validateExtensionPagePath(input), error);
    });

    it("builds canonical dashboard screen paths", () => {
      assert.equal(
        dashboardExtensionPathForView("tracks"),
        "dashboard.html#/tracks"
      );
    });
  });

  describe("canonicalProblemUrlForOpen", () => {
    it("canonicalizes problem slugs", () => {
      assert.equal(
        canonicalProblemUrlForOpen(" Two-Sum "),
        "https://leetcode.com/problems/two-sum/"
      );
    });

    it("rejects empty slugs", () => {
      assert.throws(() => canonicalProblemUrlForOpen("   "), /invalid slug/i);
    });
  });
});
