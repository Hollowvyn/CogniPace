import assert from "node:assert/strict";

import { normalizeSlug } from "@features/problems";
import { describe, it } from "vitest";


describe("problem slug normalization", () => {
  it("accepts urls and slug noise", () => {
    assert.equal(
      normalizeSlug(
        " https://leetcode.com/problems/Two-Sum/?envType=study-plan-v2 "
      ),
      "two-sum"
    );
    assert.equal(normalizeSlug("Problems/merge-intervals/"), "merge-intervals");
  });
});
