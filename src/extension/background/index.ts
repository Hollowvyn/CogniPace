/** Service-worker bootstrap for background lifecycle, alarms, and runtime routing. */
import {
  getAppData,
  STORAGE_KEY,
} from "../../data/repositories/appDataRepository";
import {
  assertAuthorizedRuntimeMessage,
  validateRuntimeMessage,
} from "../runtime/validator";

import {
  handleStartupDueCheck,
  maybeNotifyDueQueue,
  scheduleNextDueAlarm,
} from "./notifications";
import { fail } from "./responses";
import { handleMessage } from "./router";

chrome.runtime.onInstalled.addListener(async () => {
  // First read seeds the v7 aggregates (Tracks, Topics, Companies) idempotently.
  await getAppData();
  void scheduleNextDueAlarm();
});

chrome.runtime.onStartup.addListener(() => {
  void handleStartupDueCheck();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && STORAGE_KEY in changes) {
    void scheduleNextDueAlarm();
  }
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "due-check") {
    void maybeNotifyDueQueue().then(() => scheduleNextDueAlarm());
  }
});

chrome.runtime.onMessage.addListener(
  (message: unknown, sender, sendResponse) => {
    void Promise.resolve()
      .then(() => {
        const validatedMessage = validateRuntimeMessage(message);
        assertAuthorizedRuntimeMessage(
          validatedMessage,
          sender,
          chrome.runtime.id,
          chrome.runtime.getURL("")
        );
        return handleMessage(validatedMessage, sender);
      })
      .then((response) => sendResponse(response))
      .catch((error) => sendResponse(fail(error)));
    return true;
  }
);
