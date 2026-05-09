import { describe, expect, it } from "vitest";

import {
  editProblem,
  importProblem,
} from "../../../src/data/repositories/v7/problemRepository";
import {
  asProblemSlug,
  asTopicId,
} from "../../../src/domain/common/ids";
import { listEditedFields } from "../../../src/domain/problems/operations";
import {
  emptyAppDataV7,
  FIXTURE_NOW,
} from "../../support/v7Fixtures";

describe("v7 problemRepository", () => {
  it("imports a new problem and derives missing fields from the slug", () => {
    const data = emptyAppDataV7();
    importProblem(data, { slug: "Two Sum" }, FIXTURE_NOW);
    const created = data.problemsBySlug[asProblemSlug("two-sum")];
    expect(created?.title).toBe("Two Sum");
    expect(created?.url).toContain("/problems/two-sum/");
    expect(created?.difficulty).toBe("Unknown");
    expect(created?.isPremium).toBe(false);
    expect(created?.topicIds).toEqual([]);
  });

  it("preserves user-edited fields on re-import", () => {
    const data = emptyAppDataV7();
    importProblem(
      data,
      { slug: "two-sum", title: "Two Sum", difficulty: "Easy" },
      FIXTURE_NOW,
    );
    editProblem(
      data,
      { slug: "two-sum", patch: { difficulty: "Hard" } },
      "2026-03-02T00:00:00.000Z",
    );
    importProblem(
      data,
      { slug: "two-sum", title: "Two Sum (LeetCode)", difficulty: "Easy" },
      "2026-03-03T00:00:00.000Z",
    );

    const merged = data.problemsBySlug[asProblemSlug("two-sum")];
    expect(merged.difficulty).toBe("Hard");
    expect(merged.title).toBe("Two Sum (LeetCode)");
    expect(listEditedFields(merged)).toContain("difficulty");
  });

  it("ignores edits when the slug is unknown", () => {
    const data = emptyAppDataV7();
    editProblem(
      data,
      { slug: "missing", patch: { difficulty: "Hard" } },
      FIXTURE_NOW,
    );
    expect(data.problemsBySlug[asProblemSlug("missing")]).toBeUndefined();
  });

  it("brand-coerces topicIds and companyIds on import", () => {
    const data = emptyAppDataV7();
    importProblem(
      data,
      {
        slug: "valid-anagram",
        topicIds: ["hash-map", "string"],
        companyIds: ["google"],
      },
      FIXTURE_NOW,
    );
    const created = data.problemsBySlug[asProblemSlug("valid-anagram")];
    expect(created.topicIds).toEqual([
      asTopicId("hash-map"),
      asTopicId("string"),
    ]);
    expect(created.companyIds[0]).toBeDefined();
  });

  it("does not flag userEdits when markUserEdit is false", () => {
    const data = emptyAppDataV7();
    importProblem(data, { slug: "abc", title: "Initial" }, FIXTURE_NOW);
    editProblem(
      data,
      { slug: "abc", patch: { title: "Renamed" }, markUserEdit: false },
      "2026-03-02T00:00:00.000Z",
    );
    const final = data.problemsBySlug[asProblemSlug("abc")];
    expect(final.title).toBe("Renamed");
    expect(final.userEdits).toBeUndefined();
  });
});
