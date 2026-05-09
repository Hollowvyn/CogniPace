import { describe, expect, it } from "vitest";

import {
  defaultReviewMode,
  deriveQuickRating,
} from "../../../src/domain/fsrs/reviewPolicy";
import { StudyState } from "../../../src/domain/types";
import {
  buildDashboardUrl,
  readDashboardViewFromSearch,
} from "../../../src/ui/navigation/dashboardRoutes";
import { filterLibraryRows } from "../../../src/ui/presentation/library";
import {
  cloneDraft,
  draftFromStudyState,
  draftsEqual,
  emptyDraft,
  reviewPayloadFromDraft,
} from "../../../src/ui/screens/overlay/controller/draftFields";
import {
  buildDueTone,
  buildHeaderStatus,
  formatSubmissionDateLabel,
} from "../../../src/ui/screens/overlay/controller/headerStatus";
import { makePayload, makeStudyState } from "../support/appShellFixtures";

describe("route and selector contracts", () => {
  it("parses dashboard routes and builds view urls", () => {
    expect(readDashboardViewFromSearch("?view=courses")).toBe("courses");
    expect(readDashboardViewFromSearch("?view=unknown")).toBe("dashboard");
    expect(
      buildDashboardUrl(
        "chrome-extension://test/dashboard.html?view=settings",
        "library"
      )
    ).toContain("view=library");
  });

  it("filters library rows with pure selector logic", () => {
    const payload = makePayload();
    const rows = filterLibraryRows(payload.library, {
      courseId: "all",
      difficulty: "Easy",
      query: "two",
      status: "due",
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]?.problem.leetcodeSlug).toBe("two-sum");
  });

  it.each([
    { elapsed: 0, goal: 10_000, hard: false, expected: 2 },
    { elapsed: 12_000, goal: 10_000, hard: false, expected: 1 },
    { elapsed: 12_000, goal: 10_000, hard: true, expected: 0 },
    { elapsed: 30_000, goal: 10_000, hard: false, expected: 1 },
  ])("derives quick rating: $elapsed ms vs $goal ms goal (hard: $hard) -> $expected", ({ elapsed, goal, hard, expected }) => {
    expect(deriveQuickRating(elapsed, goal, hard)).toBe(expected);
  });

  it.each([
    { state: makeStudyState("2026-03-30T00:00:00.000Z"), expected: "RECALL" },
    { state: null, expected: "FULL_SOLVE" },
  ])("derives default review mode", ({ state, expected }) => {
    expect(defaultReviewMode(state)).toBe(expected);
  });

  describe("date formatting", () => {
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
      expect(formatSubmissionDateLabel(date, relativeTo)).toBe(expected);
    });
  });

  it("maps structured log drafts to and from study state", () => {
    const studyState: StudyState = {
      attemptHistory: [],
      interviewPattern: "Sliding window",
      languages: "TypeScript",
      notes: "Track left and right bounds.",
      spaceComplexity: "O(1)",
      suspended: false,
      tags: [],
      timeComplexity: "O(n)",
    };

    const draft = draftFromStudyState(studyState);
    expect(draft).toEqual({
      interviewPattern: "Sliding window",
      languages: "TypeScript",
      notes: "Track left and right bounds.",
      spaceComplexity: "O(1)",
      timeComplexity: "O(n)",
    });
    expect(cloneDraft(draft)).toEqual(draft);
    expect(draftsEqual(draft, cloneDraft(draft))).toBe(true);
    expect(draftsEqual(draft, emptyDraft())).toBe(false);
    expect(reviewPayloadFromDraft(draft)).toEqual(draft);
  });

  it("builds header cards and due tones from review state", () => {
    const relativeTo = new Date("2026-04-19T10:00:00");
    const studyState: StudyState = {
      attemptHistory: [
        {
          mode: "RECALL",
          rating: 2,
          reviewedAt: "2026-04-18T12:00:00.000Z",
        },
      ],
      fsrsCard: {
        difficulty: 4,
        due: "2026-04-20T12:00:00.000Z",
        elapsedDays: 1,
        lapses: 0,
        learningSteps: 0,
        reps: 1,
        scheduledDays: 2,
        stability: 2,
        state: "Review",
      },
      suspended: false,
      tags: [],
    };

    const headerStatus = buildHeaderStatus(studyState, relativeTo);
    expect(headerStatus.kind).toBe("history");
    expect(headerStatus.cards.map((card) => card.label)).toEqual([
      "Last submitted",
      "Next due",
    ]);
    expect(headerStatus.cards[0]?.primary).toBe("yesterday");
    expect(headerStatus.cards[1]?.primary).toBe("tomorrow");
    expect(headerStatus.cards[1]?.tone).toBe("warning");
  });

  describe("due tone mapping", () => {
    const relativeTo = new Date("2026-04-19T10:00:00");

    it.each([
      { date: "2026-04-19T12:00:00.000Z", expected: "danger" },
      { date: "2026-04-21T12:00:00.000Z", expected: "warning" },
      { date: "2026-05-10T12:00:00.000Z", expected: "accent" },
    ])("maps $date to tone '$expected'", ({ date, expected }) => {
      expect(buildDueTone(date, relativeTo)).toBe(expected);
    });
  });
});
