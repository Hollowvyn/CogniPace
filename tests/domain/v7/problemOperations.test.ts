import {
  applyEdit,
  listEditedFields,
  mergeImported,
  type ProblemEditPatch,
} from "@features/problems";
import { describe, expect, it } from "vitest";

import { makeProblemV7 } from "../../support/v7Fixtures";

describe("Problem operations", () => {
  it("applies a patch and flags userEdits when markUserEdit is true", () => {
    const problem = makeProblemV7("two-sum", {
      title: "Two Sum",
      difficulty: "Easy",
    });
    const patch: ProblemEditPatch = { difficulty: "Hard" };
    const next = applyEdit(problem, patch, "2026-03-02T00:00:00.000Z", true);
    expect(next.difficulty).toBe("Hard");
    expect(next.userEdits?.difficulty).toBe(true);
    expect(next.updatedAt).toBe("2026-03-02T00:00:00.000Z");
  });

  it("does not flag userEdits when markUserEdit is false", () => {
    const problem = makeProblemV7("abc");
    const next = applyEdit(
      problem,
      { title: "Renamed" },
      "2026-03-02T00:00:00.000Z",
      false,
    );
    expect(next.title).toBe("Renamed");
    expect(next.userEdits).toBeUndefined();
  });

  it("preserves user-edited fields during mergeImported", () => {
    let problem = makeProblemV7("two-sum", {
      difficulty: "Easy",
      title: "Two Sum",
    });
    problem = applyEdit(
      problem,
      { difficulty: "Hard" },
      "2026-03-02T00:00:00.000Z",
      true,
    );
    const merged = mergeImported(
      problem,
      { difficulty: "Medium", title: "Two Sum (LC)" },
      "2026-03-03T00:00:00.000Z",
    );
    expect(merged.difficulty).toBe("Hard");
    expect(merged.title).toBe("Two Sum (LC)");
  });

  it("listEditedFields returns the flagged fields in declaration order", () => {
    const problem = makeProblemV7("abc");
    const next = applyEdit(
      problem,
      { difficulty: "Hard", isPremium: true },
      "2026-03-02T00:00:00.000Z",
      true,
    );
    expect(listEditedFields(next)).toEqual(["difficulty", "isPremium"]);
  });

  it("ignores undefined values in the patch", () => {
    const problem = makeProblemV7("abc", { title: "Original" });
    const next = applyEdit(
      problem,
      { title: undefined, difficulty: "Hard" },
      "2026-03-02T00:00:00.000Z",
      true,
    );
    expect(next.title).toBe("Original");
    expect(next.difficulty).toBe("Hard");
    expect(next.userEdits?.title).toBeUndefined();
    expect(next.userEdits?.difficulty).toBe(true);
  });
});
