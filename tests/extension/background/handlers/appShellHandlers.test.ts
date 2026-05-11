import { describe, expect, it } from "vitest";

import { companyStudySetIdFor } from "../../../../src/data/catalog/companyStudySetsSeed";
import { normalizeStoredAppData } from "../../../../src/data/repositories/appDataRepository";
import { buildPopupShellPayload } from "../../../../src/extension/background/handlers/appShellHandlers";
import {
  makeProblem,
  makeScheduledState,
} from "../../../support/domainFixtures";

describe("Popup Shell Handler", () => {
  it("builds only the popup read model", () => {
    const data = normalizeStoredAppData({
      problemsBySlug: {
        "two-sum": makeProblem("two-sum", "Two Sum", "Easy"),
      },
      settings: {
        activeCourseId: "Blind75",
        dailyQuestionGoal: 10,
      },
      studyStatesBySlug: {
        "two-sum": makeScheduledState("2026-05-01T00:00:00.000Z"),
      },
    });

    const payload = buildPopupShellPayload(data);

    expect(Object.keys(payload).sort()).toEqual([
      "activeTrack",
      "popup",
      "settings",
    ]);
    expect(payload).not.toHaveProperty("analytics");
    expect(payload).not.toHaveProperty("library");
    expect(payload).not.toHaveProperty("queue");
    expect(payload.popup.dueCount).toBeGreaterThanOrEqual(1);
    expect(payload.popup.recommended?.slug).toBe("two-sum");
    expect(payload.popup.activeTrack).not.toHaveProperty("chapters");
  });

  it("derives activeTrack from settings.activeFocus", () => {
    const data = normalizeStoredAppData({
      problemsBySlug: {
        "two-sum": makeProblem("two-sum", "Two Sum", "Easy"),
      },
      settings: {
        activeFocus: { kind: "track", id: "Grind75" },
        dailyQuestionGoal: 10,
      },
      studyStatesBySlug: {},
    });

    const payload = buildPopupShellPayload(data);

    expect(payload.activeTrack?.id).toBe("Grind75");
    expect(payload.popup.activeTrack?.id).toBe("Grind75");
  });

  it("scopes the recommendation queue to a company pool when activeFocus targets one", () => {
    const googleSetId = companyStudySetIdFor("google");
    const dueAt = "2025-01-01T00:00:00.000Z";
    const data = normalizeStoredAppData({
      problemsBySlug: {
        "two-sum": {
          ...makeProblem("two-sum", "Two Sum", "Easy"),
          slug: "two-sum",
          companyIds: ["google"],
        },
        "merge-intervals": {
          ...makeProblem("merge-intervals", "Merge Intervals", "Medium"),
          slug: "merge-intervals",
          companyIds: [],
        },
      },
      settings: {
        activeFocus: { kind: "track", id: googleSetId },
        dailyQuestionGoal: 10,
      },
      studyStatesBySlug: {
        "two-sum": makeScheduledState(dueAt),
        "merge-intervals": makeScheduledState(dueAt),
      },
    });

    const payload = buildPopupShellPayload(data);

    const slugs = payload.popup.recommendedCandidates.map((c) => c.slug).sort();
    expect(slugs).toEqual(["two-sum"]);
    expect(payload.popup.dueCount).toBe(1);
  });

  it("falls back to the full library when the company pool resolves empty", () => {
    const googleSetId = companyStudySetIdFor("google");
    const dueAt = "2025-01-01T00:00:00.000Z";
    const data = normalizeStoredAppData({
      problemsBySlug: {
        // No problem is tagged for Google → pool is empty.
        "two-sum": {
          ...makeProblem("two-sum", "Two Sum", "Easy"),
          companyIds: [],
        },
        "merge-intervals": {
          ...makeProblem("merge-intervals", "Merge Intervals", "Medium"),
          companyIds: [],
        },
      },
      settings: {
        activeFocus: { kind: "track", id: googleSetId },
        dailyQuestionGoal: 10,
      },
      studyStatesBySlug: {
        "two-sum": makeScheduledState(dueAt),
        "merge-intervals": makeScheduledState(dueAt),
      },
    });

    const payload = buildPopupShellPayload(data);

    expect(payload.popup.dueCount).toBe(2);
    const slugs = payload.popup.recommendedCandidates.map((c) => c.slug).sort();
    expect(slugs).toEqual(["merge-intervals", "two-sum"]);
  });
});
