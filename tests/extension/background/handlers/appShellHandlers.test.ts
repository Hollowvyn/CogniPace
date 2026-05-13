import {
  asProblemSlug,
  asTrackGroupId,
  asTrackId,
} from "@shared/ids";
import { describe, expect, it } from "vitest";

import { normalizeStoredAppData } from "../../../../src/data/repositories/appDataRepository";
import { buildPopupShellPayload } from "../../../../src/extension/background/handlers/appShellHandlers";
import {
  makeProblem,
  makeScheduledState,
} from "../../../support/domainFixtures";

import type { TrackWithGroups } from "@features/tracks";

function makeTrack(
  id: string,
  groupSlugs: ReadonlyArray<{ groupId: string; slugs: string[] }> = [],
): TrackWithGroups {
  const trackId = asTrackId(id);
  return {
    id: trackId,
    name: id,
    enabled: true,
    isCurated: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    groups: groupSlugs.map((g, idx) => ({
      id: asTrackGroupId(g.groupId),
      trackId,
      orderIndex: idx,
      problems: g.slugs.map((slug, slugIdx) => ({
        groupId: asTrackGroupId(g.groupId),
        problemSlug: asProblemSlug(slug),
        orderIndex: slugIdx,
      })),
    })),
  };
}

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

    const tracks = [
      makeTrack("Grind75", [{ groupId: "Grind75::0", slugs: ["two-sum"] }]),
    ];
    const payload = buildPopupShellPayload(data, tracks);

    expect(payload.activeTrack?.id).toBe("Grind75");
    expect(payload.popup.activeTrack?.id).toBe("Grind75");
  });
});
