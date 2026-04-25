import { StudyState } from "../../../src/domain/types";
import { OverlayRoot } from "../../../src/ui/screens/overlay/OverlayRoot";
import { render } from "../support/render";
import { sendMessageMock } from "../support/setup";

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
) => Promise<unknown> | unknown | undefined;

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

export function mockOverlayRuntime(handler: RuntimeHandler) {
  sendMessageMock.mockImplementation(
    (type: string, payload: RuntimePayload = {}) => {
      return handler(type, payload) ?? runtimeOk();
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

export function renderOverlayRoot(harness: OverlayHarness) {
  const renderResult = render(
    <OverlayRoot
      documentRef={harness.documentRef}
      windowRef={harness.windowRef}
    />
  );

  harness.runPendingTimeouts();
  return { ...renderResult, harness };
}
