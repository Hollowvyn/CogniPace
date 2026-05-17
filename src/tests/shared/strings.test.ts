import { capitalizeFirst, uniqueStrings } from "@shared/strings";
import { describe, expect, it } from "vitest";

describe("shared string utilities", () => {
  it("capitalizes only the first character", () => {
    expect(capitalizeFirst("today")).toBe("Today");
    expect(capitalizeFirst("this Wednesday")).toBe("This Wednesday");
    expect(capitalizeFirst("")).toBe("");
  });

  it("deduplicates trimmed non-empty strings in source order", () => {
    expect(uniqueStrings([" Graph ", "", "DP", "Graph"])).toEqual([
      "Graph",
      "DP",
    ]);
  });
});
