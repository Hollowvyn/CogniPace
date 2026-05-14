import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";

/** Maps old MessageType (legacy test fixtures) → new SwApi method names.
 *
 *  Tests were written against the old `sendMessage("MESSAGE_TYPE", payload)`
 *  API. The runtime layer now uses a typed proxy that dispatches on
 *  `{ method, payload }` envelopes through chrome.runtime.sendMessage.
 *  Keeping the legacy test API stable saves us churn on dozens of
 *  expect(sendMessageMock).toHaveBeenCalledWith("MESSAGE_TYPE", ...) sites
 *  while still letting the production proxy ride. The mock translates
 *  in both directions: incoming envelopes → (method, payload) call shape;
 *  outgoing returns are normalized to the response envelope. */
const METHOD_FROM_MESSAGE_TYPE: Record<string, string> = {
  UPSERT_PROBLEM_FROM_PAGE: "upsertProblemFromPage",
  GET_PROBLEM_CONTEXT: "getProblemContext",
  RATE_PROBLEM: "rateProblem",
  SAVE_REVIEW_RESULT: "saveReviewResult",
  SAVE_OVERLAY_LOG_DRAFT: "saveOverlayLogDraft",
  OVERRIDE_LAST_REVIEW_RESULT: "overrideLastReviewResult",
  OPEN_EXTENSION_PAGE: "openExtensionPage",
  OPEN_PROBLEM_PAGE: "openProblemPage",
  UPDATE_NOTES: "updateNotes",
  UPDATE_TAGS: "updateTags",
  GET_TODAY_QUEUE: "getTodayQueue",
  GET_APP_SHELL_DATA: "getAppShellData",
  GET_POPUP_SHELL_DATA: "getPopupShellData",
  IMPORT_CURATED_SET: "importCuratedTrack",
  IMPORT_CUSTOM_SET: "importCustomTrack",
  EXPORT_DATA: "exportData",
  IMPORT_DATA: "importData",
  RESET_STUDY_HISTORY: "resetStudyHistory",
  UPDATE_SETTINGS: "updateSettings",
  ADD_PROBLEM_BY_INPUT: "addProblemByInput",
  SUSPEND_PROBLEM: "suspendProblem",
  RESET_PROBLEM_SCHEDULE: "resetProblemSchedule",
  EDIT_PROBLEM: "editProblem",
  CREATE_CUSTOM_TOPIC: "createCustomTopic",
  CREATE_CUSTOM_COMPANY: "createCustomCompany",
  ASSIGN_TOPIC_TO_PROBLEM: "assignTopicToProblem",
  ASSIGN_COMPANY_TO_PROBLEM: "assignCompanyToProblem",
  CREATE_TRACK: "createTrack",
  UPDATE_TRACK: "updateTrack",
  DELETE_TRACK: "deleteTrack",
  CONSUME_PRE_V7_BACKUP: "consumePreV7Backup",
};

const MESSAGE_TYPE_FROM_METHOD: Record<string, string> = Object.fromEntries(
  Object.entries(METHOD_FROM_MESSAGE_TYPE).map(([k, v]) => [v, k]),
);

/** Mock target: tests still call `sendMessageMock("MESSAGE_TYPE", payload)`
 *  semantics. Internally we adapt new-API method names back to the legacy
 *  type when the proxy dispatches. */
export const sendMessageMock = vi.fn<(...args: unknown[]) => unknown>();
export const tabsCreateMock = vi.fn<(...args: unknown[]) => unknown>();
const storageChangeListeners = new Set<
  (
    changes: Record<string, chrome.storage.StorageChange>,
    areaName: string
  ) => void
>();

export function emitLocalStorageChange(
  changes: Record<string, chrome.storage.StorageChange>
) {
  for (const listener of storageChangeListeners) {
    listener(changes, "local");
  }
}

/** Wire-level mock used by the typed proxy in production. Translates the
 *  new `{ method, payload }` envelope into the legacy `(MESSAGE_TYPE, payload)`
 *  call signature the existing tests expect, then normalizes the test's
 *  arbitrary return value (envelope or resolved data) into the proxy's
 *  expected `{ ok, data, error }` envelope. */
async function chromeSendMessageAdapter(envelope: unknown): Promise<unknown> {
  if (
    !envelope ||
    typeof envelope !== "object" ||
    !("method" in envelope) ||
    typeof (envelope as { method: unknown }).method !== "string"
  ) {
    return { ok: false, error: "Invalid envelope from test proxy." };
  }
  const { method, payload } = envelope as { method: string; payload: unknown };
  const legacyType = MESSAGE_TYPE_FROM_METHOD[method] ?? method;
  const raw: unknown = sendMessageMock(legacyType, payload ?? {});
  const result: unknown = raw instanceof Promise ? await raw : raw;
  // Tests may return either an envelope `{ ok, data, error }` or a bare
  // value. Normalize: if it looks like an envelope keep it; otherwise
  // wrap as a success envelope so the proxy resolves with the value.
  if (result && typeof result === "object" && "ok" in (result as object)) {
    return result;
  }
  return { ok: true, data: result };
}

// Re-export the message-type → method map so individual tests that need
// to assert against the new naming (or extend the translation table for
// future methods) can without re-deriving it locally.
export const messageTypeToMethod = METHOD_FROM_MESSAGE_TYPE;

afterEach(() => {
  cleanup();
  sendMessageMock.mockReset();
  tabsCreateMock.mockReset();
  storageChangeListeners.clear();
  vi.useRealTimers();
});

beforeEach(() => {
  Object.defineProperty(globalThis, "chrome", {
    configurable: true,
    value: {
      runtime: {
        getURL: (path: string) => `chrome-extension://test/${path}`,
        id: "test-extension",
        sendMessage: chromeSendMessageAdapter,
      },
      tabs: {
        create: tabsCreateMock,
      },
      storage: {
        onChanged: {
          addListener: (
            listener: (
              changes: Record<string, chrome.storage.StorageChange>,
              areaName: string
            ) => void
          ) => {
            storageChangeListeners.add(listener);
          },
          removeListener: (
            listener: (
              changes: Record<string, chrome.storage.StorageChange>,
              areaName: string
            ) => void
          ) => {
            storageChangeListeners.delete(listener);
          },
        },
      },
    },
  });
});
