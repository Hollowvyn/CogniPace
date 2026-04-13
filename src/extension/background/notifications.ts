/** Notification helpers and quiet-hour policy for the background worker. */
import {getAppData} from "../../data/repositories/appDataRepository";
import {buildTodayQueue} from "../../domain/queue/buildTodayQueue";

function inQuietHours(
  startHour: number,
  endHour: number,
  currentHour: number
): boolean {
  if (startHour === endHour) {
    return false;
  }

  if (startHour < endHour) {
    return currentHour >= startHour && currentHour < endHour;
  }

  return currentHour >= startHour || currentHour < endHour;
}

/** Sends a due-queue notification when alerts are enabled and quiet-hours allow it. */
export async function maybeNotifyDueQueue(): Promise<void> {
  const data = await getAppData();
  if (!data.settings.notifications) {
    return;
  }

  const now = new Date();
  const hour = now.getHours();
  if (
    inQuietHours(
      data.settings.quietHours.startHour,
      data.settings.quietHours.endHour,
      hour
    )
  ) {
    return;
  }

  const queue = buildTodayQueue(data, now);
  if (queue.dueCount <= 0) {
    return;
  }

  await chrome.notifications.create("cognipace-due", {
    type: "basic",
    iconUrl: "icons/icon-128.png",
    title: "CogniPace reviews due",
    message: `You have ${queue.dueCount} review${queue.dueCount === 1 ? "" : "s"} due today.`,
  });
}
