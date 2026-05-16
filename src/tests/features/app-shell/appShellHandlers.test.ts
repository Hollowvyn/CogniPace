import { buildPopupShellPayload } from "@features/app-shell/server";
import { sanitizeStoredUserSettings } from "@features/settings/server";
import { describe, expect, it } from "vitest";

import {
  makeProblem,
  makeScheduledState,
  makeTrack,
} from "../../support/fixtures";

import type { AppData } from "@features/app-shell";
import type { Problem } from "@features/problems";
import type { StudyState } from "@features/study";

interface AppDataInput {
  problemsBySlug?: Record<string, Problem>;
  studyStatesBySlug?: Record<string, StudyState>;
  settings?: unknown;
}

function buildAppData(input: AppDataInput): AppData {
  return {
    problemsBySlug: input.problemsBySlug ?? {},
    studyStatesBySlug: input.studyStatesBySlug ?? {},
    topicsById: {},
    companiesById: {},
    settings: sanitizeStoredUserSettings(input.settings),
    activeTrackId: null,
    problems: [],
  };
}

describe("Popup Shell Handler", () => {
  it("builds only the popup read model", () => {
    const data = buildAppData({
      problemsBySlug: {
        "two-sum": makeProblem("two-sum", { title: "Two Sum", difficulty: "Easy" }),
      },
      settings: {
        activeCourseId: "Blind75",
        dailyQuestionGoal: 10,
      },
      studyStatesBySlug: {
        "two-sum": makeScheduledState("2026-05-01T00:00:00.000Z"),
      },
    });

    const payload = buildPopupShellPayload(data, []);

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
    // TrackCardView is the popup's compact shape — never carries
    // `chapters` (those live on the full ActiveTrackView only).
    expect(payload.popup.activeTrack ?? {}).not.toHaveProperty("chapters");
  });

  it("derives activeTrack from settings.activeFocus", () => {
    const data = buildAppData({
      problemsBySlug: {
        "two-sum": makeProblem("two-sum", { title: "Two Sum", difficulty: "Easy" }),
      },
      settings: {
        activeFocus: { kind: "track", id: "Grind75" },
        dailyQuestionGoal: 10,
      },
      studyStatesBySlug: {},
    });

    const tracks = [
      makeTrack("Grind75", [{ groupId: "Grind75::0", slugs: ["two-sum"] }]),
    ];
    const payload = buildPopupShellPayload(data, tracks);

    expect(payload.activeTrack?.id).toBe("Grind75");
    expect(payload.popup.activeTrack?.id).toBe("Grind75");
  });
});
