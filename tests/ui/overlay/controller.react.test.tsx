import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { StudyState } from "../../../src/domain/types";
import { AppProviders } from "../../../src/ui/providers";
import { OverlayRoot } from "../../../src/ui/screens/overlay/OverlayRoot";
import { deferred, makePayload } from "../support/appShellFixtures";
import { sendMessageMock } from "../support/setup";

type OverlayPageDifficulty = "Easy" | "Medium" | "Hard" | "Unknown";

interface OverlayPageFixture {
  difficulty: OverlayPageDifficulty;
  slug: string;
  title: string;
}

interface OverlayHarness {
  documentRef: Document;
  runIntervalTick: () => void;
  runPendingTimeouts: () => void;
  setPage: (page: OverlayPageFixture) => void;
  windowRef: Window;
}

const COUNTING_BITS_PAGE: OverlayPageFixture = {
  difficulty: "Easy",
  slug: "counting-bits",
  title: "Counting Bits",
};

type RuntimePayload = Record<string, unknown> & { slug?: string };
type RuntimeHandler = (
  type: string,
  payload: RuntimePayload
) => Promise<unknown> | unknown | undefined;

function leetcodeProblemUrl(slug: string) {
  return `https://leetcode.com/problems/${slug}/`;
}

function runtimeOk(data: unknown = {}) {
  return Promise.resolve({ ok: true, data });
}

