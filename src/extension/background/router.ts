/** Central runtime router that dispatches validated messages to feature handlers. */
import {
  getAppShellData,
  getPopupShellData,
  getQueue,
  openExtensionPage,
} from "@features/app-shell/server";
import {
  exportData,
  importData,
  resetStudyHistory,
  consumePreV7BackupHandler,
} from "@features/backup/server";
import {
  addProblemByInputHandler,
  assignCompanyHandler,
  assignTopicHandler,
  createCustomCompanyHandler,
  createCustomTopicHandler,
  editProblemHandler,
  getProblemContext,
  importCuratedTrackHandler,
  importCustomTrackHandler,
  openProblemPage,
  overrideLastReviewResult,
  rateProblem,
  resetProblem,
  saveOverlayLogDraft,
  saveReviewResult,
  suspendProblem,
  updateNotes,
  updateTags,
  upsertFromPage,
} from "@features/problems/server";
import { updateSettings } from "@features/settings/server";
import {
  createTrackHandler,
  deleteTrackHandler,
  updateTrackHandler,
} from "@features/tracks/server";
import { RuntimeMessage } from "@libs/runtime-rpc/contracts";

import { toEnvelope } from "./responses";

import type { RuntimeResponse } from "@libs/runtime-rpc/client";

/** Routes a validated runtime message to the appropriate feature handler.
 *  RuntimeMessage is a discriminated union, so `message.payload` narrows
 *  to the matching MessageRequestMap entry inside each case. */
export function handleMessage(
  message: RuntimeMessage,
  sender?: chrome.runtime.MessageSender,
): Promise<RuntimeResponse<unknown>> {
  switch (message.type) {
    case "UPSERT_PROBLEM_FROM_PAGE":       return toEnvelope(upsertFromPage(message.payload));
    case "GET_PROBLEM_CONTEXT":            return toEnvelope(getProblemContext(message.payload));
    case "RATE_PROBLEM":                   return toEnvelope(rateProblem(message.payload));
    case "SAVE_REVIEW_RESULT":             return toEnvelope(saveReviewResult(message.payload));
    case "SAVE_OVERLAY_LOG_DRAFT":         return toEnvelope(saveOverlayLogDraft(message.payload));
    case "OVERRIDE_LAST_REVIEW_RESULT":    return toEnvelope(overrideLastReviewResult(message.payload));
    case "OPEN_EXTENSION_PAGE":            return toEnvelope(openExtensionPage(message.payload));
    case "OPEN_PROBLEM_PAGE":              return toEnvelope(openProblemPage(message.payload, sender));
    case "UPDATE_NOTES":                   return toEnvelope(updateNotes(message.payload));
    case "UPDATE_TAGS":                    return toEnvelope(updateTags(message.payload));
    case "GET_TODAY_QUEUE":                return toEnvelope(getQueue());
    case "GET_APP_SHELL_DATA":             return toEnvelope(getAppShellData());
    case "GET_POPUP_SHELL_DATA":           return toEnvelope(getPopupShellData());
    case "EXPORT_DATA":                    return toEnvelope(exportData());
    case "IMPORT_DATA":                    return toEnvelope(importData(message.payload));
    case "RESET_STUDY_HISTORY":            return toEnvelope(resetStudyHistory());
    case "UPDATE_SETTINGS":                return toEnvelope(updateSettings(message.payload));
    case "ADD_PROBLEM_BY_INPUT":           return toEnvelope(addProblemByInputHandler(message.payload));
    case "SUSPEND_PROBLEM":                return toEnvelope(suspendProblem(message.payload));
    case "RESET_PROBLEM_SCHEDULE":         return toEnvelope(resetProblem(message.payload));
    case "EDIT_PROBLEM":                   return toEnvelope(editProblemHandler(message.payload));
    case "CREATE_CUSTOM_TOPIC":            return toEnvelope(createCustomTopicHandler(message.payload));
    case "CREATE_CUSTOM_COMPANY":          return toEnvelope(createCustomCompanyHandler(message.payload));
    case "ASSIGN_TOPIC_TO_PROBLEM":        return toEnvelope(assignTopicHandler(message.payload));
    case "ASSIGN_COMPANY_TO_PROBLEM":      return toEnvelope(assignCompanyHandler(message.payload));
    case "CREATE_TRACK":                   return toEnvelope(createTrackHandler(message.payload));
    case "UPDATE_TRACK":                   return toEnvelope(updateTrackHandler(message.payload));
    case "DELETE_TRACK":                   return toEnvelope(deleteTrackHandler(message.payload));
    case "CONSUME_PRE_V7_BACKUP":          return toEnvelope(consumePreV7BackupHandler());
    // Wire still uses legacy `setName`; handlers were renamed to trackName in Phase B.
    // Wire-contract rename is deferred (see project_phase_b_wire_contract_backlog memory).
    case "IMPORT_CURATED_SET":
      return toEnvelope(importCuratedTrackHandler({ trackName: message.payload.setName }));
    case "IMPORT_CUSTOM_SET":
      return toEnvelope(importCustomTrackHandler({
        trackName: message.payload.setName,
        items: message.payload.items,
      }));
    default: {
      // Exhaustiveness check — compile fails if a new MessageType is added without a case.
      const _exhaustive: never = message;
      throw new Error(`Unknown message type: ${JSON.stringify(_exhaustive)}`);
    }
  }
}
