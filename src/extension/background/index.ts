/** Service-worker bootstrap for background lifecycle, alarms, and runtime routing. */
import {mutateAppData} from "../../data/repositories/appDataRepository";
import {ensureCourseData} from "../../domain/courses/courseProgress";
import {assertAuthorizedRuntimeMessage, validateRuntimeMessage,} from "../runtime/validator";

import {maybeNotifyDueQueue} from "./notifications";
import {fail} from "./responses";
import {handleMessage} from "./router";

chrome.runtime.onInstalled.addListener(async () => {
  await mutateAppData((data) => {
    ensureCourseData(data);
    return data;
  });
  chrome.alarms.create("due-check", {periodInMinutes: 60});
});

chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create("due-check", {periodInMinutes: 60});
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "due-check") {
    void maybeNotifyDueQueue();
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
