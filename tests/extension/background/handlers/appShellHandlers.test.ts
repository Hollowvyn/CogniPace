import { describe, expect, it } from "vitest";

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
      "activeCourse",
      "popup",
      "settings",
    ]);
    expect(payload).not.toHaveProperty("analytics");
    expect(payload).not.toHaveProperty("courseOptions");
    expect(payload).not.toHaveProperty("library");
    expect(payload).not.toHaveProperty("queue");
    expect(payload.popup.dueCount).toBeGreaterThanOrEqual(1);
    expect(payload.popup.recommended?.slug).toBe("two-sum");
    expect(payload.popup.activeCourse).not.toHaveProperty("chapters");
  });
});
