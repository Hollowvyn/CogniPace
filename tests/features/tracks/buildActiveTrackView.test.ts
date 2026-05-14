import { buildActiveTrackView } from "@features/tracks/server";
import { asTrackGroupId, asTrackId } from "@shared/ids";
import { describe, expect, it } from "vitest";

import { makeProblem, makeScheduledState, makeTrack } from "../../support/fixtures";

import type { TrackView } from "@features/tracks";

const BLIND75 = makeTrack("Blind75", [
  { groupId: "arrays", name: "Arrays", slugs: ["two-sum", "contains-duplicate"] },
  { groupId: "graphs", name: "Graphs", slugs: ["clone-graph"] },
]);

function makeView(): TrackView {
  return {
    id: "Blind75",
    name: "Blind 75",
    description: "Core interview patterns.",
    enabled: true,
    isCurated: true,
    groups: [
      {
        id: "arrays",
        name: "Arrays",
        topicId: null,
        problems: [],
        completedCount: 1,
        totalCount: 2,
      },
      {
        id: "graphs",
        name: "Graphs",
        topicId: null,
        problems: [],
        completedCount: 0,
        totalCount: 1,
      },
    ],
  };
}

const problemsBySlug = {
  "two-sum": makeProblem("two-sum", { title: "Two Sum" }),
  "contains-duplicate": makeProblem("contains-duplicate", { title: "Contains Duplicate" }),
  "clone-graph": makeProblem("clone-graph", { title: "Clone Graph" }),
};

describe("buildActiveTrackView", () => {
  it("returns null when activeTrackId is null", () => {
    const view = buildActiveTrackView({
      activeTrackId: null,
      trackView: makeView(),
      trackEntity: BLIND75,
      studyStatesBySlug: {},
      problemsBySlug,
    });
    expect(view).toBeNull();
  });

  it("returns null when track view is missing", () => {
    const view = buildActiveTrackView({
      activeTrackId: asTrackId("Blind75"),
      trackView: null,
      trackEntity: BLIND75,
      studyStatesBySlug: {},
      problemsBySlug,
    });
    expect(view).toBeNull();
  });

  it("computes counts from StudyState directly and selects the next unstarted slug", () => {
    const studyStatesBySlug = {
      "two-sum": makeScheduledState("2026-05-10T00:00:00.000Z"),
    };
    const view = buildActiveTrackView({
      activeTrackId: asTrackId("Blind75"),
      trackView: makeView(),
      trackEntity: BLIND75,
      studyStatesBySlug,
      problemsBySlug,
    });

    expect(view).not.toBeNull();
    if (!view) return;
    expect(view.id).toBe("Blind75");
    expect(view.totalQuestions).toBe(3);
    expect(view.completedQuestions).toBe(1);
    expect(view.completionPercent).toBe(33);
    expect(view.totalChapters).toBe(2);
    expect(view.completedChapters).toBe(0);
    expect(view.activeChapterId).toBe("arrays");
    expect(view.nextQuestion?.slug).toBe("contains-duplicate");
    expect(view.chapters[0].status).toBe("CURRENT");
    expect(view.chapters[1].status).toBe("UPCOMING");
  });

  it("derives the active group from the first group with an unstarted slug", () => {
    const studyStatesBySlug = {
      "two-sum": makeScheduledState("2026-05-10T00:00:00.000Z"),
      "contains-duplicate": makeScheduledState("2026-05-10T00:00:00.000Z"),
    };
    const view = buildActiveTrackView({
      activeTrackId: asTrackId("Blind75"),
      trackView: makeView(),
      trackEntity: BLIND75,
      studyStatesBySlug,
      problemsBySlug,
    });
    expect(view?.activeChapterId).toBe(asTrackGroupId("graphs"));
    expect(view?.nextQuestion?.slug).toBe("clone-graph");
  });

  it("returns null when the track entity is missing", () => {
    const view = buildActiveTrackView({
      activeTrackId: asTrackId("ghost"),
      trackView: makeView(),
      trackEntity: null,
      studyStatesBySlug: {},
      problemsBySlug,
    });
    expect(view).toBeNull();
  });
});
