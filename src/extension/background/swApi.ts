/** Service-worker API surface. The handlers' signatures ARE the wire contract;
 *  UI side imports `type SwApi = typeof swApi` to build its typed proxy.
 *
 *  Adding a new handler: import it here, add it to the object. Done. No god-files. */
import {
  getActiveTrack,
  getAppShellData,
  getLibrary,
  getPopupShellData,
  getQueue,
  getTracks,
  openExtensionPage,
} from "@features/app-shell/server";
import {
  consumePreV7BackupHandler,
  exportData,
  importData,
  resetStudyHistory,
} from "@features/backup/server";
import {
  addProblemByInputHandler,
  getEditChoices,
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
import { getSettings, updateSettings } from "@features/settings/server";
import {
  createTrackHandler,
  deleteTrackHandler,
  setActiveTrackHandler,
  updateTrackHandler,
} from "@features/tracks/server";

/** Flat method registry. UI proxies into this via `createSwClient<SwApi>()`. */
export const swApi = {
  // Problems — page context + review flow
  upsertProblemFromPage: upsertFromPage,
  getProblemContext,
  rateProblem,
  saveReviewResult,
  saveOverlayLogDraft,
  overrideLastReviewResult,
  // Problems — page actions
  openProblemPage,
  // Problems — notes/tags/admin
  updateNotes,
  updateTags,
  suspendProblem,
  resetProblemSchedule: resetProblem,
  editProblem: editProblemHandler,
  // Problems — catalog management
  getEditChoices,
  addProblemByInput: addProblemByInputHandler,
  createCustomTopic: createCustomTopicHandler,
  createCustomCompany: createCustomCompanyHandler,
  assignTopicToProblem: assignTopicHandler,
  assignCompanyToProblem: assignCompanyHandler,
  importCuratedTrack: importCuratedTrackHandler,
  importCustomTrack: importCustomTrackHandler,
  // App-shell — read aggregates
  getActiveTrack,
  getAppShellData,
  getPopupShellData,
  getTodayQueue: getQueue,
  getTracks,
  getLibrary,
  openExtensionPage,
  // Settings
  getSettings,
  updateSettings,
  // Tracks
  createTrack: createTrackHandler,
  updateTrack: updateTrackHandler,
  deleteTrack: deleteTrackHandler,
  setActiveTrack: setActiveTrackHandler,
  // Backup
  exportData,
  importData,
  resetStudyHistory,
  consumePreV7Backup: consumePreV7BackupHandler,
} as const;

/** The wire contract — UI imports this with `import type`. */
export type SwApi = typeof swApi;
