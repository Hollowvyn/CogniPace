import { StudyState } from "@features/study";

import { OverlayShell } from "../../../../app/overlay/OverlayShell";
import { act, render } from "../../../support/render";
import { sendMessageMock } from "../../../support/setup";

export type OverlayPageDifficulty = "Easy" | "Medium" | "Hard" | "Unknown";

export interface OverlayPageFixture {
  difficulty: OverlayPageDifficulty;
  slug: string;
  title: string;
}

export interface OverlayHarness {
  documentRef: Document;
  runIntervalTick: () => void;
  runPendingTimeouts: () => void;
  setPage: (page: OverlayPageFixture) => void;
  windowRef: Window;
}

export const COUNTING_BITS_PAGE: OverlayPageFixture = {
  difficulty: "Easy",
  slug: "counting-bits",
  title: "Counting Bits",
};

export type RuntimePayload = Record<string, unknown> & { slug?: string };
export type RuntimeHandler = (
  type: string,
  payload: RuntimePayload
) => unknown;

export function leetcodeProblemUrl(slug: string) {
  return `https://leetcode.com/problems/${slug}/`;
}

export function runtimeOk(data: unknown = {}) {
  return Promise.resolve({ ok: true, data });
}

export function problemForPage(
  page: OverlayPageFixture,
  timestamp = "2026-03-01T00:00:00.000Z"
) {
  return {
    slug: page.slug,
    title: page.title,
    difficulty: page.difficulty,
    url: leetcodeProblemUrl(page.slug),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function mockOverlayRuntime(handler: RuntimeHandler) {
  sendMessageMock.mockImplementation(
    (type: string, payload: unknown = {}) => {
      return handler(type, payload as RuntimePayload) ?? runtimeOk();
    }
  );
}

export function mockCountingBitsRuntime({
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

export function createOverlayHarness(initialPage: OverlayPageFixture): OverlayHarness {
  let nextTimerId = 1;
  const intervals = new Map<number, () => void>();
  const timeouts = new Map<number, () => void>();
  const overlayDocument = document.implementation.createHTMLDocument("overlay");
  const location = {
    href: leetcodeProblemUrl(initialPage.slug),
  };

  const setPage = (page: OverlayPageFixture) => {
    const title = overlayDocument.createElement("h1");
    title.textContent = page.title;

    const difficulty = overlayDocument.createElement("span");
    difficulty.textContent = page.difficulty;

    overlayDocument.body.replaceChildren(title, difficulty);
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
      act(() => {
        for (const callback of intervals.values()) {
          callback();
        }
      });
    },
    runPendingTimeouts: () => {
      act(() => {
        const pending = [...timeouts.entries()];
        timeouts.clear();
        for (const [, callback] of pending) {
          callback();
        }
      });
    },
    setPage,
    windowRef,
  };
}

export function renderOverlayShell(harness: OverlayHarness) {
  const renderResult = render(
    <OverlayShell
      documentRef={harness.documentRef}
      windowRef={harness.windowRef}
    />
  );

  harness.runPendingTimeouts();
  return { ...renderResult, harness };
}
