import { formatRelativeCalendarDate } from "@platform/time";
import { describe, expect, it } from "vitest";

describe("platform time date formatting", () => {
  const relativeTo = new Date("2026-04-19T10:00:00");

  it.each([
    { date: "2026-04-19T12:00:00", expected: "today" },
    { date: "2026-04-18T12:00:00", expected: "yesterday" },
    { date: "2026-04-20T12:00:00", expected: "tomorrow" },
    { date: "2026-04-22T12:00:00", expected: "this Wednesday" },
    { date: "2026-04-16T12:00:00", expected: "last Thursday" },
    { date: "2026-03-01T12:00:00", expected: "Mar 1" },
    { date: "2025-12-31T12:00:00", expected: "Dec 31, 2025" },
  ])("formats $date as '$expected'", ({ date, expected }) => {
    expect(formatRelativeCalendarDate(date, relativeTo)).toBe(expected);
  });

  it("uses the provided fallback for missing or invalid dates", () => {
    expect(formatRelativeCalendarDate(undefined, relativeTo, "—")).toBe("—");
    expect(formatRelativeCalendarDate("not-a-date", relativeTo, "—")).toBe(
      "—",
    );
  });
});
