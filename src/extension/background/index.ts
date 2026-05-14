/** Service-worker bootstrap for background lifecycle, alarms, and runtime routing. */
import { DB_TICK_KEY } from "@libs/event-bus/utils/DB_TICK_KEY";
import { flushSnapshot, getDb } from "@platform/db/instance";

import { dispatch } from "./dispatcher";
import {
  handleStartupDueCheck,
  maybeNotifyDueQueue,
  scheduleNextDueAlarm,
} from "./notifications";

chrome.runtime.onInstalled.addListener((details) => {
  // Defer all async work so a single failure doesn't crash the
  // top-level install handler and leave the SW unable to wake.
  void (async () => {
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
  // Every SQLite mutation fires a `DB_TICK_KEY` write; treat that as the
  // cue to re-check whether the user changed notification settings (and
  // reschedule the alarm if so). The v7 blob path is retired.
  if (area === "local" && DB_TICK_KEY in changes) {
    void scheduleNextDueAlarm();
  }
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "due-check") {
    void maybeNotifyDueQueue().then(() => scheduleNextDueAlarm());
  }
});

chrome.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
  void dispatch(message, sender, chrome.runtime.id, chrome.runtime.getURL("")).then(
    sendResponse,
  );
  return true; // keep the channel open for the async response
});
