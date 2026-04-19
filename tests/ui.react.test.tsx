import {cleanup, fireEvent, render, screen, waitFor, within,} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

import {StudyState} from "../src/domain/types";
import {CourseQuestionView} from "../src/domain/views";
import {createMockAppShellPayload} from "../src/ui/mockData";
import {AppProviders} from "../src/ui/providers";
import {DashboardApp} from "../src/ui/screens/dashboard/DashboardApp";
import {OverlayPanel} from "../src/ui/screens/overlay/OverlayPanel";
import {PopupApp} from "../src/ui/screens/popup/PopupApp";

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
        {id: "arrays-1", title: "Arrays"},
        {id: "graphs-1", title: "Graphs"},
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
          return {ok: true, data: payload};
        }
        if (type === "OPEN_PROBLEM_PAGE") {
          return {ok: true, data: {opened: true}, request};
        }
        return {ok: true, data: {}};
      }
    );

    render(
      <AppProviders>
        <PopupApp/>
      </AppProviders>
    );

    expect(await screen.findByText("Two Sum")).toBeTruthy();
    expect(screen.getByRole("button", {name: "Refresh popup"})).toBeTruthy();
    expect(screen.getByRole("button", {name: "Open settings"})).toBeTruthy();
    expect(
      screen.getByRole("button", {name: "Shuffle recommendation"})
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", {name: "Open Problem"}));

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
        return {ok: true, data: payload};
      }
      return {ok: true, data: {}};
    });

    render(
      <AppProviders>
        <DashboardApp/>
      </AppProviders>
    );

    expect(
      await screen.findByRole("heading", {name: "Dashboard"})
    ).toBeTruthy();
    expect(
      screen.getByRole("button", {name: "Refresh dashboard"})
    ).toBeTruthy();
    expect(
      screen.getAllByRole("button", {name: "Open settings"}).length
    ).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", {name: "Library"}));

    expect(await screen.findByText("All Tracked Problems")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Search title or slug"), {
      target: {value: "merge"},
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
        return {ok: true, data: payload};
      }
      if (type === "UPDATE_SETTINGS") {
        return {ok: true, data: {}};
      }
      return {ok: true, data: {}};
    });

    render(
      <AppProviders>
        <DashboardApp/>
      </AppProviders>
    );

    fireEvent.click(await screen.findByRole("button", {name: "Settings"}));
    expect(
      screen.getByRole("button", {name: "Information about Target Retention"})
    ).toBeTruthy();
    fireEvent.change(await screen.findByLabelText("Daily New"), {
      target: {value: "9"},
    });
    fireEvent.click(screen.getByRole("button", {name: "Save Settings"}));

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
  function renderOverlayPanel(
    overrides: Partial<Parameters<typeof OverlayPanel>[0]> = {}
  ) {
    return render(
      <AppProviders>
        <OverlayPanel
          canEditTimer
          canResetTimer
          canRestartSession={false}
          canSaveOverride={false}
          canSubmit
          collapsed={false}
          difficulty="Medium"
          draft={{
            interviewPattern: "",
            timeComplexity: "",
            spaceComplexity: "",
            languages: "",
            notes: "",
          }}
          feedback="Last reviewed today."
          feedbackIsError={false}
          isTimerRunning={false}
          onChangeDraft={() => undefined}
          onCompactSubmit={() => undefined}
          onFailReview={() => undefined}
          onOpenSettings={() => undefined}
          onPauseTimer={() => undefined}
          onResetTimer={() => undefined}
          onRestartSession={() => undefined}
          onSaveOverride={() => undefined}
          onSelectRating={() => undefined}
          onStartTimer={() => undefined}
          onSubmit={() => undefined}
          onToggleCollapse={() => undefined}
          headerStatus={{
            kind: "history",
            cards: [
              {
                label: "Last submitted",
                primary: "Mar 29",
                secondary: "",
                tone: "neutral",
              },
              {
                emphasized: true,
                label: "Next due",
                primary: "Mar 30",
                secondary: "",
                tone: "warning",
              },
            ],
          }}
          selectedRating={2}
          sessionLabel="Recall review"
          targetDisplay="35:00"
          timerDisplay="00:00"
          title="Group Anagrams"
          {...overrides}
        />
      </AppProviders>
    );
  }

  it("fires rating and draft callbacks from the expanded overlay", () => {
    const onSelectRating = vi.fn();
    const onChangeDraft = vi.fn();

    const {rerender} = renderOverlayPanel({
      onChangeDraft,
      onSelectRating,
    });

    expect(screen.getByRole("button", {name: "Open settings"})).toBeTruthy();
    expect(
      screen.getByRole("button", {name: "Collapse overlay"})
    ).toBeTruthy();
    expect(screen.getByText("Recall review")).toBeTruthy();
    expect(screen.getByText("Last submitted")).toBeTruthy();
    expect(screen.getByText("Mar 29")).toBeTruthy();
    expect(screen.getByText("Next due")).toBeTruthy();
    expect(screen.getByText("Mar 30")).toBeTruthy();
    const assessmentButtons = within(screen.getByRole("group")).getAllByRole("button");
    expect(assessmentButtons).toHaveLength(4);
    expect(assessmentButtons[0]?.textContent).toMatch(/Easy\s*Fast/);
    expect(assessmentButtons[1]?.textContent).toMatch(/Good\s*Stable/);
    expect(assessmentButtons[2]?.textContent).toMatch(/Hard\s*Lagging/);
    expect(assessmentButtons[3]?.textContent).toMatch(/Again\s*Failed/);
    expect(
      screen.getByRole("button", {name: "Good Stable"}).getAttribute("aria-pressed")
    ).toBe("true");

    fireEvent.click(screen.getByRole("button", {name: "Easy Fast"}));
    fireEvent.click(screen.getByRole("button", {name: "Hard Lagging"}));
    fireEvent.click(screen.getByRole("button", {name: "Again Failed"}));

    rerender(
      <AppProviders>
        <OverlayPanel
          canEditTimer
          canResetTimer
          canRestartSession={false}
          canSaveOverride={false}
          canSubmit
          collapsed={false}
          difficulty="Medium"
          draft={{
            interviewPattern: "",
            timeComplexity: "",
            spaceComplexity: "",
            languages: "",
            notes: "",
          }}
          feedback="Last reviewed today."
          feedbackIsError={false}
          isTimerRunning={false}
          onChangeDraft={onChangeDraft}
          onCompactSubmit={() => undefined}
          onFailReview={() => undefined}
          onOpenSettings={() => undefined}
          onPauseTimer={() => undefined}
          onResetTimer={() => undefined}
          onRestartSession={() => undefined}
          onSaveOverride={() => undefined}
          onSelectRating={onSelectRating}
          onStartTimer={() => undefined}
          onSubmit={() => undefined}
          onToggleCollapse={() => undefined}
          headerStatus={{
            kind: "history",
            cards: [
              {
                label: "Last submitted",
                primary: "Mar 29",
                secondary: "",
                tone: "neutral",
              },
              {
                emphasized: true,
                label: "Next due",
                primary: "Mar 30",
                secondary: "",
                tone: "warning",
              },
            ],
          }}
          selectedRating={0}
          sessionLabel="Recall review"
          targetDisplay="35:00"
          timerDisplay="00:00"
          title="Group Anagrams"
        />
      </AppProviders>
    );

    fireEvent.click(screen.getByRole("button", {name: "Good Stable"}));
    expect(onSelectRating.mock.calls.map(([rating]) => rating)).toEqual([3, 1, 0, 2]);

    fireEvent.change(screen.getByLabelText("Interview pattern"), {
      target: {value: "Sliding window"},
    });
    expect(onChangeDraft).toHaveBeenCalledWith(
      "interviewPattern",
      "Sliding window"
    );

    expect(screen.getByLabelText("Time complexity")).toBeTruthy();
    expect(screen.getByLabelText("Space complexity")).toBeTruthy();
    expect(screen.getByLabelText("Languages used")).toBeTruthy();
    expect(screen.getByLabelText("Notes")).toBeTruthy();
  });

  it("uses expanded header row click zones while respecting buttons", () => {
    const onOpenSettings = vi.fn();
    const onToggleCollapse = vi.fn();

    renderOverlayPanel({
      onOpenSettings,
      onToggleCollapse,
    });

    fireEvent.click(screen.getByRole("button", {name: "Open settings"}));
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
    expect(onToggleCollapse).toHaveBeenCalledTimes(0);

    fireEvent.click(screen.getByText("Group Anagrams"));
    expect(onToggleCollapse).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId("expanded-overlay-header-divider"));
    expect(onToggleCollapse).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByTestId("expanded-overlay-header-row"));
    expect(onToggleCollapse).toHaveBeenCalledTimes(3);

    fireEvent.click(screen.getByRole("button", {name: "Collapse overlay"}));
    expect(onToggleCollapse).toHaveBeenCalledTimes(4);
  });

  it("renders a compact collapsed summary", () => {
    renderOverlayPanel({
      collapsed: true,
      difficulty: "Easy",
      headerStatus: {
        kind: "empty",
        cards: [
          {
            label: "No submissions yet",
            primary: "After first submission",
            secondary: "",
            tone: "neutral",
          },
        ],
      },
      sessionLabel: "First solve",
      targetDisplay: "20:00",
      timerDisplay: "03:12",
      title: "Counting Bits",
    });

    expect(screen.getByRole("button", {name: "Expand overlay"})).toBeTruthy();
    expect(screen.getByText("03:12")).toBeTruthy();
    expect(screen.getByRole("button", {name: "Start timer"})).toBeTruthy();
    expect(screen.getByRole("button", {name: "Restart timer"})).toBeTruthy();
    expect(screen.getByRole("button", {name: "Fail review"})).toBeTruthy();
    expect(screen.getByRole("button", {name: "Submit"})).toBeTruthy();
    expect(screen.queryByText("Counting Bits")).toBeNull();
    expect(screen.queryByText("First solve")).toBeNull();
    expect(screen.queryByText("No submissions yet")).toBeNull();
  });

  it("uses compact timer, restart, and submit actions in the collapsed overlay", () => {
    const onStartTimer = vi.fn();
    const onPauseTimer = vi.fn();
    const onResetTimer = vi.fn();
    const onCompactSubmit = vi.fn();
    const onFailReview = vi.fn();
    const onToggleCollapse = vi.fn();

    const {rerender} = renderOverlayPanel({
      collapsed: true,
      difficulty: "Easy",
      onCompactSubmit,
      onFailReview,
      onPauseTimer,
      onResetTimer,
      onStartTimer,
      headerStatus: {
        kind: "empty",
        cards: [
          {
            label: "No submissions yet",
            primary: "After first submission",
            secondary: "",
            tone: "neutral",
          },
        ],
      },
      sessionLabel: "First solve",
      targetDisplay: "20:00",
      timerDisplay: "03:12",
      title: "Counting Bits",
    });

    fireEvent.click(screen.getByRole("button", {name: "Start timer"}));
    expect(onStartTimer).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", {name: "Restart timer"}));
    expect(onResetTimer).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", {name: "Fail review"}));
    expect(onFailReview).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", {name: "Submit"}));
    expect(onCompactSubmit).toHaveBeenCalledTimes(1);

    rerender(
      <AppProviders>
        <OverlayPanel
          canEditTimer
          canResetTimer
          canRestartSession={false}
          canSaveOverride={false}
          canSubmit
          collapsed
          difficulty="Easy"
          draft={{
            interviewPattern: "",
            timeComplexity: "",
            spaceComplexity: "",
            languages: "",
            notes: "",
          }}
          feedback=""
          feedbackIsError={false}
          isTimerRunning
          onChangeDraft={() => undefined}
          onCompactSubmit={onCompactSubmit}
          onFailReview={onFailReview}
          onOpenSettings={() => undefined}
          onPauseTimer={onPauseTimer}
          onResetTimer={onResetTimer}
          onRestartSession={() => undefined}
          onSaveOverride={() => undefined}
          onSelectRating={() => undefined}
          onStartTimer={onStartTimer}
          onSubmit={() => undefined}
          onToggleCollapse={onToggleCollapse}
          headerStatus={{
            kind: "empty",
            cards: [
              {
                label: "No submissions yet",
                primary: "After first submission",
                secondary: "",
                tone: "neutral",
              },
            ],
          }}
          selectedRating={2}
          sessionLabel="First solve"
          targetDisplay="20:00"
          timerDisplay="03:12"
          title="Counting Bits"
        />
      </AppProviders>
    );

    fireEvent.click(screen.getByRole("button", {name: "Pause timer"}));
    expect(onPauseTimer).toHaveBeenCalledTimes(1);

    rerender(
      <AppProviders>
        <OverlayPanel
          canEditTimer={false}
          canResetTimer={false}
          canRestartSession
          canSaveOverride
          canSubmit={false}
          collapsed
          difficulty="Easy"
          draft={{
            interviewPattern: "Two pointers",
            timeComplexity: "O(n)",
            spaceComplexity: "O(1)",
            languages: "TypeScript",
            notes: "Keep the window balanced.",
          }}
          feedback=""
          feedbackIsError={false}
          isTimerRunning={false}
          onChangeDraft={() => undefined}
          onCompactSubmit={onCompactSubmit}
          onFailReview={onFailReview}
          onOpenSettings={() => undefined}
          onPauseTimer={onPauseTimer}
          onResetTimer={onResetTimer}
          onRestartSession={() => undefined}
          onSaveOverride={() => undefined}
          onSelectRating={() => undefined}
          onStartTimer={onStartTimer}
          onSubmit={() => undefined}
          onToggleCollapse={() => undefined}
          headerStatus={{
            kind: "history",
            cards: [
              {
                label: "Last submitted",
                primary: "Mar 29",
                secondary: "",
                tone: "neutral",
              },
              {
                emphasized: true,
                label: "Next due",
                primary: "Mar 30",
                secondary: "",
                tone: "warning",
              },
            ],
          }}
          selectedRating={2}
          sessionLabel="Recall review"
          targetDisplay="20:00"
          timerDisplay="03:12"
          title="Counting Bits"
        />
      </AppProviders>
    );

    fireEvent.click(screen.getByRole("button", {name: "Start a new session"}));
    expect(onStartTimer).toHaveBeenCalledTimes(2);
    const disabledTimerResetButton = screen.getByRole("button", {name: "Restart timer"});
    expect((disabledTimerResetButton as HTMLButtonElement).disabled).toBe(true);
    expect(
      (screen.getByRole("button", {name: "Submit"}) as HTMLButtonElement)
        .disabled
    ).toBe(true);
    expect(
      (screen.getByRole("button", {name: "Fail review"}) as HTMLButtonElement)
        .disabled
    ).toBe(true);
  });

  it("shows expanded submission controls for override and restart", () => {
    renderOverlayPanel({
      canEditTimer: false,
      canResetTimer: false,
      canRestartSession: true,
      canSaveOverride: true,
      canSubmit: false,
      difficulty: "Easy",
      draft: {
        interviewPattern: "Binary search on answer",
        timeComplexity: "O(n log n)",
        spaceComplexity: "O(1)",
        languages: "Python",
        notes: "Track the feasibility boundary.",
      },
      headerStatus: {
        kind: "history",
        cards: [
          {
            label: "Last submitted",
            primary: "Mar 29",
            secondary: "",
            tone: "neutral",
          },
          {
            emphasized: true,
            label: "Next due",
            primary: "Mar 30",
            secondary: "",
            tone: "warning",
          },
        ],
      },
      sessionLabel: "Recall review",
      title: "Find Minimum In Rotated Sorted Array",
    });

    expect(screen.getByText("Assessment")).toBeTruthy();
    expect(screen.getByText("Next due")).toBeTruthy();
    expect(
      (
        screen.getByRole("button", {name: "I couldn't finish :("}) as HTMLButtonElement
      )
        .disabled
    ).toBe(true);
    expect(
      (screen.getByRole("button", {name: "Submit"}) as HTMLButtonElement)
        .disabled
    ).toBe(true);
    expect(
      (screen.getByRole("button", {name: "Update"}) as HTMLButtonElement)
        .disabled
    ).toBe(false);
    expect(
      (screen.getByRole("button", {name: "Restart"}) as HTMLButtonElement)
        .disabled
    ).toBe(false);
    expect(screen.getByDisplayValue("Binary search on answer")).toBeTruthy();
  });
});
