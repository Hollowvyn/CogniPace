import { describe, expect, it } from "vitest";

import { buildActiveTrackView } from "../../../src/domain/active-focus/buildActiveTrackView";
import {
  asProblemSlug,
  asSetGroupId,
  asStudySetId,
} from "../../../src/domain/common/ids";

import type { ActiveFocus } from "../../../src/domain/active-focus/model";
import type { StudySet } from "../../../src/domain/sets/model";
import type { Problem, StudyState } from "../../../src/domain/types";
import type { StudySetView } from "../../../src/domain/views";

function makeStudySet(): StudySet {
  return {
    id: asStudySetId("Blind75"),
    kind: "course",
    name: "Blind 75",
    description: "Core interview patterns.",
    isCurated: true,
    enabled: true,
    config: {
      trackProgress: true,
      ordering: "manual",
      enforcePrerequisites: false,
      requireSequentialProblems: false,
      showLockedTopics: false,
      allowReorder: false,
    },
    groups: [
      {
        id: asSetGroupId("arrays"),
        nameOverride: "Arrays",
        prerequisiteGroupIds: [],
        problemSlugs: [
          asProblemSlug("two-sum"),
          asProblemSlug("contains-duplicate"),
        ],
      },
      {
        id: asSetGroupId("graphs"),
        nameOverride: "Graphs",
        prerequisiteGroupIds: [asSetGroupId("arrays")],
        problemSlugs: [asProblemSlug("clone-graph")],
      },
    ],
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  };
}

function makeView(): StudySetView {
  return {
    kind: "grouped",
    id: "Blind75",
    name: "Blind 75",
    description: "Core interview patterns.",
    enabled: true,
    groups: [
      {
        id: "arrays",
        name: "Arrays",
        prerequisiteGroupIds: [],
        unlocked: true,
        problems: [],
        completedCount: 1,
        totalCount: 2,
      },
      {
        id: "graphs",
        name: "Graphs",
        prerequisiteGroupIds: ["arrays"],
        unlocked: false,
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
      trackEntity: makeStudySet(),
      trackProgress: null,
      studyStatesBySlug: {},
      problemsBySlug,
    });
    expect(view).toBeNull();
  });

  it("returns null when track view is missing", () => {
    const view = buildActiveTrackView({
      activeFocus: { kind: "track", id: asStudySetId("Blind75") },
      trackView: null,
      trackEntity: makeStudySet(),
      trackProgress: null,
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
      id: asStudySetId("Blind75"),
    };
    const view = buildActiveTrackView({
      activeFocus: focus,
      trackView: makeView(),
      trackEntity: makeStudySet(),
      trackProgress: null,
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
        id: asStudySetId("Blind75"),
        groupId: asSetGroupId("graphs"),
      },
      trackView: makeView(),
      trackEntity: makeStudySet(),
      trackProgress: null,
      studyStatesBySlug: {},
      problemsBySlug,
    });
    expect(view?.activeChapterId).toBe("graphs");
    expect(view?.nextQuestion?.slug).toBe("clone-graph");
  });

  it("returns null for non-grouped study set views (flat / derived)", () => {
    const flatView: StudySetView = {
      kind: "flat",
      id: "Custom",
      name: "Custom",
      enabled: true,
      problems: [],
    };
    const view = buildActiveTrackView({
      activeFocus: { kind: "track", id: asStudySetId("Custom") },
      trackView: flatView,
      trackEntity: makeStudySet(),
      trackProgress: null,
      studyStatesBySlug: {},
      problemsBySlug,
    });
    expect(view).toBeNull();
  });
});
