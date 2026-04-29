/** Notification helpers for the background worker's local daily reminder. */
import { readLocalStorage } from "../../data/datasources/chrome/storage";
import {
  getAppData,
  STORAGE_KEY,
} from "../../data/repositories/appDataRepository";
import { DEFAULT_SETTINGS } from "../../domain/common/constants";
import { buildTodayQueue } from "../../domain/queue/buildTodayQueue";
import { UserSettings } from "../../domain/types";

const DUE_CHECK_ALARM = "due-check";
const ONE_DAY_MINUTES = 24 * 60;

function normalizeNotificationTime(value: unknown): string {
  if (typeof value !== "string") {
    return DEFAULT_SETTINGS.notificationTime;
  }

  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value.trim())
    ? value.trim()
    : DEFAULT_SETTINGS.notificationTime;
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

/** Sends a due-queue notification when reminders are enabled. */
export async function maybeNotifyDueQueue(): Promise<void> {
  const data = await getAppData();
  if (!data.settings.notifications) {
    return;
  }

  const now = new Date();
  const queue = buildTodayQueue(data, now);
  if (queue.dueCount <= 0) {
    return;
  }

  /**
   * [TODO]: ÍReplace with Cognipace icon when available. Using a 1x1 transparent PNG to avoid showing the default Chrome notification icon, which can be visually jarring and doesn't fit with our branding.
   */
  await chrome.notifications.create("cognipace-due", {
    type: "basic",
    iconUrl:
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    title: "CogniPace reviews due",
    message: `You have ${queue.dueCount} review${queue.dueCount === 1 ? "" : "s"} due today.`,
  });
}

/** Cancels any existing due-check alarm and schedules one local daily reminder check.
 *  Reads raw storage to avoid triggering a writeback that would re-fire storage.onChanged. */
export async function scheduleNextDueAlarm(): Promise<void> {
  const result = await readLocalStorage([STORAGE_KEY]);
  const stored = result[STORAGE_KEY] as
    | { settings?: Partial<UserSettings> }
    | undefined;
  const settings = stored?.settings;

  await chrome.alarms.clear(DUE_CHECK_ALARM);
  if (!settings?.notifications) {
    return;
  }

  chrome.alarms.create(DUE_CHECK_ALARM, {
    periodInMinutes: ONE_DAY_MINUTES,
    when: nextNotificationDate(
      normalizeNotificationTime(settings.notificationTime)
    ).getTime(),
  });
}
