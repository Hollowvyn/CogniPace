/** Notification helpers for the background worker's local daily reminder. */
import {
  getUserSettings,
  INITIAL_USER_SETTINGS,
  type UserSettings,
} from "@features/settings/server";
import {
  readLocalStorage,
  writeLocalStorage,
} from "@platform/chrome/storage";
import { getDb } from "@platform/db/instance";

import {
  getAppData,
  STORAGE_KEY,
} from "../../data/repositories/appDataRepository";
import { buildTodayQueue } from "../../domain/queue/buildTodayQueue";


const DUE_CHECK_ALARM = "due-check";
const DUE_NOTIFICATION_STATE_KEY = "cognipace_due_notification_state";
const ONE_DAY_MINUTES = 24 * 60;

interface DueNotificationState {
  lastDueNotificationDate?: string;
}

function normalizeNotificationTime(value: unknown): string {
  if (typeof value !== "string") {
    return INITIAL_USER_SETTINGS.notifications.dailyTime;
  }

  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value.trim())
    ? value.trim()
    : INITIAL_USER_SETTINGS.notifications.dailyTime;
}

function nextNotificationDate(time: string, now = new Date()): Date {
  const [hour = "9", minute = "0"] = time.split(":");
  const next = new Date(now);
  next.setHours(Number(hour), Number(minute), 0, 0);
  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1);
  }
  return next;
}

function reminderTimeForToday(time: string, now = new Date()): Date {
  const [hour = "9", minute = "0"] = time.split(":");
  const scheduled = new Date(now);
  scheduled.setHours(Number(hour), Number(minute), 0, 0);
  return scheduled;
}

function formatLocalDateKey(now: Date): string {
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function readDueNotificationState(): Promise<DueNotificationState> {
  const result = await readLocalStorage([DUE_NOTIFICATION_STATE_KEY]);
  const stored = result[DUE_NOTIFICATION_STATE_KEY];

  if (
    stored &&
    typeof stored === "object" &&
    !Array.isArray(stored) &&
    typeof (stored as DueNotificationState).lastDueNotificationDate === "string"
  ) {
    return stored as DueNotificationState;
  }

  return {};
}

async function writeDueNotificationState(
  state: DueNotificationState
): Promise<void> {
  await writeLocalStorage({
    [DUE_NOTIFICATION_STATE_KEY]: state,
  });
}

/** Sends a due-queue notification when reminders are enabled. */
export async function maybeNotifyDueQueue(now = new Date()): Promise<boolean> {
  const data = await getAppData();
  // Phase 5: settings live in SQLite. Read directly here rather than
  // relying on the (no-longer-maintained) data.settings field.
  const { db } = await getDb();
  const settings = await getUserSettings(db);
  data.settings = settings ?? data.settings;
  if (!data.settings.notifications.enabled) {
    return false;
  }

  const queue = buildTodayQueue(data, now);
  if (queue.dueCount <= 0) {
    return false;
  }

  const todayKey = formatLocalDateKey(now);
  const notificationState = await readDueNotificationState();
  if (notificationState.lastDueNotificationDate === todayKey) {
    return false;
  }

  await chrome.notifications.create("cognipace-due", {
    type: "basic",
    iconUrl: chrome.runtime.getURL("icons/icon-128.png"),
    title: "CogniPace reviews due",
    message: `You have ${queue.dueCount} review${queue.dueCount === 1 ? "" : "s"} due today.`,
  });

  await writeDueNotificationState({
    lastDueNotificationDate: todayKey,
  });
  return true;
}

/** Cancels any existing due-check alarm and schedules one local daily reminder check.
 *  Reads raw storage to avoid triggering a writeback that would re-fire storage.onChanged. */
export async function scheduleNextDueAlarm(now = new Date()): Promise<void> {
  const result = await readLocalStorage([STORAGE_KEY]);
  const stored = result[STORAGE_KEY] as
    | { settings?: Partial<UserSettings> }
    | undefined;
  const settings = stored?.settings;

  await chrome.alarms.clear(DUE_CHECK_ALARM);
  if (!settings?.notifications?.enabled) {
    return;
  }

  chrome.alarms.create(DUE_CHECK_ALARM, {
    periodInMinutes: ONE_DAY_MINUTES,
    when: nextNotificationDate(
      normalizeNotificationTime(settings.notifications.dailyTime),
      now
    ).getTime(),
  });
}

/** Runs the startup reminder path without sending reminders before today's configured time. */
export async function handleStartupDueCheck(now = new Date()): Promise<void> {
  const result = await readLocalStorage([STORAGE_KEY]);
  const stored = result[STORAGE_KEY] as
    | { settings?: Partial<UserSettings> }
    | undefined;
  const settings = stored?.settings;

  if (settings?.notifications?.enabled) {
    const notificationTime = normalizeNotificationTime(
      settings.notifications.dailyTime
    );
    const scheduledReminder = reminderTimeForToday(notificationTime, now);
    if (scheduledReminder.getTime() <= now.getTime()) {
      await maybeNotifyDueQueue(now);
    }
  }

  await scheduleNextDueAlarm(now);
}
