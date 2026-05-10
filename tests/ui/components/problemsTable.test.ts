import { describe, expect, it } from "vitest";

import { applyFiltersAndSort } from "../../../src/ui/components/problemsTable/useProblemsTable";
import { createDefaultFilters } from "../../../src/ui/components/problemsTable/types";
import type { ProblemRowData } from "../../../src/ui/components/problemsTable/types";
import {
  asProblemSlug,
} from "../../../src/domain/common/ids";
import type { Difficulty, StudyPhase } from "../../../src/domain/types";

function row(
  slug: string,
  title: string,
  difficulty: Difficulty,
  phase: StudyPhase | "New" = "New",
  nextReviewAt?: string,
): ProblemRowData {
  return {
    view: {
      slug: asProblemSlug(slug),
      title,
      difficulty,
      isPremium: false,
      url: `https://leetcode.com/problems/${slug}/`,
      topics: [],
      companies: [],
      editedFields: [],
    },
    studyState:
      phase === "New"
        ? null
        : {
            phase,
            nextReviewAt,
            reviewCount: 1,
            lapses: 0,
            suspended: false,
            isStarted: true,
            isDue: false,
            isOverdue: false,
            overdueDays: 0,
            recentAttempts: [],
            tags: [],
          },
    trackMemberships: [],
  };
}

describe("ProblemsTable controller", () => {
  it("filters by search query (case-insensitive on title and slug)", () => {
    const rows = [
      row("two-sum", "Two Sum", "Easy"),
      row("three-sum", "3Sum", "Medium"),
      row("merge-intervals", "Merge Intervals", "Medium"),
    ];
    const out = applyFiltersAndSort(
      rows,
      { ...createDefaultFilters(), query: "sum" },
      { key: "title", direction: "asc" },
    );
    expect(out.map((r) => r.view.title)).toEqual(["3Sum", "Two Sum"]);
  });

  it("filters by difficulty", () => {
    const rows = [
      row("a", "A", "Easy"),
      row("b", "B", "Medium"),
      row("c", "C", "Hard"),
    ];
    const out = applyFiltersAndSort(
      rows,
      { ...createDefaultFilters(), difficulty: "Hard" },
      { key: "title", direction: "asc" },
    );
    expect(out).toHaveLength(1);
    expect(out[0].view.title).toBe("C");
  });

  it("filters by phase ('New' matches rows with no study state)", () => {
    const rows = [
      row("a", "A", "Medium", "New"),
      row("b", "B", "Medium", "Review"),
      row("c", "C", "Medium", "Learning"),
    ];
    const out = applyFiltersAndSort(
      rows,
      { ...createDefaultFilters(), phase: "New" },
      { key: "title", direction: "asc" },
    );
    expect(out).toHaveLength(1);
    expect(out[0].view.title).toBe("A");
  });

  it("sorts by title asc then desc", () => {
    const rows = [
      row("c", "Charlie", "Easy"),
      row("a", "Alpha", "Easy"),
      row("b", "Bravo", "Easy"),
    ];
    const asc = applyFiltersAndSort(rows, createDefaultFilters(), {
      key: "title",
      direction: "asc",
    });
    expect(asc.map((r) => r.view.title)).toEqual(["Alpha", "Bravo", "Charlie"]);
    const desc = applyFiltersAndSort(rows, createDefaultFilters(), {
      key: "title",
      direction: "desc",
    });
    expect(desc.map((r) => r.view.title)).toEqual([
      "Charlie",
      "Bravo",
      "Alpha",
    ]);
  });

  it("sorts by difficulty Easy < Medium < Hard < Unknown", () => {
    const rows = [
      row("a", "A", "Hard"),
      row("b", "B", "Easy"),
      row("c", "C", "Unknown"),
      row("d", "D", "Medium"),
    ];
    const out = applyFiltersAndSort(rows, createDefaultFilters(), {
      key: "difficulty",
      direction: "asc",
    });
    expect(out.map((r) => r.view.difficulty)).toEqual([
      "Easy",
      "Medium",
      "Hard",
      "Unknown",
    ]);
  });

  it("sorts by next review with undefined coming last", () => {
    const rows = [
      row("a", "A", "Easy", "Review", "2026-04-10T00:00:00Z"),
      row("b", "B", "Easy", "Review", "2026-04-01T00:00:00Z"),
      row("c", "C", "Easy", "New"),
    ];
    const out = applyFiltersAndSort(rows, createDefaultFilters(), {
      key: "nextReview",
      direction: "asc",
    });
    expect(out.map((r) => r.view.title)).toEqual(["B", "A", "C"]);
  });

  it("returns the full set when no filters apply", () => {
    const rows = [
      row("a", "A", "Easy"),
      row("b", "B", "Medium"),
    ];
    const out = applyFiltersAndSort(rows, createDefaultFilters(), {
      key: "title",
      direction: "asc",
    });
    expect(out).toHaveLength(2);
  });
});
