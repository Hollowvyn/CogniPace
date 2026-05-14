import assert from "node:assert/strict";

import { createInitialUserSettings, type UserSettings } from "@features/settings";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  handleStartupDueCheck,
  maybeNotifyDueQueue,
  scheduleNextDueAlarm,
} from "../../src/extension/background/notifications";
import { makeProblem, makeScheduledState } from "../support/domainFixtures";

import type { Problem } from "@features/problems";
import type { StudyState } from "@features/study";

const readLocalStorageMock = vi.fn();
const writeLocalStorageMock = vi.fn();

vi.mock("@platform/chrome/storage", () => ({
  readLocalStorage: (...args: unknown[]) => readLocalStorageMock(...args),
  writeLocalStorage: (...args: unknown[]) => writeLocalStorageMock(...args),
}));

// SQLite-backed reads are mocked at the @features/<x>/server boundary —
// the notifications module reads settings, problems, and studyStates
// directly from these modules now that the v7 blob path is retired.
const getUserSettingsMock = vi.fn<() => Promise<UserSettings | undefined>>();
const listProblemsMock = vi.fn<() => Promise<readonly Problem[]>>();
const listStudyStatesMock = vi.fn<() => Promise<Record<string, StudyState>>>();

vi.mock("@platform/db/instance", () => ({
  getDb: vi.fn(async () => ({
    db: {} as never,
    rawDb: {} as never,
    sqlite3: {} as never,
  })),
}));
vi.mock("@features/settings/server", async () => {
  const actual =
    await vi.importActual<typeof import("@features/settings/server")>(
      "@features/settings/server",
    );
  return {
    ...actual,
    getUserSettings: () => getUserSettingsMock(),
  };
});
vi.mock("@features/problems/server", async () => {
  const actual =
    await vi.importActual<typeof import("@features/problems/server")>(
      "@features/problems/server",
    );
  return {
    ...actual,
    listProblems: () => listProblemsMock(),
  };
});
vi.mock("@features/study/server", async () => {
  const actual =
    await vi.importActual<typeof import("@features/study/server")>(
      "@features/study/server",
    );
  return {
    ...actual,
    listStudyStates: () => listStudyStatesMock(),
  };
});

function makeQueueSettings(): UserSettings {
  const settings = createInitialUserSettings();
  settings.notifications.enabled = true;
  settings.notifications.dailyTime = "09:00";
  return settings;
}

const queueProblems: readonly Problem[] = [
  makeProblem("two-sum", "Two Sum", "Easy"),
];
const queueStudyStates: Record<string, StudyState> = {
  "two-sum": makeScheduledState("2026-05-01T09:00:00.000Z"),
};

describe("background notifications", () => {
  const alarmsClearMock = vi.fn();
  const alarmsCreateMock = vi.fn();
  const notificationsCreateMock = vi.fn();
  const runtimeGetURLMock = vi.fn(
    (path: string) => `chrome-extension://test/${path}`
  );

  beforeEach(() => {
    readLocalStorageMock.mockReset();
    writeLocalStorageMock.mockReset();
    getUserSettingsMock.mockReset();
    listProblemsMock.mockReset();
    listStudyStatesMock.mockReset();
    alarmsClearMock.mockReset();
    alarmsCreateMock.mockReset();
    notificationsCreateMock.mockReset();
    runtimeGetURLMock.mockClear();

    listProblemsMock.mockResolvedValue(queueProblems);
    listStudyStatesMock.mockResolvedValue(queueStudyStates);
    getUserSettingsMock.mockResolvedValue(makeQueueSettings());

    Object.defineProperty(globalThis, "chrome", {
      configurable: true,
      value: {
        alarms: {
          clear: alarmsClearMock,
          create: alarmsCreateMock,
        },
        notifications: {
          create: notificationsCreateMock,
        },
        runtime: {
          getURL: runtimeGetURLMock,
        },
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("sends one due notification after the configured reminder time", async () => {
    let dueNotificationState:
      | { lastDueNotificationDate?: string }
      | undefined;

    readLocalStorageMock.mockImplementation(async (keys: string[]) => {
      if (keys.includes("cognipace_due_notification_state")) {
        return dueNotificationState
          ? { cognipace_due_notification_state: dueNotificationState }
          : {};
      }
      return {};
    });
    writeLocalStorageMock.mockImplementation(async (payload: unknown) => {
      const candidate = payload as {
        cognipace_due_notification_state?: { lastDueNotificationDate?: string };
      };
      dueNotificationState = candidate.cognipace_due_notification_state;
    });

    const now = new Date(2026, 4, 2, 15, 30);
    await handleStartupDueCheck(now);
    await handleStartupDueCheck(now);

    expect(notificationsCreateMock).toHaveBeenCalledTimes(1);
    expect(writeLocalStorageMock).toHaveBeenCalledWith({
      cognipace_due_notification_state: {
        lastDueNotificationDate: "2026-05-02",
      },
    });
    expect(alarmsCreateMock).toHaveBeenCalledWith("due-check", {
      periodInMinutes: 24 * 60,
      when: new Date(2026, 4, 3, 9, 0).getTime(),
    });
  });

  it("does not send reminders before today's configured reminder time", async () => {
    readLocalStorageMock.mockResolvedValue({});

    const now = new Date(2026, 4, 2, 8, 30);
    await handleStartupDueCheck(now);

    expect(notificationsCreateMock).not.toHaveBeenCalled();
    expect(alarmsCreateMock).toHaveBeenCalledWith("due-check", {
      periodInMinutes: 24 * 60,
      when: new Date(2026, 4, 2, 9, 0).getTime(),
    });
  });

  it("skips duplicate notifications for the same local day", async () => {
    readLocalStorageMock.mockResolvedValue({
      cognipace_due_notification_state: {
        lastDueNotificationDate: "2026-05-02",
      },
    });

    const notified = await maybeNotifyDueQueue(
      new Date(2026, 4, 2, 15, 30)
    );

    assert.equal(notified, false);
    expect(notificationsCreateMock).not.toHaveBeenCalled();
  });

  it("schedules the next due-check alarm from notification time", async () => {
    readLocalStorageMock.mockResolvedValue({});

    await scheduleNextDueAlarm(new Date(2026, 4, 2, 15, 30));

    expect(alarmsClearMock).toHaveBeenCalledWith("due-check");
    expect(alarmsCreateMock).toHaveBeenCalledWith("due-check", {
      periodInMinutes: 24 * 60,
      when: new Date(2026, 4, 3, 9, 0).getTime(),
    });
  });
});
