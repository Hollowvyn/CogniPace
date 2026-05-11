/** Service-worker bootstrap for background lifecycle, alarms, and runtime routing. */
import { flushSnapshot, getDb } from "../../data/db/instance";
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
  // First read seeds the v7 aggregates (Tracks, Companies, etc.) idempotently.
  await getAppData();
  // Eagerly boot the SQLite DB so the snapshot restore / catalog seed
  // happens before any handler call, not on the first user-triggered read.
  await getDb();
  void handleStartupDueCheck();
});

chrome.runtime.onStartup.addListener(() => {
  // Warm the DB on every SW wake so persistence kicks in promptly.
  void getDb();
  void handleStartupDueCheck();
});

/**
 * Best-effort flush before MV3 evicts the SW. onSuspend isn't 100%
 * reliable in MV3 — the runtime can terminate the worker without
 * warning. The 1-second debounced snapshot in instance.ts is the
 * primary durability guarantee; onSuspend just catches the edge case
 * where a mutation fired within that 1-second window.
 */
chrome.runtime.onSuspend.addListener(() => {
  void flushSnapshot().catch((err) => {
    console.error("[CogniPace] onSuspend flushSnapshot failed:", err);
  });
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
