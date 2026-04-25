import {cleanup, fireEvent, render, screen, waitFor, within,} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

import {StudyState} from "../src/domain/types";
import {CourseQuestionView} from "../src/domain/views";
import {createMockAppShellPayload} from "../src/ui/mockData";
import {AppProviders} from "../src/ui/providers";
import {DashboardApp} from "../src/ui/screens/dashboard/DashboardApp";
import {OverlayPanel} from "../src/ui/screens/overlay/OverlayPanel";
import {
  CollapsedOverlayViewModel,
  DockedOverlayViewModel,
  ExpandedOverlayViewModel,
  OverlayRenderModel,
} from "../src/ui/screens/overlay/overlayPanel.types";
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

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return {promise, reject, resolve};
}

describe("PopupApp", () => {
  it("renders the compact header and opens the recommended problem", async () => {
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
      screen.getByRole("button", {name: "Start freestyle mode"})
    ).toBeTruthy();
    expect(screen.queryByText(/Next review day:/i)).toBeNull();
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

  it("shuffles only the recommendation", async () => {
    const payload = makePayload();
    sendMessageMock.mockImplementation(async (type: string) => {
      if (type === "GET_APP_SHELL_DATA") {
        return {ok: true, data: payload};
      }
      return {ok: true, data: {}};
    });

    render(
      <AppProviders>
        <PopupApp/>
      </AppProviders>
    );

    expect(await screen.findByText("Two Sum")).toBeTruthy();
    expect(screen.getByText("Contains Duplicate")).toBeTruthy();

    fireEvent.click(
      screen.getByRole("button", {name: "Shuffle recommendation"})
    );

    expect(await screen.findByText("Group Anagrams")).toBeTruthy();
    expect(screen.getByText("Contains Duplicate")).toBeTruthy();
  });

  it("opens the courses dashboard from the active-course panel", async () => {
    const payload = makePayload();
    sendMessageMock.mockImplementation(async (type: string) => {
      if (type === "GET_APP_SHELL_DATA") {
        return {ok: true, data: payload};
      }
      return {ok: true, data: {}};
    });

    render(
      <AppProviders>
        <PopupApp/>
      </AppProviders>
    );

    expect(await screen.findByText("Blind 75")).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", {name: "Open courses dashboard"})
    );

    expect(tabsCreateMock).toHaveBeenCalledWith({
      url: "chrome-extension://test/dashboard.html?view=courses",
    });
  });

  it("opens the next course problem from the inline continue action", async () => {
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

    expect(await screen.findByText("Contains Duplicate")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", {name: "Continue path"}));

    await waitFor(() => {
      expect(sendMessageMock).toHaveBeenCalledWith("OPEN_PROBLEM_PAGE", {
        slug: "contains-duplicate",
        courseId: "Blind75",
        chapterId: "arrays-1",
      });
    });
  });

  it("sets study mode immediately and persists it", async () => {
    const payload = makePayload();
    const updateResponse = deferred<{
      ok: boolean;
      data: { settings: typeof payload.settings };
    }>();

    sendMessageMock.mockImplementation((type: string) => {
      if (type === "GET_APP_SHELL_DATA") {
        return Promise.resolve({ok: true, data: payload});
      }
      if (type === "UPDATE_SETTINGS") {
        return updateResponse.promise;
      }
      return Promise.resolve({ok: true, data: {}});
    });

    render(
      <AppProviders>
        <PopupApp/>
      </AppProviders>
    );

    expect(await screen.findByText("Two Sum")).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", {name: "Start freestyle mode"})
    );

    expect(await screen.findByText("You are in free style mode")).toBeTruthy();
    await waitFor(() => {
      expect(sendMessageMock).toHaveBeenCalledWith(
        "UPDATE_SETTINGS",
        expect.objectContaining({studyMode: "freestyle"})
      );
    });

    updateResponse.resolve({
      ok: true,
      data: {
        settings: {
          ...payload.settings,
          studyMode: "freestyle",
        },
      },
    });

    expect(await screen.findByText(/Freestyle active\./)).toBeTruthy();
  });

  it("keeps the course panel in freestyle mode and optimistically returns to study mode", async () => {
    const payload = makePayload();
    payload.settings.studyMode = "freestyle";
    const updateResponse = deferred<{
      ok: boolean;
      data: { settings: typeof payload.settings };
    }>();

    sendMessageMock.mockImplementation((type: string) => {
      if (type === "GET_APP_SHELL_DATA") {
        return Promise.resolve({ok: true, data: payload});
      }
      if (type === "UPDATE_SETTINGS") {
        return updateResponse.promise;
      }
      return Promise.resolve({ok: true, data: {}});
    });

    render(
      <AppProviders>
        <PopupApp/>
      </AppProviders>
    );

    expect(await screen.findByText("Two Sum")).toBeTruthy();
    expect(screen.getByText("You are in free style mode")).toBeTruthy();
    expect(screen.queryByText("Blind 75")).toBeNull();
    expect(screen.queryByRole("button", {name: "Continue path"})).toBeNull();
    expect(
      screen.getByRole("button", {name: "Start study mode"})
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("button", {name: "Start study mode"}));

    expect(await screen.findByText("Blind 75")).toBeTruthy();
    expect(screen.getByRole("button", {name: "Continue path"})).toBeTruthy();

    await waitFor(() => {
      expect(sendMessageMock).toHaveBeenCalledWith(
        "UPDATE_SETTINGS",
        expect.objectContaining({studyMode: "studyPlan"})
      );
    });

    updateResponse.resolve({
      ok: true,
      data: {
        settings: {
          ...payload.settings,
          studyMode: "studyPlan",
        },
      },
    });

    expect(await screen.findByText(/Study mode active\./)).toBeTruthy();
  });

  it("disables mode actions in flight and skips duplicate writes", async () => {
    const payload = makePayload();
    const updateResponse = deferred<{
      ok: boolean;
      data: { settings: typeof payload.settings };
    }>();

    sendMessageMock.mockImplementation(
      (
        type: string,
        request?: { studyMode?: "freestyle" | "studyPlan" }
      ) => {
        if (type === "GET_APP_SHELL_DATA") {
          return Promise.resolve({ok: true, data: payload});
        }

        if (type === "UPDATE_SETTINGS" && request?.studyMode === "freestyle") {
          return updateResponse.promise;
        }

        return Promise.resolve({ok: true, data: {}});
      }
    );

    render(
      <AppProviders>
        <PopupApp/>
      </AppProviders>
    );

    expect(await screen.findByText("Blind 75")).toBeTruthy();

    const modeButton = screen.getByRole("button", {
      name: "Start freestyle mode",
    });
    fireEvent.click(modeButton);

    expect(await screen.findByText("You are in free style mode")).toBeTruthy();
    expect(
      (
        screen.getByRole("button", {
          name: "Start study mode",
        }) as HTMLButtonElement
      ).disabled
    ).toBe(true);

    fireEvent.click(
      screen.getByRole("button", {name: "Start study mode"})
    );

    let updateCalls = sendMessageMock.mock.calls.filter(
      ([type]) => type === "UPDATE_SETTINGS"
    );
    expect(updateCalls).toHaveLength(1);

    updateResponse.resolve({
      ok: true,
      data: {
        settings: {
          ...payload.settings,
          studyMode: "freestyle",
        },
      },
    });

    await waitFor(() => {
      updateCalls = sendMessageMock.mock.calls.filter(
        ([type]) => type === "UPDATE_SETTINGS"
      );
      expect(updateCalls).toHaveLength(1);
    });
  });

  it("rolls back mode changes and shows inline errors when persistence fails", async () => {
    const payload = makePayload();
    const updateResponse = deferred<{ ok: boolean; error: string }>();

    sendMessageMock.mockImplementation((type: string) => {
      if (type === "GET_APP_SHELL_DATA") {
        return Promise.resolve({ok: true, data: payload});
      }
      if (type === "UPDATE_SETTINGS") {
        return updateResponse.promise;
      }
      return Promise.resolve({ok: true, data: {}});
    });

    render(
      <AppProviders>
        <PopupApp/>
      </AppProviders>
    );

    expect(await screen.findByText("Blind 75")).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", {name: "Start freestyle mode"})
    );

    expect(await screen.findByText("You are in free style mode")).toBeTruthy();

    updateResponse.resolve({
      ok: false,
      error: "Storage unavailable.",
    });

    expect(await screen.findByText("Storage unavailable.")).toBeTruthy();
    expect(screen.getByText("Blind 75")).toBeTruthy();
    expect(screen.queryByText("You are in free style mode")).toBeNull();
    expect(
      (
        screen.getByRole("button", {
          name: "Start freestyle mode",
        }) as HTMLButtonElement
      ).disabled
    ).toBe(false);
  });

  it("rolls back mode changes when runtime messaging rejects", async () => {
    const payload = makePayload();
    const updateResponse = deferred<never>();

    sendMessageMock.mockImplementation((type: string) => {
      if (type === "GET_APP_SHELL_DATA") {
        return Promise.resolve({ok: true, data: payload});
      }
      if (type === "UPDATE_SETTINGS") {
        return updateResponse.promise;
      }
      return Promise.resolve({ok: true, data: {}});
    });

    render(
      <AppProviders>
        <PopupApp/>
      </AppProviders>
    );

    expect(await screen.findByText("Blind 75")).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", {name: "Start freestyle mode"})
    );

    expect(await screen.findByText("You are in free style mode")).toBeTruthy();

    updateResponse.reject(new Error("Background unavailable."));

    expect(await screen.findByText("Background unavailable.")).toBeTruthy();
    expect(screen.getByText("Blind 75")).toBeTruthy();
    expect(screen.queryByText("You are in free style mode")).toBeNull();
  });

  it("renders a compact empty state when no recommendation exists", async () => {
    const payload = makePayload();
    payload.popup.recommended = null;
    payload.popup.recommendedCandidates = [];

    sendMessageMock.mockImplementation(async (type: string) => {
      if (type === "GET_APP_SHELL_DATA") {
        return {ok: true, data: payload};
      }
      return {ok: true, data: {}};
    });

    render(
      <AppProviders>
        <PopupApp/>
      </AppProviders>
    );

    expect(await screen.findByText("Queue Clear")).toBeTruthy();
  });

  it("renders the no-active-course state", async () => {
    const payload = makePayload();
    payload.popup.activeCourse = null;
    payload.popup.courseNext = null;
    payload.activeCourse = null;

    sendMessageMock.mockImplementation(async (type: string) => {
      if (type === "GET_APP_SHELL_DATA") {
        return {ok: true, data: payload};
      }
      return {ok: true, data: {}};
    });

    render(
      <AppProviders>
        <PopupApp/>
      </AppProviders>
    );

    expect(await screen.findByText("No Active Course")).toBeTruthy();
  });

  it("removes the course and up-next subtitles in study mode", async () => {
    const payload = makePayload();
    sendMessageMock.mockImplementation(async (type: string) => {
      if (type === "GET_APP_SHELL_DATA") {
        return {ok: true, data: payload};
      }
      return {ok: true, data: {}};
    });

    render(
      <AppProviders>
        <PopupApp/>
      </AppProviders>
    );

    expect(await screen.findByText("Blind 75")).toBeTruthy();
    expect(screen.queryByText("Arrays")).toBeNull();
  });

  it("renders the course-complete state when no next question exists", async () => {
    const payload = makePayload();
    payload.popup.courseNext = null;
    payload.activeCourse = {
      ...payload.activeCourse!,
      activeChapterId: null,
      activeChapterTitle: null,
      nextQuestion: null,
    };

    sendMessageMock.mockImplementation(async (type: string) => {
      if (type === "GET_APP_SHELL_DATA") {
        return {ok: true, data: payload};
      }
      return {ok: true, data: {}};
    });

    render(
      <AppProviders>
        <PopupApp/>
      </AppProviders>
    );

    expect(await screen.findByText(/Course complete\./)).toBeTruthy();
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
  type ExpandedRenderModelOverrides = {
    actionAssist?: Partial<ExpandedOverlayViewModel["actionAssist"]>;
    actions?: Partial<ExpandedOverlayViewModel["actions"]>;
    assessment?: Partial<ExpandedOverlayViewModel["assessment"]>;
    assessmentAssist?: Partial<ExpandedOverlayViewModel["assessmentAssist"]>;
    feedback?: Partial<
      NonNullable<ExpandedOverlayViewModel["feedback"]>
    > | null;
    header?: Partial<ExpandedOverlayViewModel["header"]>;
    onClickAway?: ExpandedOverlayViewModel["onClickAway"];
    log?: {
      draft?: Partial<ExpandedOverlayViewModel["log"]["draft"]>;
      onChange?: ExpandedOverlayViewModel["log"]["onChange"];
    };
    timer?: Partial<ExpandedOverlayViewModel["timer"]>;
  };

  type CollapsedRenderModelOverrides = {
    actions?: Partial<CollapsedOverlayViewModel["actions"]>;
    assist?: Partial<CollapsedOverlayViewModel["assist"]>;
    feedback?: Partial<
      NonNullable<CollapsedOverlayViewModel["feedback"]>
    > | null;
    timer?: Partial<CollapsedOverlayViewModel["timer"]>;
  };

  type DockedRenderModelOverrides = Partial<DockedOverlayViewModel>;

  function makeExpandedRenderModel(
    overrides: ExpandedRenderModelOverrides = {}
  ): OverlayRenderModel {
    const feedback =
      overrides.feedback === null
        ? null
        : {
          isError: false,
          message: "Last reviewed today.",
          ...(overrides.feedback ?? {}),
        };

    return {
      model: {
        actions: {
          canFail: true,
          canRestart: false,
          canSubmit: true,
          canUpdate: false,
          onFail: () => undefined,
          onRestart: () => undefined,
          onSubmit: () => undefined,
          onUpdate: () => undefined,
          ...overrides.actions,
        },
        actionAssist: {
          message: "Submit saves this attempt.",
          tone: "default",
          ...overrides.actionAssist,
        },
        assessment: {
          disabledRatings: [],
          onSelectRating: () => undefined,
          selectedRating: 2,
          ...overrides.assessment,
        },
        assessmentAssist: {
          id: "overlay-assessment-help",
          message: "Good means you finished with steady recall.",
          tone: "accent",
          ...overrides.assessmentAssist,
        },
        feedback,
        header: {
          difficulty: "Medium",
          onCollapse: () => undefined,
          onHide: () => undefined,
          onOpenSettings: () => undefined,
          sessionLabel: "Recall review",
          status: {
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
          title: "Group Anagrams",
          ...overrides.header,
        },
        onClickAway: overrides.onClickAway ?? (() => undefined),
        log: {
          draft: {
            interviewPattern: "",
            timeComplexity: "",
            spaceComplexity: "",
            languages: "",
            notes: "",
            ...(overrides.log?.draft ?? {}),
          },
          onChange: overrides.log?.onChange ?? (() => undefined),
        },
        timer: {
          canPause: true,
          canReset: true,
          canStart: true,
          display: "00:00",
          isRunning: false,
          onPause: () => undefined,
          onReset: () => undefined,
          onStart: () => undefined,
          startLabel: "Start timer",
          targetDisplay: "35:00",
          ...overrides.timer,
        },
      },
      variant: "expanded",
    };
  }

  function makeCollapsedRenderModel(
    overrides: CollapsedRenderModelOverrides = {}
  ): OverlayRenderModel {
    const feedback =
      overrides.feedback === null
        ? null
        : {
          isError: false,
          message: "",
          ...(overrides.feedback ?? {}),
        };

    return {
      model: {
        actions: {
          canFail: true,
          onHide: () => undefined,
          canSubmit: true,
          onExpand: () => undefined,
          onFail: () => undefined,
          onSubmit: () => undefined,
          ...overrides.actions,
        },
        assist: {
          id: "overlay-collapsed-help",
          message: "Collapsed mode keeps the timer and quick actions nearby.",
          tone: "default",
          ...overrides.assist,
        },
        feedback,
        timer: {
          canPause: true,
          canReset: true,
          canStart: true,
          display: "03:12",
          isRunning: false,
          onPause: () => undefined,
          onReset: () => undefined,
          onStart: () => undefined,
          startLabel: "Start timer",
          ...overrides.timer,
        },
      },
      variant: "collapsed",
    };
  }

  function makeDockedRenderModel(
    overrides: DockedRenderModelOverrides = {}
  ): OverlayRenderModel {
    return {
      model: {
        onRestore: () => undefined,
        ...overrides,
      },
      variant: "docked",
    };
  }

  function renderOverlayPanel(renderModel = makeExpandedRenderModel()) {
    return render(
      <AppProviders>
        <OverlayPanel renderModel={renderModel}/>
      </AppProviders>
    );
  }

  function firePointerEvent(
    target: Element,
    type: "pointerdown" | "pointermove" | "pointerup",
    coordinates: {
      clientX?: number;
      clientY: number;
    }
  ) {
    fireEvent(
      target,
      new MouseEvent(type, {
        bubbles: true,
        clientX: coordinates.clientX ?? 0,
        clientY: coordinates.clientY,
      })
    );
  }

  it("fires rating and draft callbacks from the expanded overlay", () => {
    const onSelectRating = vi.fn();
    const onChangeDraft = vi.fn();

    const {rerender} = renderOverlayPanel(
      makeExpandedRenderModel({
        assessment: {
          onSelectRating,
        },
        log: {
          onChange: onChangeDraft,
        },
      })
    );

    expect(screen.getByRole("button", {name: "Open settings"})).toBeTruthy();
    expect(
      screen.getByRole("button", {name: "Collapse overlay"})
    ).toBeTruthy();
    expect(screen.getByText("Recall review")).toBeTruthy();
    expect(screen.getByText("Last submitted")).toBeTruthy();
    expect(screen.getByText("Mar 29")).toBeTruthy();
    expect(screen.getByText("Next due")).toBeTruthy();
    expect(screen.getByText("Mar 30")).toBeTruthy();
    const assessmentButtons = within(
      screen.getByRole("group", {name: "Review assessment"})
    ).getAllByRole("button");
    expect(assessmentButtons).toHaveLength(4);
    expect(assessmentButtons[0]?.textContent).toMatch(/Easy\s*Fast/);
    expect(assessmentButtons[1]?.textContent).toMatch(/Good\s*Stable/);
    expect(assessmentButtons[2]?.textContent).toMatch(/Hard\s*Lagging/);
    expect(assessmentButtons[3]?.textContent).toMatch(/Again\s*Failed/);
    expect(
      screen
        .getByRole("button", {name: "Good Stable"})
        .getAttribute("aria-pressed")
    ).toBe("true");

    fireEvent.click(screen.getByRole("button", {name: "Easy Fast"}));
    fireEvent.click(screen.getByRole("button", {name: "Hard Lagging"}));
    fireEvent.click(screen.getByRole("button", {name: "Again Failed"}));

    rerender(
      <AppProviders>
        <OverlayPanel
          renderModel={makeExpandedRenderModel({
            assessment: {
              onSelectRating,
              selectedRating: 0,
            },
            log: {
              onChange: onChangeDraft,
            },
          })}
        />
      </AppProviders>
    );

    fireEvent.click(screen.getByRole("button", {name: "Good Stable"}));
    expect(onSelectRating.mock.calls.map(([rating]) => rating)).toEqual([
      3, 1, 0, 2,
    ]);

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
    expect(
      screen.getByLabelText("Interview pattern").getAttribute("autocomplete")
    ).toBe("off");
    expect(screen.getByLabelText("Notes").getAttribute("autocomplete")).toBe(
      "off"
    );
  });

  it("locks the assessment rail to Again after a failed session", () => {
    const onSelectRating = vi.fn();

    renderOverlayPanel(
      makeExpandedRenderModel({
        assessment: {
          disabledRatings: [1, 2, 3],
          onSelectRating,
          selectedRating: 0,
        },
        assessmentAssist: {
          message: "Failed sessions stay locked to Again until you restart.",
          tone: "danger",
        },
      })
    );

    const easyButton = screen.getByRole("button", {name: "Easy Fast"});
    const goodButton = screen.getByRole("button", {name: "Good Stable"});
    const hardButton = screen.getByRole("button", {name: "Hard Lagging"});
    const againButton = screen.getByRole("button", {name: "Again Failed"});

    expect((easyButton as HTMLButtonElement).disabled).toBe(true);
    expect((goodButton as HTMLButtonElement).disabled).toBe(true);
    expect((hardButton as HTMLButtonElement).disabled).toBe(true);
    expect((againButton as HTMLButtonElement).disabled).toBe(false);
    expect(againButton.getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(easyButton);
    fireEvent.click(goodButton);
    fireEvent.click(hardButton);
    fireEvent.click(againButton);

    expect(onSelectRating).not.toHaveBeenCalled();
  });

  it("shows clear icons for populated log fields and clears through the shared change handler", () => {
    const onChangeDraft = vi.fn();

    renderOverlayPanel(
      makeExpandedRenderModel({
        log: {
          draft: {
            interviewPattern: "Sliding window",
            notes: "Track the left pointer.",
          },
          onChange: onChangeDraft,
        },
      })
    );

    fireEvent.click(screen.getByRole("button", {name: "Clear Interview pattern"}));
    fireEvent.click(screen.getByRole("button", {name: "Clear Notes"}));

    expect(onChangeDraft).toHaveBeenCalledWith("interviewPattern", "");
    expect(onChangeDraft).toHaveBeenCalledWith("notes", "");
    expect(
      screen.queryByRole("button", {name: "Clear Time complexity"})
    ).toBeNull();
  });

  it("uses expanded header row click zones while respecting buttons", () => {
    const onOpenSettings = vi.fn();
    const onCollapse = vi.fn();
    const onHide = vi.fn();

    renderOverlayPanel(
      makeExpandedRenderModel({
        header: {
          onCollapse,
          onHide,
          onOpenSettings,
        },
      })
    );

    fireEvent.click(screen.getByRole("button", {name: "Open settings"}));
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
    expect(onCollapse).toHaveBeenCalledTimes(0);
    expect(onHide).toHaveBeenCalledTimes(0);

    fireEvent.click(screen.getByRole("button", {name: "Hide overlay"}));
    expect(onHide).toHaveBeenCalledTimes(1);
    expect(onCollapse).toHaveBeenCalledTimes(0);

    fireEvent.click(screen.getByText("Group Anagrams"));
    expect(onCollapse).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId("expanded-overlay-header-divider"));
    expect(onCollapse).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByTestId("expanded-overlay-header-row"));
    expect(onCollapse).toHaveBeenCalledTimes(3);

    fireEvent.click(screen.getByRole("button", {name: "Collapse overlay"}));
    expect(onCollapse).toHaveBeenCalledTimes(4);
  });

  it("collapses on external pointer down but ignores internal interactions", () => {
    const onClickAway = vi.fn();

    renderOverlayPanel(
      makeExpandedRenderModel({
        onClickAway,
      })
    );

    fireEvent.pointerDown(screen.getByLabelText("Notes"));
    expect(onClickAway).toHaveBeenCalledTimes(0);

    fireEvent.pointerDown(document.body);
    expect(onClickAway).toHaveBeenCalledTimes(1);
  });

  it("renders a compact collapsed summary", () => {
    renderOverlayPanel(makeCollapsedRenderModel());

    expect(screen.getByRole("button", {name: "Expand overlay"})).toBeTruthy();
    expect(screen.getByRole("button", {name: "Hide overlay"})).toBeTruthy();
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
    const onHide = vi.fn();
    const onToggleCollapse = vi.fn();

    const {rerender} = renderOverlayPanel(
      makeCollapsedRenderModel({
        actions: {
          onHide,
          onExpand: onToggleCollapse,
          onFail: onFailReview,
          onSubmit: onCompactSubmit,
        },
        timer: {
          onPause: onPauseTimer,
          onReset: onResetTimer,
          onStart: onStartTimer,
        },
      })
    );

    fireEvent.click(screen.getByRole("button", {name: "Start timer"}));
    expect(onStartTimer).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", {name: "Restart timer"}));
    expect(onResetTimer).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", {name: "Fail review"}));
    expect(onFailReview).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", {name: "Hide overlay"}));
    expect(onHide).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", {name: "Submit"}));
    expect(onCompactSubmit).toHaveBeenCalledTimes(1);

    rerender(
      <AppProviders>
        <OverlayPanel
          renderModel={makeCollapsedRenderModel({
            actions: {
              onHide,
              onExpand: onToggleCollapse,
              onFail: onFailReview,
              onSubmit: onCompactSubmit,
            },
            timer: {
              isRunning: true,
              onPause: onPauseTimer,
              onReset: onResetTimer,
              onStart: onStartTimer,
              startLabel: "Pause timer",
            },
          })}
        />
      </AppProviders>
    );

    fireEvent.click(screen.getByRole("button", {name: "Pause timer"}));
    expect(onPauseTimer).toHaveBeenCalledTimes(1);

    rerender(
      <AppProviders>
        <OverlayPanel
          renderModel={makeCollapsedRenderModel({
            actions: {
              canFail: false,
              canSubmit: false,
              onHide,
              onExpand: onToggleCollapse,
              onFail: onFailReview,
              onSubmit: onCompactSubmit,
            },
            timer: {
              canReset: false,
              canStart: true,
              onPause: onPauseTimer,
              onReset: onResetTimer,
              onStart: onStartTimer,
              startLabel: "Start a new session",
            },
          })}
        />
      </AppProviders>
    );

    fireEvent.click(
      screen.getByRole("button", {name: "Start a new session"})
    );
    expect(onStartTimer).toHaveBeenCalledTimes(2);
    const disabledTimerResetButton = screen.getByRole("button", {
      name: "Restart timer",
    });
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

  it("renders a docked overlay trigger", () => {
    const onRestore = vi.fn();

    renderOverlayPanel(makeDockedRenderModel({onRestore}));

    fireEvent.click(screen.getByRole("button", {name: "Show overlay"}));
    expect(onRestore).toHaveBeenCalledTimes(1);
  });

  it("keeps tiny dock pointer movement as a restore click", () => {
    const onRestore = vi.fn();

    renderOverlayPanel(makeDockedRenderModel({onRestore}));

    const dockTrigger = screen.getByRole("button", {name: "Show overlay"});
    firePointerEvent(dockTrigger, "pointerdown", {clientY: 100});
    firePointerEvent(dockTrigger, "pointermove", {clientY: 103});
    firePointerEvent(dockTrigger, "pointerup", {clientY: 103});
    fireEvent.click(dockTrigger);

    expect(onRestore).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("docked-overlay-panel").style.transform)
      .toBe("translateY(0px)");
  });

  it("moves the dock vertically without restoring the overlay", () => {
    const onRestore = vi.fn();

    renderOverlayPanel(makeDockedRenderModel({onRestore}));

    const dockTrigger = screen.getByRole("button", {name: "Show overlay"});
    firePointerEvent(dockTrigger, "pointerdown", {clientY: 100});
    firePointerEvent(dockTrigger, "pointermove", {clientY: 80});
    firePointerEvent(dockTrigger, "pointerup", {clientY: 80});
    fireEvent.click(dockTrigger);

    expect(onRestore).toHaveBeenCalledTimes(0);
    expect(screen.getByTestId("docked-overlay-panel").style.transform)
      .toBe("translateY(-20px)");
  });

  it("ignores horizontal dock movement", () => {
    const onRestore = vi.fn();

    renderOverlayPanel(makeDockedRenderModel({onRestore}));

    const dockTrigger = screen.getByRole("button", {name: "Show overlay"});
    firePointerEvent(dockTrigger, "pointerdown", {clientX: 40, clientY: 100});
    firePointerEvent(dockTrigger, "pointermove", {clientX: 4, clientY: 100});
    firePointerEvent(dockTrigger, "pointerup", {clientX: 4, clientY: 100});

    expect(screen.getByTestId("docked-overlay-panel").style.transform)
      .toBe("translateY(0px)");
  });

  it("shows expanded submission controls for override and restart", () => {
    renderOverlayPanel(
      makeExpandedRenderModel({
        actions: {
          canFail: false,
          canRestart: true,
          canSubmit: false,
          canUpdate: true,
        },
        header: {
          difficulty: "Easy",
          sessionLabel: "Recall review",
          title: "Find Minimum In Rotated Sorted Array",
        },
        log: {
          draft: {
            interviewPattern: "Binary search on answer",
            timeComplexity: "O(n log n)",
            spaceComplexity: "O(1)",
            languages: "Python",
            notes: "Track the feasibility boundary.",
          },
        },
        timer: {
          canPause: false,
          canReset: false,
          canStart: true,
        },
      })
    );

    expect(screen.getByText("Assessment")).toBeTruthy();
    expect(screen.getByText("Next due")).toBeTruthy();
    expect(
      (
        screen.getByRole("button", {
          name: "I couldn't finish :(",
        }) as HTMLButtonElement
      ).disabled
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
