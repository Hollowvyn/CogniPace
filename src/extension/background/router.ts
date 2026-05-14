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
import { MessageType, RuntimeMessage } from "@libs/runtime-rpc/contracts";

import { toEnvelope } from "./responses";

import type { ExportPayload } from "@features/backup/server";
import type { RuntimeResponse } from "@libs/runtime-rpc/client";

/** Routes a validated runtime message to the appropriate feature handler. */
export function handleMessage(
  message: RuntimeMessage,
  sender?: chrome.runtime.MessageSender,
): Promise<RuntimeResponse<unknown>> {
  switch (message.type as MessageType) {
    case "UPSERT_PROBLEM_FROM_PAGE":
      return toEnvelope(upsertFromPage(message.payload as Parameters<typeof upsertFromPage>[0]));
    case "GET_PROBLEM_CONTEXT":
      return toEnvelope(getProblemContext(message.payload as Parameters<typeof getProblemContext>[0]));
    case "RATE_PROBLEM":
      return toEnvelope(rateProblem(message.payload as Parameters<typeof rateProblem>[0]));
    case "SAVE_REVIEW_RESULT":
      return toEnvelope(saveReviewResult(message.payload as Parameters<typeof saveReviewResult>[0]));
    case "SAVE_OVERLAY_LOG_DRAFT":
      return toEnvelope(saveOverlayLogDraft(message.payload as Parameters<typeof saveOverlayLogDraft>[0]));
    case "OVERRIDE_LAST_REVIEW_RESULT":
      return toEnvelope(overrideLastReviewResult(message.payload as Parameters<typeof overrideLastReviewResult>[0]));
    case "OPEN_EXTENSION_PAGE":
      return toEnvelope(openExtensionPage(message.payload as Parameters<typeof openExtensionPage>[0]));
    case "OPEN_PROBLEM_PAGE":
      return toEnvelope(openProblemPage(message.payload as Parameters<typeof openProblemPage>[0], sender));
    case "UPDATE_NOTES":
      return toEnvelope(updateNotes(message.payload as Parameters<typeof updateNotes>[0]));
    case "UPDATE_TAGS":
      return toEnvelope(updateTags(message.payload as Parameters<typeof updateTags>[0]));
    case "GET_TODAY_QUEUE":
      return toEnvelope(getQueue());
    case "GET_APP_SHELL_DATA":
      return toEnvelope(getAppShellData());
    case "GET_POPUP_SHELL_DATA":
      return toEnvelope(getPopupShellData());
    case "IMPORT_CURATED_SET":
      return toEnvelope(importCuratedTrackHandler({ trackName: (message.payload as { setName: string }).setName }));
    case "IMPORT_CUSTOM_SET":
      return toEnvelope(importCustomTrackHandler({ trackName: (message.payload as { setName?: string; items: unknown[] }).setName, items: (message.payload as { items: Parameters<typeof importCustomTrackHandler>[0]["items"] }).items }));
    case "EXPORT_DATA":
      return toEnvelope(exportData());
    case "IMPORT_DATA":
      return toEnvelope(importData(message.payload as ExportPayload));
    case "RESET_STUDY_HISTORY":
      return toEnvelope(resetStudyHistory());
    case "UPDATE_SETTINGS":
      return toEnvelope(updateSettings(message.payload as Record<string, unknown>));
    case "ADD_PROBLEM_BY_INPUT":
      return toEnvelope(addProblemByInputHandler(message.payload as Parameters<typeof addProblemByInputHandler>[0]));
    case "SUSPEND_PROBLEM":
      return toEnvelope(suspendProblem(message.payload as Parameters<typeof suspendProblem>[0]));
    case "RESET_PROBLEM_SCHEDULE":
      return toEnvelope(resetProblem(message.payload as Parameters<typeof resetProblem>[0]));
    case "EDIT_PROBLEM":
      return toEnvelope(editProblemHandler(message.payload as Parameters<typeof editProblemHandler>[0]));
    case "CREATE_CUSTOM_TOPIC":
      return toEnvelope(createCustomTopicHandler(message.payload as Parameters<typeof createCustomTopicHandler>[0]));
    case "CREATE_CUSTOM_COMPANY":
      return toEnvelope(createCustomCompanyHandler(message.payload as Parameters<typeof createCustomCompanyHandler>[0]));
    case "ASSIGN_TOPIC_TO_PROBLEM":
      return toEnvelope(assignTopicHandler(message.payload as Parameters<typeof assignTopicHandler>[0]));
    case "ASSIGN_COMPANY_TO_PROBLEM":
      return toEnvelope(assignCompanyHandler(message.payload as Parameters<typeof assignCompanyHandler>[0]));
    case "CREATE_TRACK":
      return toEnvelope(createTrackHandler(message.payload as Parameters<typeof createTrackHandler>[0]));
    case "UPDATE_TRACK":
      return toEnvelope(updateTrackHandler(message.payload as Parameters<typeof updateTrackHandler>[0]));
    case "DELETE_TRACK":
      return toEnvelope(deleteTrackHandler(message.payload as Parameters<typeof deleteTrackHandler>[0]));
    case "CONSUME_PRE_V7_BACKUP":
      return toEnvelope(consumePreV7BackupHandler());
    default:
      throw new Error(`Unknown message type: ${message.type}`);
  }
}
