import { describe, expect, it } from "vitest";

import {
  coverageQuotaForToday,
  daysUntilTarget,
  isInterviewTargetActive,
  isInterviewTargetForCompany,
  resolveEffectiveDailyGoal,
} from "../../../src/domain/companies/interviewTarget";

import type { InterviewTarget } from "../../../src/domain/settings/model";

const NOW = new Date("2026-05-10T12:00:00.000Z");

function target(
  overrides: Partial<InterviewTarget> = {},
): InterviewTarget {
  return {
    companyId: "google",
    date: "2026-05-20",
    interviewCount: 1,
    ...overrides,
  };
}

describe("daysUntilTarget", () => {
  it("counts whole days remaining (zero on the day of)", () => {
    expect(daysUntilTarget(target({ date: "2026-05-20" }), NOW)).toBe(10);
    expect(daysUntilTarget(target({ date: "2026-05-10" }), NOW)).toBe(0);
  });

  it("returns a negative value once the interview has passed", () => {
    expect(daysUntilTarget(target({ date: "2026-05-05" }), NOW)).toBe(-5);
  });

  it("returns -Infinity for unparseable dates", () => {
    expect(daysUntilTarget(target({ date: "not-a-date" }), NOW)).toBe(-Infinity);
  });
});

describe("isInterviewTargetActive", () => {
  it("is true when the target date is today or in the future", () => {
    expect(isInterviewTargetActive(target({ date: "2026-05-20" }), NOW)).toBe(true);
    expect(isInterviewTargetActive(target({ date: "2026-05-10" }), NOW)).toBe(true);
  });

  it("is false when the date has passed", () => {
    expect(isInterviewTargetActive(target({ date: "2026-05-05" }), NOW)).toBe(false);
  });

  it("is false for null/undefined targets", () => {
    expect(isInterviewTargetActive(null, NOW)).toBe(false);
    expect(isInterviewTargetActive(undefined, NOW)).toBe(false);
  });
});

describe("isInterviewTargetForCompany", () => {
  it("matches by companyId", () => {
    expect(isInterviewTargetForCompany(target({ companyId: "google" }), "google")).toBe(true);
    expect(isInterviewTargetForCompany(target({ companyId: "google" }), "meta")).toBe(false);
  });

  it("returns false when either side is empty/null", () => {
    expect(isInterviewTargetForCompany(null, "google")).toBe(false);
    expect(isInterviewTargetForCompany(target(), null)).toBe(false);
  });
});

describe("coverageQuotaForToday", () => {
  it("spreads uncovered problems evenly across remaining days", () => {
    // 100 uncovered over 10 days + today = ceil(100 / 11) = 10.
    expect(
      coverageQuotaForToday({
        uncoveredCount: 100,
        target: target({ date: "2026-05-20" }),
        now: NOW,
      }),
    ).toBe(10);
  });

  it("on the day of the interview, the quota is the remaining count", () => {
    expect(
      coverageQuotaForToday({
        uncoveredCount: 7,
        target: target({ date: "2026-05-10" }),
        now: NOW,
      }),
    ).toBe(7);
  });

  it("returns 0 when nothing remains uncovered", () => {
    expect(
      coverageQuotaForToday({
        uncoveredCount: 0,
        target: target(),
        now: NOW,
      }),
    ).toBe(0);
  });

  it("returns 0 when the interview has already passed", () => {
    expect(
      coverageQuotaForToday({
        uncoveredCount: 10,
        target: target({ date: "2026-05-05" }),
        now: NOW,
      }),
    ).toBe(0);
  });
});

describe("resolveEffectiveDailyGoal", () => {
  it("bumps the daily goal to cover the pool when the overlay is active", () => {
    expect(
      resolveEffectiveDailyGoal({
        userDailyGoal: 3,
        uncoveredCount: 100,
        target: target({ date: "2026-05-20", companyId: "google" }),
        companyId: "google",
        now: NOW,
      }),
    ).toBe(10);
  });

  it("keeps the user's daily goal when the bump would be lower", () => {
    expect(
      resolveEffectiveDailyGoal({
        userDailyGoal: 20,
        uncoveredCount: 50,
        target: target({ date: "2026-05-20", companyId: "google" }),
        companyId: "google",
        now: NOW,
      }),
    ).toBe(20);
  });

  it("is inert when the active company doesn't match the target", () => {
    expect(
      resolveEffectiveDailyGoal({
        userDailyGoal: 3,
        uncoveredCount: 100,
        target: target({ companyId: "google" }),
        companyId: "meta",
        now: NOW,
      }),
    ).toBe(3);
  });

  it("is inert when the target has expired", () => {
    expect(
      resolveEffectiveDailyGoal({
        userDailyGoal: 3,
        uncoveredCount: 100,
        target: target({ date: "2026-05-05" }),
        companyId: "google",
        now: NOW,
      }),
    ).toBe(3);
  });

  it("is inert when no target is set", () => {
    expect(
      resolveEffectiveDailyGoal({
        userDailyGoal: 3,
        uncoveredCount: 100,
        target: null,
        companyId: "google",
        now: NOW,
      }),
    ).toBe(3);
  });
});
