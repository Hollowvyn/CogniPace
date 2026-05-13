import {
  asProblemSlug,
  asTrackGroupId,
  asTrackId,
} from "@shared/ids";
import { describe, expect, it } from "vitest";

import { buildActiveTrackView } from "../../../src/domain/active-focus/buildActiveTrackView";

import type { ActiveFocus } from "../../../src/domain/active-focus/model";
import type { Problem, StudyState } from "../../../src/domain/types";
import type { TrackView } from "../../../src/domain/views";
import type {
  TrackGroupWithProblems,
  TrackWithGroups,
} from "@features/tracks";

function makeTrack(): TrackWithGroups {
  const trackId = asTrackId("Blind75");
  const arrays: TrackGroupWithProblems = {
    id: asTrackGroupId("arrays"),
    trackId,
    name: "Arrays",
    orderIndex: 0,
    problems: [
      {
        groupId: asTrackGroupId("arrays"),
        problemSlug: asProblemSlug("two-sum"),
        orderIndex: 0,
      },
      {
        groupId: asTrackGroupId("arrays"),
        problemSlug: asProblemSlug("contains-duplicate"),
        orderIndex: 1,
      },
    ],
  };
  const graphs: TrackGroupWithProblems = {
    id: asTrackGroupId("graphs"),
    trackId,
    name: "Graphs",
    orderIndex: 1,
    problems: [
      {
        groupId: asTrackGroupId("graphs"),
        problemSlug: asProblemSlug("clone-graph"),
        orderIndex: 0,
      },
    ],
  };
  return {
    id: trackId,
    name: "Blind 75",
    description: "Core interview patterns.",
    enabled: true,
    isCurated: true,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    groups: [arrays, graphs],
  };
}

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

function makeProblem(slug: string, title: string): Problem {
  return {
    id: slug,
    leetcodeSlug: slug,
    slug,
    title,
    difficulty: "Easy",
    isPremium: false,
    url: `https://leetcode.com/problems/${slug}/`,
    topics: [],
    topicIds: [],
    companyIds: [],
    sourceSet: ["Blind75"],
    createdAt: "",
    updatedAt: "",
  };
}

function startedState(): StudyState {
  return {
    suspended: false,
    tags: [],
    attemptHistory: [
      {
        rating: 2,
        ratingLabel: "Good",
        ratedAt: "2026-05-01T00:00:00Z",
        phase: "Learning",
      },
    ],
    fsrsCard: {
      due: "2026-05-10T00:00:00Z",
      stability: 1,
      difficulty: 5,
      elapsedDays: 1,
      scheduledDays: 1,
      reps: 1,
      lapses: 0,
      learningSteps: 0,
      state: "Learning",
    },
  };
}

const problemsBySlug: Record<string, Problem> = {
  "two-sum": makeProblem("two-sum", "Two Sum"),
  "contains-duplicate": makeProblem("contains-duplicate", "Contains Duplicate"),
  "clone-graph": makeProblem("clone-graph", "Clone Graph"),
};

describe("buildActiveTrackView", () => {
  it("returns null when activeFocus is null", () => {
    const view = buildActiveTrackView({
      activeFocus: null,
      trackView: makeView(),
      trackEntity: makeTrack(),
      studyStatesBySlug: {},
      problemsBySlug,
    });
    expect(view).toBeNull();
  });

  it("returns null when track view is missing", () => {
    const view = buildActiveTrackView({
      activeFocus: { kind: "track", id: asTrackId("Blind75") },
      trackView: null,
      trackEntity: makeTrack(),
      studyStatesBySlug: {},
      problemsBySlug,
    });
    expect(view).toBeNull();
  });

  it("computes counts from StudyState directly and selects the next unstarted slug", () => {
    const studyStatesBySlug: Record<string, StudyState> = {
      "two-sum": startedState(),
    };
    const focus: ActiveFocus = {
      kind: "track",
      id: asTrackId("Blind75"),
    };
    const view = buildActiveTrackView({
      activeFocus: focus,
      trackView: makeView(),
      trackEntity: makeTrack(),
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

  it("respects the focus.groupId override when picking the active group", () => {
    const view = buildActiveTrackView({
      activeFocus: {
        kind: "track",
        id: asTrackId("Blind75"),
        groupId: asTrackGroupId("graphs"),
      },
      trackView: makeView(),
      trackEntity: makeTrack(),
      studyStatesBySlug: {},
      problemsBySlug,
    });
    expect(view?.activeChapterId).toBe("graphs");
    expect(view?.nextQuestion?.slug).toBe("clone-graph");
  });

  it("returns null when the track entity is missing", () => {
    const view = buildActiveTrackView({
      activeFocus: { kind: "track", id: asTrackId("ghost") },
      trackView: makeView(),
      trackEntity: null,
      studyStatesBySlug: {},
      problemsBySlug,
    });
    expect(view).toBeNull();
  });
});
