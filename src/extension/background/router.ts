/** Central runtime router that dispatches validated messages to grouped handlers. */
import { ExportPayload } from "../../domain/types";
import { RuntimeMessage, MessageType } from "../runtime/contracts";

import { getAppShellData, getQueue, openExtensionPage } from "./handlers/appShellHandlers";
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
  rateProblem,
  resetProblem,
  saveReviewResult,
  suspendProblem,
  updateNotes,
  updateTags,
  upsertFromPage,
} from "./handlers/problemHandlers";
import { exportData, importData, updateSettings } from "./handlers/settingsHandlers";

/** Routes a validated runtime message to the appropriate grouped handler. */
export async function handleMessage(message: RuntimeMessage) {
  switch (message.type as MessageType) {
    case "UPSERT_PROBLEM_FROM_PAGE":
      return upsertFromPage(message.payload as Parameters<typeof upsertFromPage>[0]);
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
    case "OPEN_EXTENSION_PAGE":
      return openExtensionPage(
        message.payload as Parameters<typeof openExtensionPage>[0]
      );
    case "OPEN_PROBLEM_PAGE":
      return openProblemPage(
        message.payload as Parameters<typeof openProblemPage>[0]
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
      return importCurated(message.payload as Parameters<typeof importCurated>[0]);
    case "IMPORT_CUSTOM_SET":
      return importCustom(message.payload as Parameters<typeof importCustom>[0]);
    case "EXPORT_DATA":
      return exportData();
    case "IMPORT_DATA":
      return importData(message.payload as ExportPayload);
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
      return resetProblem(message.payload as Parameters<typeof resetProblem>[0]);
    default:
      throw new Error(`Unknown message type: ${message.type}`);
  }
}
