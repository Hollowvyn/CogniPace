import { filterLibraryRows } from "@features/problems/ui/presentation/library";
import { describe, expect, it } from "vitest";

import { makePayload } from "../../support/appShellFixtures";

describe("library filtering", () => {
  it("filters library rows with pure selector logic", () => {
    const payload = makePayload();
    const rows = filterLibraryRows(payload.library, {
      trackId: "all",
      difficulty: "Easy",
      query: "two",
      status: "due",
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]?.view.slug).toBe("two-sum");
  });
});
