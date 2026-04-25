import {cleanup, fireEvent, render, screen, waitFor,} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

import {defaultReviewMode, deriveQuickRating,} from "../src/domain/fsrs/reviewPolicy";
import {StudyState} from "../src/domain/types";
import {CourseQuestionView} from "../src/domain/views";
import {createMockAppShellPayload} from "../src/ui/mockData";
import {buildDashboardUrl, readDashboardViewFromSearch,} from "../src/ui/navigation/dashboardRoutes";
import {filterLibraryRows} from "../src/ui/presentation/library";
import {AppProviders} from "../src/ui/providers";
import {DashboardApp} from "../src/ui/screens/dashboard/DashboardApp";
import {
  cloneDraft,
  draftFromStudyState,
  draftsEqual,
  emptyDraft,
  reviewPayloadFromDraft,
} from "../src/ui/screens/overlay/controller/draftFields";
import {
  buildDueTone,
  buildHeaderStatus,
  formatSubmissionDateLabel,
} from "../src/ui/screens/overlay/controller/headerStatus";
import {OverlayRoot} from "../src/ui/screens/overlay/OverlayRoot";

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
      chapterOptions: [{id: "arrays-1", title: "Arrays"}],
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

  return {promise, resolve};
}

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

    expect(
      formatSubmissionDateLabel("2026-04-19T12:00:00", relativeTo)
    ).toBe("today");
    expect(
      formatSubmissionDateLabel("2026-04-18T12:00:00", relativeTo)
    ).toBe("yesterday");
    expect(
      formatSubmissionDateLabel("2026-04-20T12:00:00", relativeTo)
    ).toBe("tomorrow");
    expect(
      formatSubmissionDateLabel("2026-04-22T12:00:00", relativeTo)
    ).toBe("this Wednesday");
    expect(
      formatSubmissionDateLabel("2026-04-16T12:00:00", relativeTo)
    ).toBe("last Thursday");
    expect(
      formatSubmissionDateLabel("2026-03-01T12:00:00", relativeTo)
    ).toBe("Mar 1");
    expect(
      formatSubmissionDateLabel("2025-12-31T12:00:00", relativeTo)
    ).toBe("Dec 31, 2025");
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
    expect(buildDueTone("2026-04-21T12:00:00.000Z", relativeTo)).toBe("warning");
    expect(buildDueTone("2026-05-10T12:00:00.000Z", relativeTo)).toBe("accent");
  });
});

describe("dashboard navigation", () => {
  it("pushes history entries for user-initiated view changes", async () => {
    const payload = makePayload();
    const pushStateSpy = vi.spyOn(window.history, "pushState");

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

    fireEvent.click(await screen.findByRole("button", {name: "Courses"}));

    await waitFor(() => {
      expect(pushStateSpy).toHaveBeenCalled();
      expect(String(pushStateSpy.mock.calls.at(-1)?.[2])).toContain(
        "view=courses"
      );
    });
  });

  it("syncs the active screen from popstate events", async () => {
    const payload = makePayload();
    window.history.pushState({}, "", "/dashboard.html?view=dashboard");

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

    await screen.findByRole("heading", {name: "Dashboard"});
    window.history.pushState({}, "", "/dashboard.html?view=library");
    window.dispatchEvent(new PopStateEvent("popstate"));

    expect(await screen.findByText("All Tracked Problems")).toBeTruthy();
  });
});

