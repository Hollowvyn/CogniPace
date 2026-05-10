/** Central runtime router that dispatches validated messages to grouped handlers. */
import { ExportPayload } from "../../domain/types";
import { MessageType, RuntimeMessage } from "../runtime/contracts";

import {
  getAppShellData,
  getPopupShellData,
  getQueue,
  openExtensionPage,
} from "./handlers/appShellHandlers";
import {
  activateCourseChapter,
  addProblemByInput,
  addProblemToCourse,
  importCurated,
  importCustom,
  switchActiveCourseHandler,
  trackCourseQuestionLaunch,
} from "./handlers/courseHandlers";
import {
  getProblemContext,
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
} from "./handlers/problemHandlers";
import {
  exportData,
  importData,
  resetStudyHistory,
  updateSettings,
} from "./handlers/settingsHandlers";
import {
  assignCompanyHandler,
  assignTopicHandler,
  consumePreV7BackupHandler,
  createCustomCompanyHandler,
  createCustomTopicHandler,
  createStudySetHandler,
  deleteStudySetHandler,
  editProblemHandler,
  setActiveFocusHandler,
  updateStudySetHandler,
} from "./handlers/v7Handlers";

/** Routes a validated runtime message to the appropriate grouped handler. */
export async function handleMessage(
  message: RuntimeMessage,
  sender?: chrome.runtime.MessageSender
) {
  switch (message.type as MessageType) {
    case "UPSERT_PROBLEM_FROM_PAGE":
      return upsertFromPage(
        message.payload as Parameters<typeof upsertFromPage>[0]
      );
    case "GET_PROBLEM_CONTEXT":
      return getProblemContext(
        message.payload as Parameters<typeof getProblemContext>[0]
      );
    case "RATE_PROBLEM":
      return rateProblem(message.payload as Parameters<typeof rateProblem>[0]);
    case "SAVE_REVIEW_RESULT":
      return saveReviewResult(
        message.payload as Parameters<typeof saveReviewResult>[0]
      );
    case "SAVE_OVERLAY_LOG_DRAFT":
      return saveOverlayLogDraft(
        message.payload as Parameters<typeof saveOverlayLogDraft>[0]
      );
    case "OVERRIDE_LAST_REVIEW_RESULT":
      return overrideLastReviewResult(
        message.payload as Parameters<typeof overrideLastReviewResult>[0]
      );
    case "OPEN_EXTENSION_PAGE":
      return openExtensionPage(
        message.payload as Parameters<typeof openExtensionPage>[0]
      );
    case "OPEN_PROBLEM_PAGE":
      return openProblemPage(
        message.payload as Parameters<typeof openProblemPage>[0],
        sender
      );
    case "UPDATE_NOTES":
      return updateNotes(message.payload as Parameters<typeof updateNotes>[0]);
    case "UPDATE_TAGS":
      return updateTags(message.payload as Parameters<typeof updateTags>[0]);
    case "GET_TODAY_QUEUE":
      return getQueue();
    case "GET_DASHBOARD_DATA":
    case "GET_APP_SHELL_DATA":
      return getAppShellData();
    case "GET_POPUP_SHELL_DATA":
      return getPopupShellData();
    case "SWITCH_ACTIVE_COURSE":
      return switchActiveCourseHandler(
        message.payload as Parameters<typeof switchActiveCourseHandler>[0]
      );
    case "SET_ACTIVE_COURSE_CHAPTER":
      return activateCourseChapter(
        message.payload as Parameters<typeof activateCourseChapter>[0]
      );
    case "TRACK_COURSE_QUESTION_LAUNCH":
      return trackCourseQuestionLaunch(
        message.payload as Parameters<typeof trackCourseQuestionLaunch>[0]
      );
    case "IMPORT_CURATED_SET":
      return importCurated(
        message.payload as Parameters<typeof importCurated>[0]
      );
    case "IMPORT_CUSTOM_SET":
      return importCustom(
        message.payload as Parameters<typeof importCustom>[0]
      );
    case "EXPORT_DATA":
      return exportData();
    case "IMPORT_DATA":
      return importData(message.payload as ExportPayload);
    case "RESET_STUDY_HISTORY":
      return resetStudyHistory();
    case "UPDATE_SETTINGS":
      return updateSettings(message.payload as Record<string, unknown>);
    case "ADD_PROBLEM_BY_INPUT":
      return addProblemByInput(
        message.payload as Parameters<typeof addProblemByInput>[0]
      );
    case "ADD_PROBLEM_TO_COURSE":
      return addProblemToCourse(
        message.payload as Parameters<typeof addProblemToCourse>[0]
      );
    case "SUSPEND_PROBLEM":
      return suspendProblem(
        message.payload as Parameters<typeof suspendProblem>[0]
      );
    case "RESET_PROBLEM_SCHEDULE":
      return resetProblem(
        message.payload as Parameters<typeof resetProblem>[0]
      );
    // v7 — additive Question-as-SSoT surface.
    case "EDIT_PROBLEM":
      return editProblemHandler(
        message.payload as Parameters<typeof editProblemHandler>[0]
      );
    case "CREATE_CUSTOM_TOPIC":
      return createCustomTopicHandler(
        message.payload as Parameters<typeof createCustomTopicHandler>[0]
      );
    case "CREATE_CUSTOM_COMPANY":
      return createCustomCompanyHandler(
        message.payload as Parameters<typeof createCustomCompanyHandler>[0]
      );
    case "ASSIGN_TOPIC_TO_PROBLEM":
      return assignTopicHandler(
        message.payload as Parameters<typeof assignTopicHandler>[0]
      );
    case "ASSIGN_COMPANY_TO_PROBLEM":
      return assignCompanyHandler(
        message.payload as Parameters<typeof assignCompanyHandler>[0]
      );
    case "CREATE_STUDY_SET":
      return createStudySetHandler(
        message.payload as Parameters<typeof createStudySetHandler>[0]
      );
    case "UPDATE_STUDY_SET":
      return updateStudySetHandler(
        message.payload as Parameters<typeof updateStudySetHandler>[0]
      );
    case "DELETE_STUDY_SET":
      return deleteStudySetHandler(
        message.payload as Parameters<typeof deleteStudySetHandler>[0]
      );
    case "SET_ACTIVE_FOCUS":
      return setActiveFocusHandler(
        message.payload as Parameters<typeof setActiveFocusHandler>[0]
      );
    case "CONSUME_PRE_V7_BACKUP":
      return consumePreV7BackupHandler();
    default:
      throw new Error(`Unknown message type: ${message.type}`);
  }
}
