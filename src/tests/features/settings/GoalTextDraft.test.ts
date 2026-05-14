import { describe, expect, it } from "vitest";

import {
  createGoalTextDraft,
  minutesToMs,
  msToMinutes,
  parseGoalMinutes,
  resolveGoalTextDraft,
} from "../../../features/settings/ui/screens/model/GoalTextDraft";

describe("GoalTextDraft", () => {
  describe("msToMinutes / minutesToMs", () => {
    it("rounds milliseconds to the nearest whole minute", () => {
      expect(msToMinutes(120_000)).toBe(2);
      expect(msToMinutes(150_000)).toBe(3);
      expect(msToMinutes(89_000)).toBe(1);
    });

    it("converts whole minutes back to milliseconds", () => {
      expect(minutesToMs(0)).toBe(0);
      expect(minutesToMs(15)).toBe(900_000);
    });

    it("rounds fractional minute input before converting", () => {
      expect(minutesToMs(15.4)).toBe(900_000);
      expect(minutesToMs(15.6)).toBe(960_000);
    });
  });

  describe("parseGoalMinutes", () => {
    it("treats an empty string as zero", () => {
      expect(parseGoalMinutes("")).toBe(0);
    });

    it("parses an integer string", () => {
      expect(parseGoalMinutes("30")).toBe(30);
    });
  });

  describe("createGoalTextDraft", () => {
    it("seeds the draft with the formatted minute value of sourceMs", () => {
      expect(createGoalTextDraft(900_000)).toEqual({
        sourceMs: 900_000,
        value: "15",
      });
    });
  });

  describe("resolveGoalTextDraft", () => {
    it("returns the same draft reference when sourceMs is unchanged", () => {
      const draft = createGoalTextDraft(600_000);
      expect(resolveGoalTextDraft(draft, 600_000)).toBe(draft);
    });

    it("preserves typed text when sourceMs round-trips to the same minute count", () => {
      const draft = { sourceMs: 900_000, value: "15" };
      expect(resolveGoalTextDraft(draft, 900_400)).toEqual({
        sourceMs: 900_400,
        value: "15",
      });
    });

    it("rebuilds the draft when sourceMs represents a different minute count", () => {
      const draft = { sourceMs: 900_000, value: "15" };
      expect(resolveGoalTextDraft(draft, 1_200_000)).toEqual({
        sourceMs: 1_200_000,
        value: "20",
      });
    });

    it("rebuilds when value was empty and source then changes to non-zero", () => {
      const draft = { sourceMs: 900_000, value: "" };
      expect(resolveGoalTextDraft(draft, 1_200_000)).toEqual({
        sourceMs: 1_200_000,
        value: "20",
      });
    });
  });
});
