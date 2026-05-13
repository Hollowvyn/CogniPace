/** Runtime-message response contract — SW returns to UI. */
import type {
  AppShellPayload,
  ImportSummaryResponse,
  OpenedResponse,
  PopupShellPayload,
  ProblemContextResponse,
  ProblemMutationResponse,
  SaveReviewResultResponse,
  SettingsUpdateResponse,
  StudyHistoryResetResponse,
  StudyStateMutationResponse,
} from "../../../domain/views";
import type {
  ExportPayload,
  ImportedResponse,
} from "@features/backup/server";
import type { TodayQueue } from "@features/queue/server";

export interface MessageResponseMap {
  UPSERT_PROBLEM_FROM_PAGE: ProblemMutationResponse;
  GET_PROBLEM_CONTEXT: ProblemContextResponse;
  RATE_PROBLEM: SaveReviewResultResponse;
  SAVE_REVIEW_RESULT: SaveReviewResultResponse;
  SAVE_OVERLAY_LOG_DRAFT: StudyStateMutationResponse;
  OVERRIDE_LAST_REVIEW_RESULT: SaveReviewResultResponse;
  OPEN_EXTENSION_PAGE: OpenedResponse;
  OPEN_PROBLEM_PAGE: OpenedResponse;
  UPDATE_NOTES: StudyStateMutationResponse;
  UPDATE_TAGS: StudyStateMutationResponse;
  GET_TODAY_QUEUE: TodayQueue;
  GET_DASHBOARD_DATA: AppShellPayload;
  GET_APP_SHELL_DATA: AppShellPayload;
  GET_POPUP_SHELL_DATA: PopupShellPayload;
  IMPORT_CURATED_SET: ImportSummaryResponse;
  IMPORT_CUSTOM_SET: ImportSummaryResponse;
  EXPORT_DATA: ExportPayload;
  IMPORT_DATA: ImportedResponse;
  RESET_STUDY_HISTORY: StudyHistoryResetResponse;
  UPDATE_SETTINGS: SettingsUpdateResponse;
  ADD_PROBLEM_BY_INPUT: ProblemMutationResponse & { slug: string };
  SUSPEND_PROBLEM: StudyStateMutationResponse;
  RESET_PROBLEM_SCHEDULE: StudyStateMutationResponse;
  EDIT_PROBLEM: ProblemMutationResponse;
  CREATE_CUSTOM_TOPIC: { ok: true; id: string };
  CREATE_CUSTOM_COMPANY: { ok: true; id: string };
  ASSIGN_TOPIC_TO_PROBLEM: ProblemMutationResponse;
  ASSIGN_COMPANY_TO_PROBLEM: ProblemMutationResponse;
  CREATE_TRACK: { ok: true; id: string };
  UPDATE_TRACK: { ok: true } | { ok: false; reason: "not-found" };
  DELETE_TRACK:
    | { ok: true }
    | { ok: false; reason: "not-found" | "curated" };
  SET_ACTIVE_FOCUS: SettingsUpdateResponse;
  CONSUME_PRE_V7_BACKUP: { backup: unknown };
}
