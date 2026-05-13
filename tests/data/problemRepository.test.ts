import assert from "node:assert/strict";

import {
  ensureProblem,
  importProblemsIntoSet,
} from "@features/problems/server";
import { describe, it } from "vitest";

import { normalizeStoredAppData } from "../../src/data/repositories/appDataRepository";

describe("problem repository", () => {
  it("preserves existing premium metadata when later upserts have no signal", () => {
    const data = normalizeStoredAppData();

    ensureProblem(data, {
      slug: "two-sum",
      difficulty: "Easy",
      isPremium: true,
      title: "Two Sum",
    });
    ensureProblem(data, {
      slug: "two-sum",
      title: "Two Sum",
    });

    assert.equal(data.problemsBySlug["two-sum"]?.isPremium, true);
  });

  it("imports premium metadata from custom set items", () => {
    const data = normalizeStoredAppData();

    importProblemsIntoSet(data, "Custom", [
      {
        slug: "premium-problem",
        difficulty: "Hard",
        isPremium: true,
        title: "Premium Problem",
      },
    ]);

    assert.equal(data.problemsBySlug["premium-problem"]?.isPremium, true);
  });
});
