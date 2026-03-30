import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { StudyState } from "../src/domain/types";
import { CourseQuestionView } from "../src/domain/views";
import { createMockAppShellPayload } from "../src/ui/mockData";
import { AppProviders } from "../src/ui/providers";
import { DashboardApp } from "../src/ui/screens/dashboard/DashboardApp";
import { OverlayPanel } from "../src/ui/screens/overlay/OverlayPanel";
import { PopupApp } from "../src/ui/screens/popup/PopupApp";

const sendMessageMock = vi.fn();
const tabsCreateMock = vi.fn();

vi.mock("../src/extension/runtime/client", () => {
  return {
    sendMessage: (...args: unknown[]) => sendMessageMock(...args),
  };
});

afterEach(() => {
  cleanup();
  sendMessageMock.mockReset();
  tabsCreateMock.mockReset();
});

beforeEach(() => {
  Object.defineProperty(globalThis, "chrome", {
    configurable: true,
    value: {
      runtime: {
        getURL: (path: string) => `chrome-extension://test/${path}`,
        id: "test-extension",
      },
      tabs: {
        create: tabsCreateMock,
      },
    },
  });
});

function makeStudyState(nextReviewAt?: string): StudyState {
  return {
    attemptHistory: [],
    fsrsCard: nextReviewAt
      ? {
          difficulty: 4,
          due: nextReviewAt,
          elapsedDays: 2,
          lapses: 0,
          learningSteps: 0,
          reps: 1,
          scheduledDays: 2,
          stability: 2,
          state: "Review",
        }
      : undefined,
    suspended: false,
    tags: [],
  };
}

function makePayload() {
  const payload = createMockAppShellPayload();
  payload.popup.recommended = {
    slug: "two-sum",
    title: "Two Sum",
    url: "https://leetcode.com/problems/two-sum/",
    difficulty: "Easy",
    reason: "Due now",
    nextReviewAt: "2026-03-30T00:00:00.000Z",
    alsoCourseNext: false,
  };
  payload.popup.recommendedCandidates = [
    payload.popup.recommended,
    {
      slug: "group-anagrams",
      title: "Group Anagrams",
      url: "https://leetcode.com/problems/group-anagrams/",
      difficulty: "Medium",
      reason: "Review focus",
      nextReviewAt: "2026-03-31T00:00:00.000Z",
      alsoCourseNext: true,
    },
  ] as NonNullable<typeof payload.popup.recommended>[];

  const nextQuestion: CourseQuestionView = {
    slug: "contains-duplicate",
    title: "Contains Duplicate",
    url: "https://leetcode.com/problems/contains-duplicate/",
    difficulty: "Easy",
    chapterId: "arrays-1",
    chapterTitle: "Arrays",
    status: "READY",
    reviewPhase: "Review",
    nextReviewAt: "2026-03-30T00:00:00.000Z",
    inLibrary: true,
    isCurrent: true,
  };

  payload.popup.courseNext = nextQuestion;
  payload.popup.activeCourse = {
    id: "Blind75",
    name: "Blind 75",
    description: "Classic interview baseline.",
    sourceSet: "Blind75",
    active: true,
    totalQuestions: 75,
    completedQuestions: 15,
    completionPercent: 20,
    dueCount: 2,
    totalChapters: 8,
    completedChapters: 2,
    nextQuestionTitle: "Contains Duplicate",
    nextChapterTitle: "Arrays",
  };

  payload.activeCourse = {
    ...payload.popup.activeCourse,
    activeChapterId: "arrays-1",
    activeChapterTitle: "Arrays",
    nextQuestion,
    chapters: [
      {
        id: "arrays-1",
        title: "Arrays",
        order: 1,
        status: "CURRENT",
        totalQuestions: 2,
        completedQuestions: 1,
        questions: [
          nextQuestion,
          {
            ...nextQuestion,
            slug: "two-sum",
            title: "Two Sum",
            status: "DUE_NOW",
            isCurrent: false,
          },
        ],
      },
    ],
  };

  payload.queue.items = [
    {
      slug: "two-sum",
      problem: {
        id: "1",
        leetcodeSlug: "two-sum",
        title: "Two Sum",
        difficulty: "Easy",
        url: "https://leetcode.com/problems/two-sum/",
        topics: [],
        sourceSet: ["Blind75"],
        createdAt: "2026-03-01T00:00:00.000Z",
        updatedAt: "2026-03-01T00:00:00.000Z",
      },
      studyState: makeStudyState("2026-03-30T00:00:00.000Z"),
      studyStateSummary: {
        phase: "Review",
        nextReviewAt: "2026-03-30T00:00:00.000Z",
        lastReviewedAt: "2026-03-29T00:00:00.000Z",
        reviewCount: 1,
        lapses: 0,
        difficulty: 4,
        stability: 2,
        scheduledDays: 2,
        suspended: false,
        isStarted: true,
        isDue: true,
        isOverdue: false,
        overdueDays: 0,
      },
      due: true,
      category: "due",
    },
  ];

  payload.courses = [
    payload.popup.activeCourse,
    {
      id: "NeetCode150",
      name: "NeetCode 150",
      description: "Expanded practice track.",
      sourceSet: "NeetCode150",
      active: false,
      totalQuestions: 150,
      completedQuestions: 40,
      completionPercent: 27,
      dueCount: 5,
      totalChapters: 12,
      completedChapters: 3,
      nextQuestionTitle: "3Sum",
      nextChapterTitle: "Two Pointers",
    },
  ];

  payload.courseOptions = [
    {
      id: "Blind75",
      name: "Blind 75",
      chapterOptions: [
        { id: "arrays-1", title: "Arrays" },
        { id: "graphs-1", title: "Graphs" },
      ],
    },
  ];

  payload.library = [
    {
      problem: payload.queue.items[0].problem,
      studyState: payload.queue.items[0].studyState,
      studyStateSummary: payload.queue.items[0].studyStateSummary,
      courses: [
        {
          courseId: "Blind75",
          courseName: "Blind 75",
          chapterId: "arrays-1",
          chapterTitle: "Arrays",
        },
      ],
    },
    {
      problem: {
        ...payload.queue.items[0].problem,
        id: "2",
        leetcodeSlug: "merge-intervals",
        title: "Merge Intervals",
        difficulty: "Medium",
        url: "https://leetcode.com/problems/merge-intervals/",
      },
      studyState: makeStudyState("2026-04-02T00:00:00.000Z"),
      studyStateSummary: {
        phase: "Learning",
        nextReviewAt: "2026-04-02T00:00:00.000Z",
        lastReviewedAt: "2026-03-28T00:00:00.000Z",
        reviewCount: 0,
        lapses: 0,
        difficulty: 5,
        stability: 1,
        scheduledDays: 1,
        suspended: false,
        isStarted: true,
        isDue: false,
        isOverdue: false,
        overdueDays: 0,
      },
      courses: [],
    },
  ];

  return payload;
}

