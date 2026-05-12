import assert from "node:assert/strict";

import { createInitialUserSettings } from "@features/settings";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CURRENT_STORAGE_SCHEMA_VERSION } from "../../src/domain/common/constants";
import {
  handleStartupDueCheck,
  maybeNotifyDueQueue,
  scheduleNextDueAlarm,
} from "../../src/extension/background/notifications";
import { makeProblem, makeScheduledState } from "../support/domainFixtures";

import type { AppData } from "../../src/domain/types";

const readLocalStorageMock = vi.fn();
const writeLocalStorageMock = vi.fn();
const getAppDataMock = vi.fn();

vi.mock("@platform/chrome/storage", () => ({
  readLocalStorage: (...args: unknown[]) => readLocalStorageMock(...args),
  writeLocalStorage: (...args: unknown[]) => writeLocalStorageMock(...args),
}));

vi.mock("../../src/data/repositories/appDataRepository", () => ({
  STORAGE_KEY: "leetcode_spaced_repetition_data_v2",
  getAppData: (...args: unknown[]) => getAppDataMock(...args),
}));

// Phase 5: notifications.ts now also reads settings from SQLite. We
// don't want the test to spin up wasm + a real DB; the AppData returned
// by getAppDataMock already carries the test's intended settings, so
// stub the SQLite read to "no row present" and let the in-memory
// data.settings fallback win.
vi.mock("@platform/db/instance", () => ({
  getDb: vi.fn(async () => ({
    db: {} as never,
    rawDb: {} as never,
    sqlite3: {} as never,
  })),
}));
vi.mock("@features/settings/server", () => ({
  getUserSettings: vi.fn(async () => undefined),
  INITIAL_USER_SETTINGS: {} as never,
}));

function makeAppData(): AppData {
  const settings = createInitialUserSettings();
  settings.notifications.enabled = true;
  settings.notifications.dailyTime = "09:00";

  return {
    schemaVersion: CURRENT_STORAGE_SCHEMA_VERSION,
    problemsBySlug: {
      "two-sum": makeProblem("two-sum", "Two Sum", "Easy"),
    },
    studyStatesBySlug: {
      "two-sum": makeScheduledState("2026-05-01T09:00:00.000Z"),
    },
    topicsById: {},
    companiesById: {},
    settings,
  };
}

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
    getAppDataMock.mockReset();
    alarmsClearMock.mockReset();
    alarmsCreateMock.mockReset();
    notificationsCreateMock.mockReset();
    runtimeGetURLMock.mockClear();

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

    getAppDataMock.mockResolvedValue(makeAppData());
    readLocalStorageMock.mockImplementation(async (keys: string[]) => {
      if (keys.includes("cognipace_due_notification_state")) {
        return dueNotificationState
          ? { cognipace_due_notification_state: dueNotificationState }
          : {};
      }

      return {
        leetcode_spaced_repetition_data_v2: {
          settings: {
            notifications: {
              enabled: true,
              dailyTime: "09:00",
            },
          },
        },
      };
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
    getAppDataMock.mockResolvedValue(makeAppData());
    readLocalStorageMock.mockImplementation(async () => ({
      leetcode_spaced_repetition_data_v2: {
        settings: {
          notifications: {
            enabled: true,
            dailyTime: "09:00",
          },
        },
      },
    }));

    const now = new Date(2026, 4, 2, 8, 30);
    await handleStartupDueCheck(now);

    expect(notificationsCreateMock).not.toHaveBeenCalled();
    expect(alarmsCreateMock).toHaveBeenCalledWith("due-check", {
      periodInMinutes: 24 * 60,
      when: new Date(2026, 4, 2, 9, 0).getTime(),
    });
  });

  it("skips duplicate notifications for the same local day", async () => {
    getAppDataMock.mockResolvedValue(makeAppData());
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
    readLocalStorageMock.mockResolvedValue({
      leetcode_spaced_repetition_data_v2: {
        settings: {
          notifications: {
            enabled: true,
            dailyTime: "09:00",
          },
        },
      },
    });

    await scheduleNextDueAlarm(new Date(2026, 4, 2, 15, 30));

    expect(alarmsClearMock).toHaveBeenCalledWith("due-check");
    expect(alarmsCreateMock).toHaveBeenCalledWith("due-check", {
      periodInMinutes: 24 * 60,
      when: new Date(2026, 4, 3, 9, 0).getTime(),
    });
  });
});
