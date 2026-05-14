import assert from "node:assert/strict";

import {
  canonicalProblemUrlForOpen,
  validateExtensionPagePath,
} from "@libs/runtime-rpc/url";
import { describe, it } from "vitest";

describe("runtime-rpc URL safety guards", () => {
  describe("validateExtensionPagePath", () => {
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
  });

  describe("canonicalProblemUrlForOpen", () => {
    it("canonicalizes problem slugs", () => {
      assert.equal(
        canonicalProblemUrlForOpen(" Two-Sum "),
        "https://leetcode.com/problems/two-sum/",
      );
    });

    it("rejects empty slugs", () => {
      assert.throws(() => canonicalProblemUrlForOpen("   "), /invalid slug/i);
    });
  });
});