describe("PopupApp", () => {
  it("renders recommended content and opens a problem", async () => {
    const payload = makePayload();
    sendMessageMock.mockImplementation(
      async (type: string, request: unknown) => {
        if (type === "GET_APP_SHELL_DATA") {
          return { ok: true, data: payload };
        }
        if (type === "OPEN_PROBLEM_PAGE") {
          return { ok: true, data: { opened: true }, request };
        }
        return { ok: true, data: {} };
      }
    );

    render(
      <AppProviders>
        <PopupApp />
      </AppProviders>
    );

    expect(await screen.findByText("Two Sum")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Open Problem" }));

    await waitFor(() => {
      expect(sendMessageMock).toHaveBeenCalledWith("OPEN_PROBLEM_PAGE", {
        slug: "two-sum",
        courseId: undefined,
        chapterId: undefined,
      });
    });
  });
});

describe("DashboardApp", () => {
  it("switches views and filters library rows", async () => {
    const payload = makePayload();
    sendMessageMock.mockImplementation(async (type: string) => {
      if (type === "GET_APP_SHELL_DATA") {
        return { ok: true, data: payload };
      }
      return { ok: true, data: {} };
    });

    render(
      <AppProviders>
        <DashboardApp />
      </AppProviders>
    );

    expect(
      await screen.findByRole("heading", { name: "Dashboard" })
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Library" }));

    expect(await screen.findByText("All Tracked Problems")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Search title or slug"), {
      target: { value: "merge" },
    });

    await waitFor(() => {
      expect(screen.queryByText("Two Sum")).toBeNull();
      expect(screen.getByText("Merge Intervals")).toBeTruthy();
    });
  });

  it("saves settings through runtime messaging", async () => {
    const payload = makePayload();
    sendMessageMock.mockImplementation(async (type: string) => {
      if (type === "GET_APP_SHELL_DATA") {
        return { ok: true, data: payload };
      }
      if (type === "UPDATE_SETTINGS") {
        return { ok: true, data: {} };
      }
      return { ok: true, data: {} };
    });

    render(
      <AppProviders>
        <DashboardApp />
      </AppProviders>
    );

    fireEvent.click(await screen.findByRole("button", { name: "Settings" }));
    fireEvent.change(await screen.findByLabelText("Daily New"), {
      target: { value: "9" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Settings" }));

    await waitFor(() => {
      expect(sendMessageMock).toHaveBeenCalledWith(
        "UPDATE_SETTINGS",
        expect.objectContaining({
          dailyNewLimit: 9,
          activeCourseId: "Blind75",
        })
      );
    });
  });
});

describe("OverlayPanel", () => {
  it("fires rating and mode callbacks from the expanded overlay", () => {
    const onSelectRating = vi.fn();
    const onChangeMode = vi.fn();

    render(
      <AppProviders>
        <OverlayPanel
          canReset
          collapsed={false}
          difficulty="Medium"
          feedback="Last reviewed today."
          feedbackIsError={false}
          goalDisplay="Goal 20:00"
          hint="Quick submit logs Good by default."
          isDue
          isTimerRunning={false}
          lastReviewedLabel="Last 3/29/2026"
          modeBadgeLabel="Repeat Review"
          nextReviewLabel="Next review 3/30/2026"
          notes=""
          onChangeMode={onChangeMode}
          onChangeNotes={() => undefined}
          onOpenSettings={() => undefined}
          onPauseTimer={() => undefined}
          onQuickSubmit={() => undefined}
          onRefresh={() => undefined}
          onResetTimer={() => undefined}
          onSaveReview={() => undefined}
          onSelectRating={onSelectRating}
          onStartTimer={() => undefined}
          onToggleCollapse={() => undefined}
          phaseLabel="Review"
          phaseTone="info"
          quickRatingLabel="Default Good"
          saveButtonLabel="Save Override"
          selectedMode="FULL_SOLVE"
          selectedRating={2}
          timerDisplay="00:00"
          title="Group Anagrams"
        />
      </AppProviders>
    );

    fireEvent.click(screen.getByRole("button", { name: /hard/i }));
    expect(onSelectRating).toHaveBeenCalledWith(1);

    fireEvent.mouseDown(screen.getByRole("combobox"));
    fireEvent.click(screen.getByRole("option", { name: "Recall mode" }));
    expect(onChangeMode).toHaveBeenCalledWith("RECALL");
  });
});
