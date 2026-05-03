import { createInitialUserSettings } from "../domain/settings";
import { AppShellPayload, PopupShellPayload } from "../shared/types";

export function createMockPopupShellPayload(): PopupShellPayload {
  return {
    popup: {
      dueCount: 5,
      streakDays: 7,
      recommended: null,
      recommendedCandidates: [],
      courseNext: null,
      activeCourse: null,
    },
    activeCourse: null,
    settings: createInitialUserSettings(),
  };
}

export function createMockAppShellPayload(): AppShellPayload {
  const popupShell = createMockPopupShellPayload();

  return {
    ...popupShell,
    queue: {
      generatedAt: "2026-03-29T00:00:00.000Z",
      dueCount: 5,
      newCount: 3,
      reinforcementCount: 2,
      items: [],
    },
    analytics: {
      streakDays: 7,
      totalReviews: 42,
      retentionProxy: 0.85,
      phaseCounts: {
        New: 10,
        Learning: 5,
        Review: 20,
        Relearning: 1,
        Suspended: 0,
      },
      dueByDay: [
        { date: "2026-03-29", count: 3 },
        { date: "2026-03-30", count: 5 },
        { date: "2026-03-31", count: 2 },
      ],
      weakestProblems: [
        { slug: "two-sum", title: "Two Sum", lapses: 3, difficulty: 0.7 },
        {
          slug: "valid-parentheses",
          title: "Valid Parentheses",
          lapses: 2,
          difficulty: 0.5,
        },
      ],
    },
    courses: [],
    recommendedCandidates: [],
    library: [],
    courseOptions: [],
  };
}