describe("overlay controller", () => {
  it("ignores stale async responses after navigation changes", async () => {
    const firstContext = deferred<{
      ok: true;
      data: {
        problem: { title: string; difficulty: "Easy" };
        studyState: null;
      };
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

    sendMessageMock.mockImplementation(
      (type: string, payload: { slug?: string }) => {
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

        if (
          type === "GET_PROBLEM_CONTEXT" &&
          payload.slug === "group-anagrams"
        ) {
          return secondContext.promise;
        }

        if (type === "OPEN_EXTENSION_PAGE") {
          return Promise.resolve({ok: true, data: {opened: true}});
        }

        return Promise.resolve({ok: true, data: {}});
      }
    );

    const overlayDocument =
      document.implementation.createHTMLDocument("overlay");
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
        <OverlayRoot documentRef={overlayDocument} windowRef={fakeWindow}/>
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
        problem: {title: "Group Anagrams", difficulty: "Medium"},
        studyState: null,
      },
    });

    fireEvent.click(
      await screen.findByRole("button", {name: "Expand overlay"})
    );
    expect(await screen.findByText("Group Anagrams")).toBeTruthy();

    firstContext.resolve({
      ok: true,
      data: {
        problem: {title: "Two Sum", difficulty: "Easy"},
        studyState: null,
      },
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(screen.queryByText("Two Sum")).toBeNull();
    expect(screen.getByText("Group Anagrams")).toBeTruthy();
  });

  it("saves from compact mode and expands while preserving elapsed time", async () => {
    let nextTimerId = 1;
    const timeouts = new Map<number, () => void>();
    const intervals = new Map<number, () => void>();
    let nowMs = 1000;
    const dateNowSpy = vi.spyOn(Date, "now").mockImplementation(() => nowMs);

    try {
      sendMessageMock.mockImplementation(
        (type: string, payload: { slug?: string }) => {
          if (type === "UPSERT_PROBLEM_FROM_PAGE") {
            return Promise.resolve({
              ok: true,
              data: {
                problem: {
                  id: payload.slug,
                  leetcodeSlug: payload.slug,
                  title: "Counting Bits",
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

          if (
            type === "GET_PROBLEM_CONTEXT" &&
            payload.slug === "counting-bits"
          ) {
            return Promise.resolve({
              ok: true,
              data: {
                problem: {title: "Counting Bits", difficulty: "Easy"},
                studyState: null,
              },
            });
          }

          if (
            type === "SAVE_REVIEW_RESULT" &&
            payload.slug === "counting-bits"
          ) {
            return Promise.resolve({ok: true, data: {}});
          }

          if (type === "GET_APP_SHELL_DATA") {
            return Promise.resolve({ok: true, data: makePayload()});
          }

          if (type === "OPEN_EXTENSION_PAGE") {
            return Promise.resolve({ok: true, data: {opened: true}});
          }

          return Promise.resolve({ok: true, data: {}});
        }
      );

      const overlayDocument =
        document.implementation.createHTMLDocument("overlay");
      overlayDocument.body.innerHTML = `
        <h1>Counting Bits</h1>
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
          href: "https://leetcode.com/problems/counting-bits/",
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
          <OverlayRoot documentRef={overlayDocument} windowRef={fakeWindow}/>
        </AppProviders>
      );

      runPendingTimeouts();

      expect(
        await screen.findByRole("button", {name: "Start timer"})
      ).toBeTruthy();

      fireEvent.click(screen.getByRole("button", {name: "Start timer"}));

      nowMs = 5000;
      runIntervalTick();

      await waitFor(() => {
        expect(screen.getByText("00:04")).toBeTruthy();
      });

      fireEvent.click(screen.getByRole("button", {name: "Submit"}));

      await waitFor(() => {
        expect(sendMessageMock).toHaveBeenCalledWith(
          "SAVE_REVIEW_RESULT",
          expect.objectContaining({
            slug: "counting-bits",
            rating: 2,
            mode: "FULL_SOLVE",
            solveTimeMs: 4000,
            source: "overlay",
          })
        );
      });

      expect(
        await screen.findByRole("button", {name: "Collapse overlay"})
      ).toBeTruthy();
      expect(screen.getByText("Counting Bits")).toBeTruthy();
      expect(screen.getByText("Assessment")).toBeTruthy();
      expect(screen.getByText("00:04")).toBeTruthy();
      expect(screen.getByText("Next In Study Mode")).toBeTruthy();
      expect(screen.getByText("Contains Duplicate")).toBeTruthy();
    } finally {
      dateNowSpy.mockRestore();
    }
  });

  it("shows an empty post-submit state when only the current problem remains", async () => {
    let nextTimerId = 1;
    const timeouts = new Map<number, () => void>();
    const intervals = new Map<number, () => void>();
    let nowMs = 1000;
    const dateNowSpy = vi.spyOn(Date, "now").mockImplementation(() => nowMs);

    try {
      sendMessageMock.mockImplementation(
        (type: string, payload: { slug?: string }) => {
          if (type === "UPSERT_PROBLEM_FROM_PAGE") {
            return Promise.resolve({
              ok: true,
              data: {
                problem: {
                  id: payload.slug,
                  leetcodeSlug: payload.slug,
                  title: "Counting Bits",
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

          if (
            type === "GET_PROBLEM_CONTEXT" &&
            payload.slug === "counting-bits"
          ) {
            return Promise.resolve({
              ok: true,
              data: {
                problem: {title: "Counting Bits", difficulty: "Easy"},
                studyState: null,
              },
            });
          }

          if (
            type === "SAVE_REVIEW_RESULT" &&
            payload.slug === "counting-bits"
          ) {
            return Promise.resolve({ok: true, data: {}});
          }

          if (type === "GET_APP_SHELL_DATA") {
            const nextPayload = makePayload();
            nextPayload.settings.studyMode = "freestyle";
            nextPayload.popup.courseNext = {
              ...nextPayload.popup.courseNext!,
              slug: "counting-bits",
              title: "Counting Bits",
              url: "https://leetcode.com/problems/counting-bits/",
            };
            nextPayload.popup.recommended = {
              ...nextPayload.popup.recommended!,
              slug: "counting-bits",
              title: "Counting Bits",
              url: "https://leetcode.com/problems/counting-bits/",
            };
            nextPayload.popup.recommendedCandidates = [
              nextPayload.popup.recommended!,
            ];
            return Promise.resolve({ok: true, data: nextPayload});
          }

          if (type === "OPEN_EXTENSION_PAGE") {
            return Promise.resolve({ok: true, data: {opened: true}});
          }

          return Promise.resolve({ok: true, data: {}});
        }
      );

      const overlayDocument =
        document.implementation.createHTMLDocument("overlay");
      overlayDocument.body.innerHTML = `
        <h1>Counting Bits</h1>
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
          href: "https://leetcode.com/problems/counting-bits/",
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
          <OverlayRoot documentRef={overlayDocument} windowRef={fakeWindow}/>
        </AppProviders>
      );

      runPendingTimeouts();

      expect(
        await screen.findByRole("button", {name: "Start timer"})
      ).toBeTruthy();

      fireEvent.click(screen.getByRole("button", {name: "Start timer"}));

      nowMs = 5000;
      runIntervalTick();

      await waitFor(() => {
        expect(screen.getByText("00:04")).toBeTruthy();
      });

      fireEvent.click(screen.getByRole("button", {name: "Submit"}));

      await waitFor(() => {
        expect(sendMessageMock).toHaveBeenCalledWith(
          "SAVE_REVIEW_RESULT",
          expect.objectContaining({
            slug: "counting-bits",
            rating: 2,
            mode: "FULL_SOLVE",
            solveTimeMs: 4000,
            source: "overlay",
          })
        );
      });

      expect(await screen.findByText("No next question ready")).toBeTruthy();
      expect(screen.queryByRole("button", {name: "Open next"})).toBeNull();
    } finally {
      dateNowSpy.mockRestore();
    }
  });

  it("logs compact failure and expands while preserving elapsed time", async () => {
    let nextTimerId = 1;
    const timeouts = new Map<number, () => void>();
    const intervals = new Map<number, () => void>();
    let nowMs = 1000;
    const dateNowSpy = vi.spyOn(Date, "now").mockImplementation(() => nowMs);

    try {
      sendMessageMock.mockImplementation(
        (type: string, payload: { slug?: string }) => {
          if (type === "UPSERT_PROBLEM_FROM_PAGE") {
            return Promise.resolve({
              ok: true,
              data: {
                problem: {
                  id: payload.slug,
                  leetcodeSlug: payload.slug,
                  title: "Counting Bits",
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

          if (
            type === "GET_PROBLEM_CONTEXT" &&
            payload.slug === "counting-bits"
          ) {
            return Promise.resolve({
              ok: true,
              data: {
                problem: {title: "Counting Bits", difficulty: "Easy"},
                studyState: null,
              },
            });
          }

          if (
            type === "SAVE_REVIEW_RESULT" &&
            payload.slug === "counting-bits"
          ) {
            return Promise.resolve({ok: true, data: {}});
          }

          if (type === "GET_APP_SHELL_DATA") {
            const nextPayload = makePayload();
            nextPayload.settings.studyMode = "freestyle";
            nextPayload.popup.courseNext = {
              ...nextPayload.popup.courseNext!,
              slug: "counting-bits",
              title: "Counting Bits",
            };
            nextPayload.popup.recommended = {
              ...nextPayload.popup.recommended!,
              slug: "counting-bits",
              title: "Counting Bits",
            };
            nextPayload.popup.recommendedCandidates = [
              nextPayload.popup.recommended!,
              {
                slug: "group-anagrams",
                title: "Group Anagrams",
                url: "https://leetcode.com/problems/group-anagrams/",
                difficulty: "Medium",
                reason: "Review focus",
                nextReviewAt: "2026-03-31T00:00:00.000Z",
                alsoCourseNext: false,
              },
            ];
            return Promise.resolve({ok: true, data: nextPayload});
          }

          if (type === "OPEN_EXTENSION_PAGE") {
            return Promise.resolve({ok: true, data: {opened: true}});
          }

          return Promise.resolve({ok: true, data: {}});
        }
      );

      const overlayDocument =
        document.implementation.createHTMLDocument("overlay");
      overlayDocument.body.innerHTML = `
        <h1>Counting Bits</h1>
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
          href: "https://leetcode.com/problems/counting-bits/",
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
          <OverlayRoot documentRef={overlayDocument} windowRef={fakeWindow}/>
        </AppProviders>
      );

      runPendingTimeouts();

      expect(
        await screen.findByRole("button", {name: "Start timer"})
      ).toBeTruthy();

      fireEvent.click(screen.getByRole("button", {name: "Start timer"}));

      nowMs = 5000;
      runIntervalTick();

      await waitFor(() => {
        expect(screen.getByText("00:04")).toBeTruthy();
      });

      fireEvent.click(screen.getByRole("button", {name: "Fail review"}));

      await waitFor(() => {
        expect(sendMessageMock).toHaveBeenCalledWith(
          "SAVE_REVIEW_RESULT",
          expect.objectContaining({
            slug: "counting-bits",
            rating: 0,
            mode: "FULL_SOLVE",
            solveTimeMs: 4000,
            source: "overlay",
          })
        );
      });

      expect(
        await screen.findByRole("button", {name: "Collapse overlay"})
      ).toBeTruthy();
      expect(screen.getByText("Counting Bits")).toBeTruthy();
      expect(screen.getByText("Assessment")).toBeTruthy();
      expect(screen.getByText("00:04")).toBeTruthy();
      expect(
        (screen.getByRole("button", {name: "Easy Fast"}) as HTMLButtonElement)
          .disabled
      ).toBe(true);
      expect(
        (screen.getByRole("button", {name: "Good Stable"}) as HTMLButtonElement)
          .disabled
      ).toBe(true);
      expect(
        (screen.getByRole("button", {name: "Hard Lagging"}) as HTMLButtonElement)
          .disabled
      ).toBe(true);
      expect(
        (screen.getByRole("button", {name: "Again Failed"}) as HTMLButtonElement)
          .disabled
      ).toBe(false);
      expect(screen.getByText("Recommended Now")).toBeTruthy();
      expect(screen.getByText("Group Anagrams")).toBeTruthy();

      fireEvent.click(screen.getByRole("button", {name: "Restart"}));

      expect(
        (screen.getByRole("button", {name: "Easy Fast"}) as HTMLButtonElement)
          .disabled
      ).toBe(false);
      expect(
        (screen.getByRole("button", {name: "Good Stable"}) as HTMLButtonElement)
          .disabled
      ).toBe(false);
      expect(
        (screen.getByRole("button", {name: "Hard Lagging"}) as HTMLButtonElement)
          .disabled
      ).toBe(false);
    } finally {
      dateNowSpy.mockRestore();
    }
  });

  it("uses save override for post-submit edits and restart for a fresh local session", async () => {
    let nextTimerId = 1;
    const timeouts = new Map<number, () => void>();
    const intervals = new Map<number, () => void>();
    const reviewedAt = "2026-03-01T00:00:00.000Z";
    let currentState: StudyState | null = null;
    const nextPayload = makePayload();

    sendMessageMock.mockImplementation(
      (type: string, payload: Record<string, unknown> & { slug?: string }) => {
        if (type === "UPSERT_PROBLEM_FROM_PAGE") {
          return Promise.resolve({
            ok: true,
            data: {
              problem: {
                id: payload.slug,
                leetcodeSlug: payload.slug,
                title: "Counting Bits",
                difficulty: "Easy",
                url: `https://leetcode.com/problems/${payload.slug}/`,
                topics: [],
                sourceSet: [],
                createdAt: reviewedAt,
                updatedAt: reviewedAt,
              },
              studyState: currentState,
            },
          });
        }

        if (
          type === "GET_PROBLEM_CONTEXT" &&
          payload.slug === "counting-bits"
        ) {
          return Promise.resolve({
            ok: true,
            data: {
              problem: {title: "Counting Bits", difficulty: "Easy"},
              studyState: currentState,
            },
          });
        }

        if (
          type === "SAVE_REVIEW_RESULT" &&
          payload.slug === "counting-bits"
        ) {
          currentState = {
            attemptHistory: [
              {
                reviewedAt,
                rating: payload.rating as 0 | 1 | 2 | 3,
                solveTimeMs: payload.solveTimeMs as number | undefined,
                mode: payload.mode as "FULL_SOLVE" | "RECALL",
                logSnapshot: {
                  interviewPattern: payload.interviewPattern as string,
                  timeComplexity: payload.timeComplexity as string,
                  spaceComplexity: payload.spaceComplexity as string,
                  languages: payload.languages as string,
                  notes: payload.notes as string,
                },
              },
            ],
            fsrsCard: {
              difficulty: 4,
              due: "2026-03-03T00:00:00.000Z",
              elapsedDays: 0,
              lapses: payload.rating === 0 ? 1 : 0,
              learningSteps: 0,
              reps: 1,
              scheduledDays: 2,
              stability: 2,
              state: "Review",
              lastReview: reviewedAt,
            },
            interviewPattern: payload.interviewPattern as string,
            languages: payload.languages as string,
            lastRating: payload.rating as 0 | 1 | 2 | 3,
            lastSolveTimeMs: payload.solveTimeMs as number | undefined,
            notes: payload.notes as string,
            spaceComplexity: payload.spaceComplexity as string,
            suspended: false,
            tags: [],
            timeComplexity: payload.timeComplexity as string,
          };

          return Promise.resolve({ok: true, data: {studyState: currentState}});
        }

        if (
          type === "OVERRIDE_LAST_REVIEW_RESULT" &&
          payload.slug === "counting-bits"
        ) {
          currentState = {
            ...currentState!,
            attemptHistory: [
              {
                reviewedAt,
                rating: payload.rating as 0 | 1 | 2 | 3,
                solveTimeMs: currentState?.attemptHistory[0]?.solveTimeMs,
                mode: payload.mode as "FULL_SOLVE" | "RECALL",
                logSnapshot: {
                  interviewPattern: payload.interviewPattern as string,
                  timeComplexity: payload.timeComplexity as string,
                  spaceComplexity: payload.spaceComplexity as string,
                  languages: payload.languages as string,
                  notes: payload.notes as string,
                },
              },
            ],
            interviewPattern: payload.interviewPattern as string,
            languages: payload.languages as string,
            lastRating: payload.rating as 0 | 1 | 2 | 3,
            notes: payload.notes as string,
            spaceComplexity: payload.spaceComplexity as string,
            timeComplexity: payload.timeComplexity as string,
          };

          return Promise.resolve({ok: true, data: {studyState: currentState}});
        }

        if (type === "GET_APP_SHELL_DATA") {
          return Promise.resolve({ok: true, data: nextPayload});
        }

        if (type === "OPEN_EXTENSION_PAGE") {
          return Promise.resolve({ok: true, data: {opened: true}});
        }

        return Promise.resolve({ok: true, data: {}});
      }
    );

    const overlayDocument =
      document.implementation.createHTMLDocument("overlay");
    overlayDocument.body.innerHTML = `
      <h1>Counting Bits</h1>
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
        href: "https://leetcode.com/problems/counting-bits/",
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

    render(
      <AppProviders>
        <OverlayRoot documentRef={overlayDocument} windowRef={fakeWindow}/>
      </AppProviders>
    );

    runPendingTimeouts();

    fireEvent.click(
      await screen.findByRole("button", {name: "Expand overlay"})
    );
    expect(screen.getByText("No submissions yet")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Interview pattern"), {
      target: {value: "Hash map lookup"},
    });
    fireEvent.change(screen.getByLabelText("Time complexity"), {
      target: {value: "O(n)"},
    });
    fireEvent.change(screen.getByLabelText("Space complexity"), {
      target: {value: "O(n)"},
    });
    fireEvent.change(screen.getByLabelText("Languages used"), {
      target: {value: "TypeScript"},
    });
    fireEvent.change(screen.getByLabelText("Notes"), {
      target: {value: "Track complements as you scan."},
    });

    fireEvent.click(screen.getByRole("button", {name: "Submit"}));

    await waitFor(() => {
      expect(sendMessageMock).toHaveBeenCalledWith(
        "SAVE_REVIEW_RESULT",
        expect.objectContaining({
          slug: "counting-bits",
          interviewPattern: "Hash map lookup",
          notes: "Track complements as you scan.",
          rating: 2,
          source: "overlay",
        })
      );
    });

    expect(
      (screen.getByRole("button", {name: "Submit"}) as HTMLButtonElement)
        .disabled
    ).toBe(true);
    expect(screen.getByText("Last submitted")).toBeTruthy();
    expect(screen.getByText("Next due")).toBeTruthy();
    expect(screen.getByText("Next In Study Mode")).toBeTruthy();
    expect(screen.getByText("Contains Duplicate")).toBeTruthy();
    expect(
      (screen.getByRole("button", {name: "Restart"}) as HTMLButtonElement)
        .disabled
    ).toBe(false);
    expect(
      (screen.getByRole("button", {name: "Update"}) as HTMLButtonElement)
        .disabled
    ).toBe(true);

    fireEvent.change(screen.getByLabelText("Interview pattern"), {
      target: {value: "Sorted two pointers"},
    });

    expect(
      (screen.getByRole("button", {name: "Update"}) as HTMLButtonElement)
        .disabled
    ).toBe(false);
    fireEvent.click(screen.getByRole("button", {name: "Update"}));

    await waitFor(() => {
      expect(sendMessageMock).toHaveBeenCalledWith(
        "OVERRIDE_LAST_REVIEW_RESULT",
        expect.objectContaining({
          slug: "counting-bits",
          interviewPattern: "Sorted two pointers",
          rating: 2,
          source: "overlay",
        })
      );
    });

    if (!currentState) {
      throw new Error("Expected a persisted study state after override.");
    }
    const persistedState = currentState as unknown as StudyState;
    expect(persistedState.attemptHistory.length).toBe(1);

    fireEvent.change(screen.getByLabelText("Interview pattern"), {
      target: {value: "Binary search"},
    });
    fireEvent.click(screen.getByRole("button", {name: "Restart"}));

    expect(
      (screen.getByLabelText("Interview pattern") as HTMLInputElement).value
    ).toBe("Sorted two pointers");
    expect(
      (screen.getByRole("button", {name: "Submit"}) as HTMLButtonElement)
        .disabled
    ).toBe(false);
    await waitFor(() => {
      expect(screen.queryByText("Next In Study Mode")).toBeNull();
    });
    expect(
      (screen.getByRole("button", {name: "Update"}) as HTMLButtonElement)
        .disabled
    ).toBe(true);
    expect(
      sendMessageMock.mock.calls.filter(
        ([type]) => type === "SAVE_REVIEW_RESULT"
      )
    ).toHaveLength(1);
    expect(
      sendMessageMock.mock.calls.filter(
        ([type]) => type === "OVERRIDE_LAST_REVIEW_RESULT"
      )
    ).toHaveLength(1);
  });

  it("starts a new timed session from the start action after submit", async () => {
    let nextTimerId = 1;
    const timeouts = new Map<number, () => void>();
    const intervals = new Map<number, () => void>();
    let nowMs = 1000;
    const dateNowSpy = vi.spyOn(Date, "now").mockImplementation(() => nowMs);
    const reviewedAt = "2026-04-18T00:00:00.000Z";
    let currentState: StudyState | null = null;
    const nextPayload = makePayload();

    try {
      sendMessageMock.mockImplementation(
        (type: string, payload: Record<string, unknown> & { slug?: string }) => {
          if (type === "UPSERT_PROBLEM_FROM_PAGE") {
            return Promise.resolve({
              ok: true,
              data: {
                problem: {
                  id: payload.slug,
                  leetcodeSlug: payload.slug,
                  title: "Counting Bits",
                  difficulty: "Easy",
                  url: `https://leetcode.com/problems/${payload.slug}/`,
                  topics: [],
                  sourceSet: [],
                  createdAt: reviewedAt,
                  updatedAt: reviewedAt,
                },
                studyState: currentState,
              },
            });
          }

          if (
            type === "GET_PROBLEM_CONTEXT" &&
            payload.slug === "counting-bits"
          ) {
            return Promise.resolve({
              ok: true,
              data: {
                problem: {title: "Counting Bits", difficulty: "Easy"},
                studyState: currentState,
              },
            });
          }

          if (
            type === "SAVE_REVIEW_RESULT" &&
            payload.slug === "counting-bits"
          ) {
            currentState = {
              attemptHistory: [
                {
                  reviewedAt,
                  rating: payload.rating as 0 | 1 | 2 | 3,
                  solveTimeMs: payload.solveTimeMs as number | undefined,
                  mode: payload.mode as "FULL_SOLVE" | "RECALL",
                  logSnapshot: {
                    interviewPattern: payload.interviewPattern as string,
                    timeComplexity: payload.timeComplexity as string,
                    spaceComplexity: payload.spaceComplexity as string,
                    languages: payload.languages as string,
                    notes: payload.notes as string,
                  },
                },
              ],
              fsrsCard: {
                difficulty: 4,
                due: "2026-04-20T00:00:00.000Z",
                elapsedDays: 0,
                lapses: 0,
                learningSteps: 0,
                reps: 1,
                scheduledDays: 2,
                stability: 2,
                state: "Review",
                lastReview: reviewedAt,
              },
              lastRating: payload.rating as 0 | 1 | 2 | 3,
              lastSolveTimeMs: payload.solveTimeMs as number | undefined,
              suspended: false,
              tags: [],
            };

            return Promise.resolve({ok: true, data: {studyState: currentState}});
          }

          if (type === "GET_APP_SHELL_DATA") {
            return Promise.resolve({ok: true, data: nextPayload});
          }

          return Promise.resolve({ok: true, data: {}});
        }
      );

      const overlayDocument =
        document.implementation.createHTMLDocument("overlay");
      overlayDocument.body.innerHTML = `
        <h1>Counting Bits</h1>
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
          href: "https://leetcode.com/problems/counting-bits/",
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
          <OverlayRoot documentRef={overlayDocument} windowRef={fakeWindow}/>
        </AppProviders>
      );

      runPendingTimeouts();

      fireEvent.click(await screen.findByRole("button", {name: "Expand overlay"}));
      fireEvent.click(screen.getByRole("button", {name: "Start"}));

      nowMs = 5000;
      runIntervalTick();

      await waitFor(() => {
        expect(screen.getByText("00:04")).toBeTruthy();
      });

      fireEvent.click(screen.getByRole("button", {name: "Submit"}));

      await waitFor(() => {
        expect(sendMessageMock).toHaveBeenCalledWith(
          "SAVE_REVIEW_RESULT",
          expect.objectContaining({
            slug: "counting-bits",
            solveTimeMs: 4000,
            source: "overlay",
          })
        );
      });
      expect(screen.getByText("Next In Study Mode")).toBeTruthy();

      nowMs = 9000;
      fireEvent.click(screen.getByRole("button", {name: "Start"}));
      runPendingTimeouts();
      runIntervalTick();

      await waitFor(() => {
        expect(
          (screen.getByRole("button", {name: "Submit"}) as HTMLButtonElement)
            .disabled
        ).toBe(false);
      });
      await waitFor(() => {
        expect(screen.queryByText("Next In Study Mode")).toBeNull();
      });

      await waitFor(() => {
        expect(screen.getByText("00:00")).toBeTruthy();
      });

      nowMs = 12000;
      runIntervalTick();

      await waitFor(() => {
        expect(screen.getByText("00:03")).toBeTruthy();
      });
    } finally {
      dateNowSpy.mockRestore();
    }
  });

  it("collapses on external click and saves changed log fields without appending review history", async () => {
    let nextTimerId = 1;
    const timeouts = new Map<number, () => void>();
    let currentState: StudyState | null = {
      attemptHistory: [],
      notes: "",
      suspended: false,
      tags: [],
    };

    sendMessageMock.mockImplementation(
      (type: string, payload: Record<string, unknown> & { slug?: string }) => {
        if (type === "UPSERT_PROBLEM_FROM_PAGE") {
          return Promise.resolve({
            ok: true,
            data: {
              problem: {
                id: payload.slug,
                leetcodeSlug: payload.slug,
                title: "Counting Bits",
                difficulty: "Easy",
                url: `https://leetcode.com/problems/${payload.slug}/`,
                topics: [],
                sourceSet: [],
                createdAt: "2026-03-01T00:00:00.000Z",
                updatedAt: "2026-03-01T00:00:00.000Z",
              },
              studyState: currentState,
            },
          });
        }

        if (
          type === "GET_PROBLEM_CONTEXT" &&
          payload.slug === "counting-bits"
        ) {
          return Promise.resolve({
            ok: true,
            data: {
              problem: {title: "Counting Bits", difficulty: "Easy"},
              studyState: currentState,
            },
          });
        }

        if (
          type === "SAVE_OVERLAY_LOG_DRAFT" &&
          payload.slug === "counting-bits"
        ) {
          currentState = {
            attemptHistory: [],
            notes: payload.notes as string,
            suspended: false,
            tags: [],
          };

          return Promise.resolve({ok: true, data: {studyState: currentState}});
        }

        return Promise.resolve({ok: true, data: {}});
      }
    );

    const overlayDocument =
      document.implementation.createHTMLDocument("overlay");
    overlayDocument.body.innerHTML = `
      <h1>Counting Bits</h1>
      <span>Easy</span>
    `;

    const fakeWindow = {
      clearInterval: () => undefined,
      clearTimeout: (id: number) => {
        timeouts.delete(id);
      },
      location: {
        href: "https://leetcode.com/problems/counting-bits/",
      },
      setInterval: () => 0,
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

    render(
      <AppProviders>
        <OverlayRoot documentRef={overlayDocument} windowRef={fakeWindow}/>
      </AppProviders>
    );

    runPendingTimeouts();

    fireEvent.click(await screen.findByRole("button", {name: "Expand overlay"}));
    fireEvent.change(screen.getByLabelText("Notes"), {
      target: {value: "Remember parity shortcut"},
    });

    fireEvent.pointerDown(document.body);

    await waitFor(() => {
      expect(sendMessageMock).toHaveBeenCalledWith(
        "SAVE_OVERLAY_LOG_DRAFT",
        expect.objectContaining({
          slug: "counting-bits",
          notes: "Remember parity shortcut",
        })
      );
    });

    expect(screen.getByRole("button", {name: "Expand overlay"})).toBeTruthy();
    expect(
      sendMessageMock.mock.calls.some(([type]) => type === "SAVE_REVIEW_RESULT")
    ).toBe(false);

    fireEvent.click(screen.getByRole("button", {name: "Expand overlay"}));
    expect(screen.getByDisplayValue("Remember parity shortcut")).toBeTruthy();
  });

  it("docks the overlay from the collapsed view and restores to collapsed", async () => {
    let nextTimerId = 1;
    const timeouts = new Map<number, () => void>();

    sendMessageMock.mockImplementation(
      (type: string, payload: Record<string, unknown> & { slug?: string }) => {
        if (type === "UPSERT_PROBLEM_FROM_PAGE") {
          return Promise.resolve({
            ok: true,
            data: {
              problem: {
                id: payload.slug,
                leetcodeSlug: payload.slug,
                title: "Counting Bits",
                difficulty: "Easy",
                url: `https://leetcode.com/problems/${payload.slug}/`,
                topics: [],
                sourceSet: [],
                createdAt: "2026-03-01T00:00:00.000Z",
                updatedAt: "2026-03-01T00:00:00.000Z",
              },
              studyState: {
                attemptHistory: [],
                notes: "",
                suspended: false,
                tags: [],
              },
            },
          });
        }

        if (type === "GET_PROBLEM_CONTEXT") {
          return Promise.resolve({
            ok: true,
            data: {
              problem: {title: "Counting Bits", difficulty: "Easy"},
              studyState: {
                attemptHistory: [],
                notes: "",
                suspended: false,
                tags: [],
              },
            },
          });
        }

        return Promise.resolve({ok: true, data: {}});
      }
    );

    const overlayDocument =
      document.implementation.createHTMLDocument("overlay");
    overlayDocument.body.innerHTML = `
      <h1>Counting Bits</h1>
      <span>Easy</span>
    `;

    const fakeWindow = {
      clearInterval: () => undefined,
      clearTimeout: (id: number) => {
        timeouts.delete(id);
      },
      location: {
        href: "https://leetcode.com/problems/counting-bits/",
      },
      setInterval: () => 0,
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

    render(
      <AppProviders>
        <OverlayRoot documentRef={overlayDocument} windowRef={fakeWindow}/>
      </AppProviders>
    );

    runPendingTimeouts();

    fireEvent.click(await screen.findByRole("button", {name: "Hide overlay"}));
    expect(screen.getByRole("button", {name: "Show overlay"})).toBeTruthy();

    fireEvent.click(screen.getByRole("button", {name: "Show overlay"}));
    expect(screen.getByRole("button", {name: "Expand overlay"})).toBeTruthy();
  });

  it("docks the overlay from the expanded view and preserves drafts", async () => {
    let nextTimerId = 1;
    const timeouts = new Map<number, () => void>();

    sendMessageMock.mockImplementation(
      (type: string, payload: Record<string, unknown> & { slug?: string }) => {
        if (type === "UPSERT_PROBLEM_FROM_PAGE") {
          return Promise.resolve({
            ok: true,
            data: {
              problem: {
                id: payload.slug,
                leetcodeSlug: payload.slug,
                title: "Counting Bits",
                difficulty: "Easy",
                url: `https://leetcode.com/problems/${payload.slug}/`,
                topics: [],
                sourceSet: [],
                createdAt: "2026-03-01T00:00:00.000Z",
                updatedAt: "2026-03-01T00:00:00.000Z",
              },
              studyState: {
                attemptHistory: [],
                notes: "",
                suspended: false,
                tags: [],
              },
            },
          });
        }

        if (type === "GET_PROBLEM_CONTEXT") {
          return Promise.resolve({
            ok: true,
            data: {
              problem: {title: "Counting Bits", difficulty: "Easy"},
              studyState: {
                attemptHistory: [],
                notes: "",
                suspended: false,
                tags: [],
              },
            },
          });
        }

        return Promise.resolve({ok: true, data: {}});
      }
    );

    const overlayDocument =
      document.implementation.createHTMLDocument("overlay");
    overlayDocument.body.innerHTML = `
      <h1>Counting Bits</h1>
      <span>Easy</span>
    `;

    const fakeWindow = {
      clearInterval: () => undefined,
      clearTimeout: (id: number) => {
        timeouts.delete(id);
      },
      location: {
        href: "https://leetcode.com/problems/counting-bits/",
      },
      setInterval: () => 0,
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

    render(
      <AppProviders>
        <OverlayRoot documentRef={overlayDocument} windowRef={fakeWindow}/>
      </AppProviders>
    );

    runPendingTimeouts();

    fireEvent.click(await screen.findByRole("button", {name: "Expand overlay"}));
    fireEvent.change(screen.getByLabelText("Notes"), {
      target: {value: "Dock this draft"},
    });
    fireEvent.click(screen.getByRole("button", {name: "Hide overlay"}));

    await waitFor(() => {
      expect(sendMessageMock).toHaveBeenCalledWith(
        "SAVE_OVERLAY_LOG_DRAFT",
        expect.objectContaining({
          slug: "counting-bits",
          notes: "Dock this draft",
        })
      );
    });

    expect(screen.getByRole("button", {name: "Show overlay"})).toBeTruthy();

    fireEvent.click(screen.getByRole("button", {name: "Show overlay"}));
    expect(screen.getByRole("button", {name: "Expand overlay"})).toBeTruthy();
  });

  it("still collapses when the collapse draft save fails", async () => {
    let nextTimerId = 1;
    const timeouts = new Map<number, () => void>();

    sendMessageMock.mockImplementation(
      (type: string, payload: Record<string, unknown> & { slug?: string }) => {
        if (type === "UPSERT_PROBLEM_FROM_PAGE") {
          return Promise.resolve({
            ok: true,
            data: {
              problem: {
                id: payload.slug,
                leetcodeSlug: payload.slug,
                title: "Counting Bits",
                difficulty: "Easy",
                url: `https://leetcode.com/problems/${payload.slug}/`,
                topics: [],
                sourceSet: [],
                createdAt: "2026-03-01T00:00:00.000Z",
                updatedAt: "2026-03-01T00:00:00.000Z",
              },
              studyState: {
                attemptHistory: [],
                notes: "",
                suspended: false,
                tags: [],
              },
            },
          });
        }

        if (
          type === "GET_PROBLEM_CONTEXT" &&
          payload.slug === "counting-bits"
        ) {
          return Promise.resolve({
            ok: true,
            data: {
              problem: {title: "Counting Bits", difficulty: "Easy"},
              studyState: {
                attemptHistory: [],
                notes: "",
                suspended: false,
                tags: [],
              },
            },
          });
        }

        if (
          type === "SAVE_OVERLAY_LOG_DRAFT" &&
          payload.slug === "counting-bits"
        ) {
          return Promise.resolve({
            ok: false,
            error: "Failed to save log draft.",
          });
        }

        return Promise.resolve({ok: true, data: {}});
      }
    );

    const overlayDocument =
      document.implementation.createHTMLDocument("overlay");
    overlayDocument.body.innerHTML = `
      <h1>Counting Bits</h1>
      <span>Easy</span>
    `;

    const fakeWindow = {
      clearInterval: () => undefined,
      clearTimeout: (id: number) => {
        timeouts.delete(id);
      },
      location: {
        href: "https://leetcode.com/problems/counting-bits/",
      },
      setInterval: () => 0,
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

    render(
      <AppProviders>
        <OverlayRoot documentRef={overlayDocument} windowRef={fakeWindow}/>
      </AppProviders>
    );

    runPendingTimeouts();

    fireEvent.click(await screen.findByRole("button", {name: "Expand overlay"}));
    fireEvent.change(screen.getByLabelText("Notes"), {
      target: {value: "Needs refresh"},
    });

    fireEvent.pointerDown(document.body);

    await waitFor(() => {
      expect(sendMessageMock).toHaveBeenCalledWith(
        "SAVE_OVERLAY_LOG_DRAFT",
        expect.objectContaining({
          slug: "counting-bits",
          notes: "Needs refresh",
        })
      );
    });

    expect(screen.getByRole("button", {name: "Expand overlay"})).toBeTruthy();
    expect(screen.getByText("Failed to save log draft.")).toBeTruthy();
  });
});
