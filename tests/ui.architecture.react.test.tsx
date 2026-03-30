import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { defaultReviewMode, deriveQuickRating } from "../src/domain/fsrs/reviewPolicy";
import { StudyState } from "../src/domain/types";
import { CourseQuestionView } from "../src/domain/views";
import { createMockAppShellPayload } from "../src/ui/mockData";
import {
  buildDashboardUrl,
  readDashboardViewFromSearch,
} from "../src/ui/navigation/dashboardRoutes";
import { filterLibraryRows } from "../src/ui/presentation/library";
import { AppProviders } from "../src/ui/providers";
import { DashboardApp } from "../src/ui/screens/dashboard/DashboardApp";
import { OverlayRoot } from "../src/ui/screens/overlay/OverlayRoot";

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
  vi.useRealTimers();
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
  payload.popup.recommendedCandidates = [payload.popup.recommended];

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
        questions: [nextQuestion],
      },
    ],
  };
  payload.courses = [payload.popup.activeCourse];
  payload.courseOptions = [
    {
      id: "Blind75",
      name: "Blind 75",
      chapterOptions: [{ id: "arrays-1", title: "Arrays" }],
    },
  ];
  payload.library = [
    {
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
      courses: [
        {
          courseId: "Blind75",
          courseName: "Blind 75",
          chapterId: "arrays-1",
          chapterTitle: "Arrays",
        },
      ],
    },
  ];

  return payload;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });

  return { promise, resolve };
}

describe("route and selector contracts", () => {
  it("parses dashboard routes and builds view urls", () => {
    expect(readDashboardViewFromSearch("?view=courses")).toBe("courses");
    expect(readDashboardViewFromSearch("?view=unknown")).toBe("dashboard");
    expect(
      buildDashboardUrl("chrome-extension://test/dashboard.html?view=settings", "library")
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
});

describe("dashboard navigation", () => {
  it("pushes history entries for user-initiated view changes", async () => {
    const payload = makePayload();
    const pushStateSpy = vi.spyOn(window.history, "pushState");

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

    fireEvent.click(await screen.findByRole("button", { name: "Courses" }));

    await waitFor(() => {
      expect(pushStateSpy).toHaveBeenCalled();
      expect(String(pushStateSpy.mock.calls.at(-1)?.[2])).toContain("view=courses");
    });
  });

  it("syncs the active screen from popstate events", async () => {
    const payload = makePayload();
    window.history.pushState({}, "", "/dashboard.html?view=dashboard");

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

    await screen.findByRole("heading", { name: "Dashboard" });
    window.history.pushState({}, "", "/dashboard.html?view=library");
    window.dispatchEvent(new PopStateEvent("popstate"));

    expect(await screen.findByText("All Tracked Problems")).toBeTruthy();
  });
});

describe("overlay controller", () => {
  it("ignores stale async responses after navigation changes", async () => {
    const firstContext = deferred<{
      ok: true;
      data: { problem: { title: string; difficulty: "Easy" }; studyState: null };
    }>();
    const secondContext = deferred<{
      ok: true;
      data: {
        problem: { title: string; difficulty: "Medium" };
        studyState: null;
      };
    }>();
    let nextTimerId = 1;
    const timeouts = new Map<number, () => void>();
    const intervals = new Map<number, () => void>();

    sendMessageMock.mockImplementation((type: string, payload: { slug?: string }) => {
      if (type === "UPSERT_PROBLEM_FROM_PAGE") {
        return Promise.resolve({
          ok: true,
          data: {
            problem: {
              id: payload.slug,
              leetcodeSlug: payload.slug,
              title: payload.slug,
              difficulty: "Easy",
              url: `https://leetcode.com/problems/${payload.slug}/`,
              topics: [],
              sourceSet: [],
              createdAt: "2026-03-01T00:00:00.000Z",
              updatedAt: "2026-03-01T00:00:00.000Z",
            },
            studyState: null,
          },
        });
      }

      if (type === "GET_PROBLEM_CONTEXT" && payload.slug === "two-sum") {
        return firstContext.promise;
      }

      if (type === "GET_PROBLEM_CONTEXT" && payload.slug === "group-anagrams") {
        return secondContext.promise;
      }

      if (type === "OPEN_EXTENSION_PAGE") {
        return Promise.resolve({ ok: true, data: { opened: true } });
      }

      return Promise.resolve({ ok: true, data: {} });
    });

    const overlayDocument = document.implementation.createHTMLDocument("overlay");
    overlayDocument.body.innerHTML = `
      <h1>Two Sum</h1>
      <span>Easy</span>
    `;

    const fakeWindow = {
      clearInterval: (id: number) => {
        intervals.delete(id);
      },
      clearTimeout: (id: number) => {
        timeouts.delete(id);
      },
      location: {
        href: "https://leetcode.com/problems/two-sum/",
      },
      setInterval: (callback: TimerHandler) => {
        const id = nextTimerId++;
        intervals.set(id, callback as () => void);
        return id;
      },
      setTimeout: (callback: TimerHandler) => {
        const id = nextTimerId++;
        timeouts.set(id, callback as () => void);
        return id;
      },
    } as unknown as Window;

    const runPendingTimeouts = () => {
      const pending = [...timeouts.entries()];
      timeouts.clear();
      for (const [, callback] of pending) {
        callback();
      }
    };

    const runIntervalTick = () => {
      for (const callback of intervals.values()) {
        callback();
      }
    };

    render(
      <AppProviders>
        <OverlayRoot documentRef={overlayDocument} windowRef={fakeWindow} />
      </AppProviders>
    );

    runPendingTimeouts();

    overlayDocument.body.innerHTML = `
      <h1>Group Anagrams</h1>
      <span>Medium</span>
    `;
    fakeWindow.location.href = "https://leetcode.com/problems/group-anagrams/";

    runIntervalTick();

    secondContext.resolve({
      ok: true,
      data: {
        problem: { title: "Group Anagrams", difficulty: "Medium" },
        studyState: null,
      },
    });

    expect(await screen.findByText("Group Anagrams")).toBeTruthy();

    firstContext.resolve({
      ok: true,
      data: {
        problem: { title: "Two Sum", difficulty: "Easy" },
        studyState: null,
      },
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(screen.queryByText("Two Sum")).toBeNull();
    expect(screen.getByText("Group Anagrams")).toBeTruthy();
  });
});
