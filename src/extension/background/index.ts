/** Service-worker bootstrap for background lifecycle, alarms, and runtime routing. */
import {
  assertAuthorizedRuntimeMessage,
  validateRuntimeMessage,
} from "@libs/runtime-rpc/validator";

import { flushSnapshot, getDb } from "../../data/db/instance";
import {
  getAppData,
  STORAGE_KEY,
} from "../../data/repositories/appDataRepository";

import {
  handleStartupDueCheck,
  maybeNotifyDueQueue,
  scheduleNextDueAlarm,
} from "./notifications";
import { fail } from "./responses";
import { handleMessage } from "./router";

chrome.runtime.onInstalled.addListener((details) => {
  // Defer all async work so a single failure doesn't crash the
  // top-level install handler and leave the SW unable to wake.
  void (async () => {
    try {
      await getAppData();
    } catch (err) {
      console.error("[CogniPace] onInstalled getAppData failed:", err);
    }
    try {
      // Eagerly boot the SQLite DB so the snapshot restore / catalog
      // seed happens before any handler call.
      await getDb();
    } catch (err) {
      console.error("[CogniPace] onInstalled getDb failed:", err);
    }
    void handleStartupDueCheck();
    console.log(`[CogniPace] onInstalled complete (reason=${details.reason})`);
  })();
});

chrome.runtime.onStartup.addListener(() => {
  // Warm the DB on every SW wake so persistence kicks in promptly.
  void getDb().catch((err) => {
    console.error("[CogniPace] onStartup getDb failed:", err);
  });
  void handleStartupDueCheck();
});

/**
 * Best-effort flush before MV3 evicts the SW. `chrome.runtime.onSuspend`
 * exists in MV3 for backwards-compat but is **not reliably fired** by
 * the runtime (the worker can be terminated abruptly), and on some
 * Chrome versions the event is missing entirely. We guard the
 * registration so a missing-event environment doesn't kill the SW at
 * load time. The 1-second debounced snapshot in instance.ts is the
 * primary durability guarantee; this hook is a defensive backstop.
 */
if (chrome.runtime.onSuspend?.addListener) {
  chrome.runtime.onSuspend.addListener(() => {
    void flushSnapshot().catch((err) => {
      console.error("[CogniPace] onSuspend flushSnapshot failed:", err);
    });
  });
}

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
