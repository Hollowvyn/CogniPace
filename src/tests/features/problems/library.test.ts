import {
  createDefaultFilters,
  filterAndSortProblems,
} from "@features/problems/ui/components/problemsTable";
import { describe, expect, it } from "vitest";

import { makePayload } from "../../support/appShellFixtures";

describe("library problem filtering", () => {
  it("filters domain problems with table selector logic", () => {
    const payload = makePayload();
    const rows = filterAndSortProblems(
      payload.problems,
      {
        ...createDefaultFilters(),
        trackId: "all",
        difficulty: "Easy",
        query: "two",
        phase: "Review",
      },
      { key: "title", direction: "asc" },
      payload.settings,
      new Date("2026-05-16T00:00:00.000Z"),
      payload.tracks,
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]?.slug).toBe("two-sum");
  });
});