function problemForPage(
  page: OverlayPageFixture,
  timestamp = "2026-03-01T00:00:00.000Z"
) {
  return {
    id: page.slug,
    leetcodeSlug: page.slug,
    title: page.title,
    difficulty: page.difficulty,
    url: leetcodeProblemUrl(page.slug),
    topics: [],
    sourceSet: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function emptyOverlayStudyState(): StudyState {
  return {
    attemptHistory: [],
    notes: "",
    suspended: false,
    tags: [],
  };
}

function mockOverlayRuntime(handler: RuntimeHandler) {
  sendMessageMock.mockImplementation(
    (type: string, payload: RuntimePayload = {}) => {
      return handler(type, payload) ?? runtimeOk();
    }
  );
}

function mockCountingBitsRuntime({
  getStudyState = () => null,
  handle,
  timestamp,
}: {
  getStudyState?: () => StudyState | null;
  handle?: RuntimeHandler;
  timestamp?: string;
} = {}) {
  mockOverlayRuntime((type, payload) => {
    const handled = handle?.(type, payload);
    if (handled !== undefined) {
      return handled;
    }

    if (type === "UPSERT_PROBLEM_FROM_PAGE") {
      return runtimeOk({
        problem: problemForPage(COUNTING_BITS_PAGE, timestamp),
        studyState: getStudyState(),
      });
    }

    if (
      type === "GET_PROBLEM_CONTEXT" &&
      (!payload.slug || payload.slug === COUNTING_BITS_PAGE.slug)
    ) {
      return runtimeOk({
        problem: problemForPage(COUNTING_BITS_PAGE, timestamp),
        studyState: getStudyState(),
      });
    }

    if (type === "OPEN_EXTENSION_PAGE") {
      return runtimeOk({ opened: true });
    }

    return undefined;
  });
}

function createOverlayHarness(initialPage: OverlayPageFixture): OverlayHarness {
  let nextTimerId = 1;
  const intervals = new Map<number, () => void>();
  const timeouts = new Map<number, () => void>();
  const overlayDocument = document.implementation.createHTMLDocument("overlay");
  const location = {
    href: leetcodeProblemUrl(initialPage.slug),
  };

  const setPage = (page: OverlayPageFixture) => {
    overlayDocument.body.innerHTML = `
      <h1>${page.title}</h1>
      <span>${page.difficulty}</span>
    `;
    location.href = leetcodeProblemUrl(page.slug);
  };

  const windowRef = {
    clearInterval: (id: number) => {
      intervals.delete(id);
    },
    clearTimeout: (id: number) => {
      timeouts.delete(id);
    },
    location,
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

  setPage(initialPage);

  return {
    documentRef: overlayDocument,
    runIntervalTick: () => {
      for (const callback of intervals.values()) {
        callback();
      }
    },
    runPendingTimeouts: () => {
      const pending = [...timeouts.entries()];
      timeouts.clear();
      for (const [, callback] of pending) {
        callback();
      }
    },
    setPage,
    windowRef,
  };
}

function renderOverlayRoot(harness: OverlayHarness): OverlayHarness {
  render(
    <AppProviders>
      <OverlayRoot
        documentRef={harness.documentRef}
        windowRef={harness.windowRef}
      />
    </AppProviders>
  );

  harness.runPendingTimeouts();
  return harness;
}

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

    mockOverlayRuntime((type, payload) => {
      if (type === "UPSERT_PROBLEM_FROM_PAGE") {
        return runtimeOk({
          problem: problemForPage({
            difficulty: "Easy",
            slug: payload.slug ?? "",
            title: payload.slug ?? "",
          }),
          studyState: null,
        });
      }

      if (type === "GET_PROBLEM_CONTEXT" && payload.slug === "two-sum") {
        return firstContext.promise;
      }

      if (type === "GET_PROBLEM_CONTEXT" && payload.slug === "group-anagrams") {
        return secondContext.promise;
      }

      if (type === "OPEN_EXTENSION_PAGE") {
        return runtimeOk({ opened: true });
      }

      return undefined;
    });

    const harness = renderOverlayRoot(
      createOverlayHarness({
        difficulty: "Easy",
        slug: "two-sum",
        title: "Two Sum",
      })
    );

    harness.setPage({
      difficulty: "Medium",
      slug: "group-anagrams",
      title: "Group Anagrams",
    });
    harness.runIntervalTick();

    secondContext.resolve({
      ok: true,
      data: {
        problem: { title: "Group Anagrams", difficulty: "Medium" },
        studyState: null,
      },
    });

    fireEvent.click(
      await screen.findByRole("button", { name: "Expand overlay" })
    );
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

  it("saves from compact mode and expands while preserving elapsed time", async () => {
    let nowMs = 1000;
    const dateNowSpy = vi.spyOn(Date, "now").mockImplementation(() => nowMs);

    try {
      mockCountingBitsRuntime({
        handle: (type, payload) => {
          if (
            type === "SAVE_REVIEW_RESULT" &&
            payload.slug === "counting-bits"
          ) {
            return runtimeOk();
          }
          if (type === "GET_APP_SHELL_DATA") {
            return runtimeOk(makePayload());
          }

          return undefined;
        },
      });

      const harness = renderOverlayRoot(
        createOverlayHarness(COUNTING_BITS_PAGE)
      );

      expect(
        await screen.findByRole("button", { name: "Start timer" })
      ).toBeTruthy();

      fireEvent.click(screen.getByRole("button", { name: "Start timer" }));

      nowMs = 5000;
      harness.runIntervalTick();

      await waitFor(() => {
        expect(screen.getByText("00:04")).toBeTruthy();
      });

      fireEvent.click(screen.getByRole("button", { name: "Submit" }));

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
        await screen.findByRole("button", { name: "Collapse overlay" })
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
    let nowMs = 1000;
    const dateNowSpy = vi.spyOn(Date, "now").mockImplementation(() => nowMs);

    try {
      mockCountingBitsRuntime({
        handle: (type, payload) => {
          if (
            type === "SAVE_REVIEW_RESULT" &&
            payload.slug === "counting-bits"
          ) {
            return runtimeOk();
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
            return runtimeOk(nextPayload);
          }

          return undefined;
        },
      });

      const harness = renderOverlayRoot(
        createOverlayHarness(COUNTING_BITS_PAGE)
      );

      expect(
        await screen.findByRole("button", { name: "Start timer" })
      ).toBeTruthy();

      fireEvent.click(screen.getByRole("button", { name: "Start timer" }));

      nowMs = 5000;
      harness.runIntervalTick();

      await waitFor(() => {
        expect(screen.getByText("00:04")).toBeTruthy();
      });

      fireEvent.click(screen.getByRole("button", { name: "Submit" }));

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
      expect(screen.queryByRole("button", { name: "Open next" })).toBeNull();
    } finally {
      dateNowSpy.mockRestore();
    }
  });

  it("logs compact failure and expands while preserving elapsed time", async () => {
    let nowMs = 1000;
    const dateNowSpy = vi.spyOn(Date, "now").mockImplementation(() => nowMs);

    try {
      mockCountingBitsRuntime({
        handle: (type, payload) => {
          if (
            type === "SAVE_REVIEW_RESULT" &&
            payload.slug === "counting-bits"
          ) {
            return runtimeOk();
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
            return runtimeOk(nextPayload);
          }

          return undefined;
        },
      });

      const harness = renderOverlayRoot(
        createOverlayHarness(COUNTING_BITS_PAGE)
      );

      expect(
        await screen.findByRole("button", { name: "Start timer" })
      ).toBeTruthy();

      fireEvent.click(screen.getByRole("button", { name: "Start timer" }));

      nowMs = 5000;
      harness.runIntervalTick();

      await waitFor(() => {
        expect(screen.getByText("00:04")).toBeTruthy();
      });

      fireEvent.click(screen.getByRole("button", { name: "Fail review" }));

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
        await screen.findByRole("button", { name: "Collapse overlay" })
      ).toBeTruthy();
      expect(screen.getByText("Counting Bits")).toBeTruthy();
      expect(screen.getByText("Assessment")).toBeTruthy();
      expect(screen.getByText("00:04")).toBeTruthy();
      expect(
        (screen.getByRole("button", { name: "Easy Fast" }) as HTMLButtonElement)
          .disabled
      ).toBe(true);
      expect(
        (
          screen.getByRole("button", {
            name: "Good Stable",
          }) as HTMLButtonElement
        ).disabled
      ).toBe(true);
      expect(
        (
          screen.getByRole("button", {
            name: "Hard Lagging",
          }) as HTMLButtonElement
        ).disabled
      ).toBe(true);
      expect(
        (
          screen.getByRole("button", {
            name: "Again Failed",
          }) as HTMLButtonElement
        ).disabled
      ).toBe(false);
      expect(screen.getByText("Recommended Now")).toBeTruthy();
      expect(screen.getByText("Group Anagrams")).toBeTruthy();

      fireEvent.click(screen.getByRole("button", { name: "Restart" }));

      expect(
        (screen.getByRole("button", { name: "Easy Fast" }) as HTMLButtonElement)
          .disabled
      ).toBe(false);
      expect(
        (
          screen.getByRole("button", {
            name: "Good Stable",
          }) as HTMLButtonElement
        ).disabled
      ).toBe(false);
      expect(
        (
          screen.getByRole("button", {
            name: "Hard Lagging",
          }) as HTMLButtonElement
        ).disabled
      ).toBe(false);
    } finally {
      dateNowSpy.mockRestore();
    }
  });

  it("uses save override for post-submit edits and restart for a fresh local session", async () => {
    const reviewedAt = "2026-03-01T00:00:00.000Z";
    let currentState: StudyState | null = null;
    const nextPayload = makePayload();

    mockCountingBitsRuntime({
      getStudyState: () => currentState,
      handle: (type, payload) => {
        if (type === "SAVE_REVIEW_RESULT" && payload.slug === "counting-bits") {
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

          return runtimeOk({ studyState: currentState });
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

          return runtimeOk({ studyState: currentState });
        }

        if (type === "GET_APP_SHELL_DATA") {
          return runtimeOk(nextPayload);
        }

        return undefined;
      },
      timestamp: reviewedAt,
    });

    renderOverlayRoot(createOverlayHarness(COUNTING_BITS_PAGE));

    fireEvent.click(
      await screen.findByRole("button", { name: "Expand overlay" })
    );
    expect(screen.getByText("No submissions yet")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Interview pattern"), {
      target: { value: "Hash map lookup" },
    });
    fireEvent.change(screen.getByLabelText("Time complexity"), {
      target: { value: "O(n)" },
    });
    fireEvent.change(screen.getByLabelText("Space complexity"), {
      target: { value: "O(n)" },
    });
    fireEvent.change(screen.getByLabelText("Languages used"), {
      target: { value: "TypeScript" },
    });
    fireEvent.change(screen.getByLabelText("Notes"), {
      target: { value: "Track complements as you scan." },
    });

    fireEvent.click(screen.getByRole("button", { name: "Submit" }));

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
      (screen.getByRole("button", { name: "Submit" }) as HTMLButtonElement)
        .disabled
    ).toBe(true);
    expect(screen.getByText("Last submitted")).toBeTruthy();
    expect(screen.getByText("Next due")).toBeTruthy();
    expect(screen.getByText("Next In Study Mode")).toBeTruthy();
    expect(screen.getByText("Contains Duplicate")).toBeTruthy();
    expect(
      (screen.getByRole("button", { name: "Restart" }) as HTMLButtonElement)
        .disabled
    ).toBe(false);
    expect(
      (screen.getByRole("button", { name: "Update" }) as HTMLButtonElement)
        .disabled
    ).toBe(true);

    fireEvent.change(screen.getByLabelText("Interview pattern"), {
      target: { value: "Sorted two pointers" },
    });

    expect(
      (screen.getByRole("button", { name: "Update" }) as HTMLButtonElement)
        .disabled
    ).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Update" }));

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
      target: { value: "Binary search" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Restart" }));

    expect(
      (screen.getByLabelText("Interview pattern") as HTMLInputElement).value
    ).toBe("Sorted two pointers");
    expect(
      (screen.getByRole("button", { name: "Submit" }) as HTMLButtonElement)
        .disabled
    ).toBe(false);
    await waitFor(() => {
      expect(screen.queryByText("Next In Study Mode")).toBeNull();
    });
    expect(
      (screen.getByRole("button", { name: "Update" }) as HTMLButtonElement)
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
    let nowMs = 1000;
    const dateNowSpy = vi.spyOn(Date, "now").mockImplementation(() => nowMs);
    const reviewedAt = "2026-04-18T00:00:00.000Z";
    let currentState: StudyState | null = null;
    const nextPayload = makePayload();

    try {
      mockCountingBitsRuntime({
        getStudyState: () => currentState,
        handle: (type, payload) => {
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

            return runtimeOk({ studyState: currentState });
          }

          if (type === "GET_APP_SHELL_DATA") {
            return runtimeOk(nextPayload);
          }

          return undefined;
        },
        timestamp: reviewedAt,
      });

      const harness = renderOverlayRoot(
        createOverlayHarness(COUNTING_BITS_PAGE)
      );

      fireEvent.click(
        await screen.findByRole("button", { name: "Expand overlay" })
      );
      fireEvent.click(screen.getByRole("button", { name: "Start" }));

      nowMs = 5000;
      harness.runIntervalTick();

      await waitFor(() => {
        expect(screen.getByText("00:04")).toBeTruthy();
      });

      fireEvent.click(screen.getByRole("button", { name: "Submit" }));

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
      fireEvent.click(screen.getByRole("button", { name: "Start" }));
      harness.runPendingTimeouts();
      harness.runIntervalTick();

      await waitFor(() => {
        expect(
          (screen.getByRole("button", { name: "Submit" }) as HTMLButtonElement)
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
      harness.runIntervalTick();

      await waitFor(() => {
        expect(screen.getByText("00:03")).toBeTruthy();
      });
    } finally {
      dateNowSpy.mockRestore();
    }
  });

  it("collapses on external click and saves changed log fields without appending review history", async () => {
    let currentState: StudyState | null = {
      attemptHistory: [],
      notes: "",
      suspended: false,
      tags: [],
    };

    mockCountingBitsRuntime({
      getStudyState: () => currentState,
      handle: (type, payload) => {
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

          return runtimeOk({ studyState: currentState });
        }

        return undefined;
      },
    });

    renderOverlayRoot(createOverlayHarness(COUNTING_BITS_PAGE));

    fireEvent.click(
      await screen.findByRole("button", { name: "Expand overlay" })
    );
    fireEvent.change(screen.getByLabelText("Notes"), {
      target: { value: "Remember parity shortcut" },
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

    expect(screen.getByRole("button", { name: "Expand overlay" })).toBeTruthy();
    expect(
      sendMessageMock.mock.calls.some(([type]) => type === "SAVE_REVIEW_RESULT")
    ).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "Expand overlay" }));
    expect(screen.getByDisplayValue("Remember parity shortcut")).toBeTruthy();
  });

  it("docks the overlay from the collapsed view and restores to collapsed", async () => {
    mockCountingBitsRuntime({ getStudyState: emptyOverlayStudyState });

    renderOverlayRoot(createOverlayHarness(COUNTING_BITS_PAGE));

    fireEvent.click(
      await screen.findByRole("button", { name: "Hide overlay" })
    );
    expect(screen.getByRole("button", { name: "Show overlay" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Show overlay" }));
    expect(screen.getByRole("button", { name: "Expand overlay" })).toBeTruthy();
  });

  it("docks the overlay from the expanded view and preserves drafts", async () => {
    mockCountingBitsRuntime({ getStudyState: emptyOverlayStudyState });

    renderOverlayRoot(createOverlayHarness(COUNTING_BITS_PAGE));

    fireEvent.click(
      await screen.findByRole("button", { name: "Expand overlay" })
    );
    fireEvent.change(screen.getByLabelText("Notes"), {
      target: { value: "Dock this draft" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Hide overlay" }));

    await waitFor(() => {
      expect(sendMessageMock).toHaveBeenCalledWith(
        "SAVE_OVERLAY_LOG_DRAFT",
        expect.objectContaining({
          slug: "counting-bits",
          notes: "Dock this draft",
        })
      );
    });

    expect(screen.getByRole("button", { name: "Show overlay" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Show overlay" }));
    expect(screen.getByRole("button", { name: "Expand overlay" })).toBeTruthy();
  });

  it("still collapses when the collapse draft save fails", async () => {
    mockCountingBitsRuntime({
      getStudyState: emptyOverlayStudyState,
      handle: (type, payload) => {
        if (
          type === "SAVE_OVERLAY_LOG_DRAFT" &&
          payload.slug === "counting-bits"
        ) {
          return {
            ok: false,
            error: "Failed to save log draft.",
          };
        }

        return undefined;
      },
    });

    renderOverlayRoot(createOverlayHarness(COUNTING_BITS_PAGE));

    fireEvent.click(
      await screen.findByRole("button", { name: "Expand overlay" })
    );
    fireEvent.change(screen.getByLabelText("Notes"), {
      target: { value: "Needs refresh" },
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

    expect(screen.getByRole("button", { name: "Expand overlay" })).toBeTruthy();
    expect(screen.getByText("Failed to save log draft.")).toBeTruthy();
  });
});
