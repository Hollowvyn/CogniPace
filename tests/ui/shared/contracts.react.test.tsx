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

  it("derives review policy from pure helpers", () => {
    expect(deriveQuickRating(0, 10_000)).toBe(2);
    expect(deriveQuickRating(12_000, 10_000)).toBe(1);
    expect(defaultReviewMode(makeStudyState("2026-03-30T00:00:00.000Z"))).toBe(
      "RECALL"
    );
    expect(defaultReviewMode(null)).toBe("FULL_SOLVE");
  });

  it("formats submission dates with calendar-style labels", () => {
    const relativeTo = new Date("2026-04-19T10:00:00");

    expect(formatSubmissionDateLabel("2026-04-19T12:00:00", relativeTo)).toBe(
      "today"
    );
    expect(formatSubmissionDateLabel("2026-04-18T12:00:00", relativeTo)).toBe(
      "yesterday"
    );
    expect(formatSubmissionDateLabel("2026-04-20T12:00:00", relativeTo)).toBe(
      "tomorrow"
    );
    expect(formatSubmissionDateLabel("2026-04-22T12:00:00", relativeTo)).toBe(
      "this Wednesday"
    );
    expect(formatSubmissionDateLabel("2026-04-16T12:00:00", relativeTo)).toBe(
      "last Thursday"
    );
    expect(formatSubmissionDateLabel("2026-03-01T12:00:00", relativeTo)).toBe(
      "Mar 1"
    );
    expect(formatSubmissionDateLabel("2025-12-31T12:00:00", relativeTo)).toBe(
      "Dec 31, 2025"
    );
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
    expect(buildDueTone("2026-04-19T12:00:00.000Z", relativeTo)).toBe("danger");
    expect(buildDueTone("2026-04-21T12:00:00.000Z", relativeTo)).toBe(
      "warning"
    );
    expect(buildDueTone("2026-05-10T12:00:00.000Z", relativeTo)).toBe("accent");
  });
});
