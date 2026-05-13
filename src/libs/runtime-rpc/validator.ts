/** Runtime message validation and sender authorization safeguards. */
import {
  isProblemPage,
  normalizeSlug,
  slugToUrl,
} from "@libs/leetcode";

import { assertImportPayloadShape } from "../../data/importexport/backup";

import { MessageType, RuntimeMessage } from "./contracts";

const MESSAGE_TYPES = {
  UPSERT_PROBLEM_FROM_PAGE: true,
  GET_PROBLEM_CONTEXT: true,
  RATE_PROBLEM: true,
  SAVE_REVIEW_RESULT: true,
  SAVE_OVERLAY_LOG_DRAFT: true,
  OVERRIDE_LAST_REVIEW_RESULT: true,
  OPEN_EXTENSION_PAGE: true,
  OPEN_PROBLEM_PAGE: true,
  UPDATE_NOTES: true,
  UPDATE_TAGS: true,
  GET_TODAY_QUEUE: true,
  GET_DASHBOARD_DATA: true,
  GET_APP_SHELL_DATA: true,
  GET_POPUP_SHELL_DATA: true,
  IMPORT_CURATED_SET: true,
  IMPORT_CUSTOM_SET: true,
  EXPORT_DATA: true,
  IMPORT_DATA: true,
  RESET_STUDY_HISTORY: true,
  UPDATE_SETTINGS: true,
  ADD_PROBLEM_BY_INPUT: true,
  SUSPEND_PROBLEM: true,
  RESET_PROBLEM_SCHEDULE: true,
  EDIT_PROBLEM: true,
  CREATE_CUSTOM_TOPIC: true,
  CREATE_CUSTOM_COMPANY: true,
  ASSIGN_TOPIC_TO_PROBLEM: true,
  ASSIGN_COMPANY_TO_PROBLEM: true,
  CREATE_TRACK: true,
  UPDATE_TRACK: true,
  DELETE_TRACK: true,
  SET_ACTIVE_FOCUS: true,
  CONSUME_PRE_V7_BACKUP: true,
} satisfies Record<MessageType, true>;

const CONTENT_SCRIPT_MESSAGE_TYPES = new Set<MessageType>([
  "UPSERT_PROBLEM_FROM_PAGE",
  "GET_PROBLEM_CONTEXT",
  "SAVE_REVIEW_RESULT",
  "SAVE_OVERLAY_LOG_DRAFT",
  "OVERRIDE_LAST_REVIEW_RESULT",
  "OPEN_EXTENSION_PAGE",
  "GET_APP_SHELL_DATA",
  "GET_POPUP_SHELL_DATA",
  "OPEN_PROBLEM_PAGE",
]);

const ALLOWED_DASHBOARD_VIEWS = new Set([
  "dashboard",
  "tracks",
  "library",
  "analytics",
  "settings",
]);

const EMPTY_KEYS: readonly string[] = [];
const SETTINGS_KEYS = [
  "dailyQuestionGoal",
  "studyMode",
  "activeTrackId",
  "notifications",
  "memoryReview",
  "questionFilters",
  "timing",
  "experimental",
] as const;

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(
  value: UnknownRecord,
  allowedKeys: readonly string[],
  label: string
): void {
  for (const key of Object.keys(value)) {
    if (!allowedKeys.includes(key)) {
      throw new Error(`${label} contains unexpected field "${key}".`);
    }
  }
}

function requireString(
  value: unknown,
  field: string,
  allowEmpty = false
): string {
  if (typeof value !== "string") {
    throw new Error(`Invalid field "${field}": expected a string.`);
  }
  if (!allowEmpty && !value.trim()) {
    throw new Error(`Invalid field "${field}": expected a non-empty string.`);
  }
  return value;
}

function requireOptionalString(value: unknown, field: string): void {
  if (value !== undefined && typeof value !== "string") {
    throw new Error(`Invalid field "${field}": expected a string.`);
  }
}

function requireOptionalBoolean(value: unknown, field: string): void {
  if (value !== undefined && typeof value !== "boolean") {
    throw new Error(`Invalid field "${field}": expected a boolean.`);
  }
}

function requireBoolean(value: unknown, field: string): void {
  if (typeof value !== "boolean") {
    throw new Error(`Invalid field "${field}": expected a boolean.`);
  }
}

function requireOptionalFiniteNumber(value: unknown, field: string): void {
  if (
    value !== undefined &&
    (typeof value !== "number" || !Number.isFinite(value))
  ) {
    throw new Error(`Invalid field "${field}": expected a number.`);
  }
}

function requireOptionalTimeString(value: unknown, field: string): void {
  if (value === undefined) {
    return;
  }
  if (typeof value !== "string" || !/^([01]\d|2[0-3]):([0-5]\d)$/.test(value)) {
    throw new Error(`Invalid field "${field}": expected HH:mm time.`);
  }
}

function requireStringArray(value: unknown, field: string): void {
  if (
    !Array.isArray(value) ||
    !value.every((item) => typeof item === "string")
  ) {
    throw new Error(`Invalid field "${field}": expected a string array.`);
  }
}

function requireOptionalStringArray(value: unknown, field: string): void {
  if (value !== undefined) {
    requireStringArray(value, field);
  }
}

function requireRating(value: unknown, field: string): void {
  if (value !== 0 && value !== 1 && value !== 2 && value !== 3) {
    throw new Error(`Invalid field "${field}": expected a rating value.`);
  }
}

function requireOptionalReviewMode(value: unknown, field: string): void {
  if (value !== undefined && value !== "RECALL" && value !== "FULL_SOLVE") {
    throw new Error(`Invalid field "${field}": expected a review mode.`);
  }
}

function requireOptionalDifficulty(value: unknown, field: string): void {
  if (
    value !== undefined &&
    value !== "Easy" &&
    value !== "Medium" &&
    value !== "Hard" &&
    value !== "Unknown"
  ) {
    throw new Error(`Invalid field "${field}": expected a difficulty.`);
  }
}

function requireOptionalReviewOrder(value: unknown, field: string): void {
  if (
    value !== undefined &&
    value !== "dueFirst" &&
    value !== "mixByDifficulty" &&
    value !== "weakestFirst"
  ) {
    throw new Error(`Invalid field "${field}": expected a review order.`);
  }
}

function requireOptionalStudyMode(value: unknown, field: string): void {
  if (value !== undefined && value !== "freestyle" && value !== "studyPlan") {
    throw new Error(`Invalid field "${field}": expected a study mode.`);
  }
}

function validateDifficultyGoalMs(value: unknown): void {
  if (!isRecord(value)) {
    throw new Error('Invalid field "difficultyGoalMs": expected an object.');
  }
  hasExactKeys(value, ["Easy", "Medium", "Hard"], 'Field "difficultyGoalMs"');
  requireOptionalFiniteNumber(value.Easy, "difficultyGoalMs.Easy");
  requireOptionalFiniteNumber(value.Medium, "difficultyGoalMs.Medium");
  requireOptionalFiniteNumber(value.Hard, "difficultyGoalMs.Hard");
}

function validateNotifications(value: unknown): void {
  if (!isRecord(value)) {
    throw new Error('Invalid field "notifications": expected an object.');
  }
  hasExactKeys(value, ["enabled", "dailyTime"], 'Field "notifications"');
  requireOptionalBoolean(value.enabled, "notifications.enabled");
  requireOptionalTimeString(value.dailyTime, "notifications.dailyTime");
}

function validateMemoryReview(value: unknown): void {
  if (!isRecord(value)) {
    throw new Error('Invalid field "memoryReview": expected an object.');
  }
  hasExactKeys(
    value,
    ["targetRetention", "reviewOrder"],
    'Field "memoryReview"'
  );
  requireOptionalFiniteNumber(
    value.targetRetention,
    "memoryReview.targetRetention"
  );
  requireOptionalReviewOrder(value.reviewOrder, "memoryReview.reviewOrder");
}

function validateQuestionFilters(value: unknown): void {
  if (!isRecord(value)) {
    throw new Error('Invalid field "questionFilters": expected an object.');
  }
  hasExactKeys(value, ["skipPremium"], 'Field "questionFilters"');
  requireOptionalBoolean(value.skipPremium, "questionFilters.skipPremium");
}

function validateTiming(value: unknown): void {
  if (!isRecord(value)) {
    throw new Error('Invalid field "timing": expected an object.');
  }
  hasExactKeys(
    value,
    ["requireSolveTime", "hardMode", "difficultyGoalMs"],
    'Field "timing"'
  );
  requireOptionalBoolean(value.requireSolveTime, "timing.requireSolveTime");
  requireOptionalBoolean(value.hardMode, "timing.hardMode");
  if (value.difficultyGoalMs !== undefined) {
    validateDifficultyGoalMs(value.difficultyGoalMs);
  }
}

function validateExperimental(value: unknown): void {
  if (!isRecord(value)) {
    throw new Error('Invalid field "experimental": expected an object.');
  }
  hasExactKeys(value, ["autoDetectSolved"], 'Field "experimental"');
  requireOptionalBoolean(
    value.autoDetectSolved,
    "experimental.autoDetectSolved"
  );
}

function validateCustomSetItems(value: unknown): void {
  if (!Array.isArray(value)) {
    throw new Error('Invalid field "items": expected an array.');
  }

  for (const item of value) {
    if (!isRecord(item)) {
      throw new Error('Invalid field "items": expected object entries.');
    }
    hasExactKeys(
      item,
      ["slug", "title", "difficulty", "isPremium", "tags"],
      'Field "items[]"'
    );
    requireString(item.slug, "items[].slug");
    requireOptionalString(item.title, "items[].title");
    requireOptionalDifficulty(item.difficulty, "items[].difficulty");
    requireOptionalBoolean(item.isPremium, "items[].isPremium");
    requireOptionalStringArray(item.tags, "items[].tags");
  }
}

function validatePayload(type: MessageType, payload: UnknownRecord): void {
  switch (type) {
    case "UPSERT_PROBLEM_FROM_PAGE":
      hasExactKeys(
        payload,
        [
          "slug",
          "title",
          "difficulty",
          "isPremium",
          "url",
          "topics",
          "solvedDetected",
        ],
        `Payload for ${type}`
      );
      requireString(payload.slug, "slug");
      requireOptionalString(payload.title, "title");
      requireOptionalDifficulty(payload.difficulty, "difficulty");
      requireOptionalBoolean(payload.isPremium, "isPremium");
      requireOptionalString(payload.url, "url");
      requireOptionalStringArray(payload.topics, "topics");
      requireOptionalBoolean(payload.solvedDetected, "solvedDetected");
      return;
    case "GET_PROBLEM_CONTEXT":
      hasExactKeys(payload, ["slug"], `Payload for ${type}`);
      requireString(payload.slug, "slug");
      return;
    case "RATE_PROBLEM":
      hasExactKeys(
        payload,
        ["slug", "rating", "solveTimeMs", "mode", "notesSnapshot"],
        `Payload for ${type}`
      );
      requireString(payload.slug, "slug");
      requireRating(payload.rating, "rating");
      requireOptionalFiniteNumber(payload.solveTimeMs, "solveTimeMs");
      requireOptionalReviewMode(payload.mode, "mode");
      requireOptionalString(payload.notesSnapshot, "notesSnapshot");
      return;
    case "SAVE_REVIEW_RESULT":
    case "OVERRIDE_LAST_REVIEW_RESULT":
      hasExactKeys(
        payload,
        [
          "slug",
          "rating",
          "solveTimeMs",
          "mode",
          "interviewPattern",
          "timeComplexity",
          "spaceComplexity",
          "languages",
          "notes",
          "courseId",
          "chapterId",
          "source",
        ],
        `Payload for ${type}`
      );
      requireString(payload.slug, "slug");
      requireRating(payload.rating, "rating");
      requireOptionalFiniteNumber(payload.solveTimeMs, "solveTimeMs");
      requireOptionalReviewMode(payload.mode, "mode");
      requireOptionalString(payload.interviewPattern, "interviewPattern");
      requireOptionalString(payload.timeComplexity, "timeComplexity");
      requireOptionalString(payload.spaceComplexity, "spaceComplexity");
      requireOptionalString(payload.languages, "languages");
      requireOptionalString(payload.notes, "notes");
      requireOptionalString(payload.courseId, "courseId");
      requireOptionalString(payload.chapterId, "chapterId");
      if (
        payload.source !== undefined &&
        payload.source !== "overlay" &&
        payload.source !== "dashboard"
      ) {
        throw new Error(
          'Invalid field "source": expected "overlay" or "dashboard".'
        );
      }
      return;
    case "SAVE_OVERLAY_LOG_DRAFT":
      hasExactKeys(
        payload,
        [
          "slug",
          "interviewPattern",
          "timeComplexity",
          "spaceComplexity",
          "languages",
          "notes",
        ],
        `Payload for ${type}`
      );
      requireString(payload.slug, "slug");
      requireOptionalString(payload.interviewPattern, "interviewPattern");
      requireOptionalString(payload.timeComplexity, "timeComplexity");
      requireOptionalString(payload.spaceComplexity, "spaceComplexity");
      requireOptionalString(payload.languages, "languages");
      requireOptionalString(payload.notes, "notes");
      return;
    case "OPEN_EXTENSION_PAGE":
      hasExactKeys(payload, ["path"], `Payload for ${type}`);
      requireString(payload.path, "path");
      return;
    case "OPEN_PROBLEM_PAGE":
      hasExactKeys(
        payload,
        ["slug", "courseId", "chapterId"],
        `Payload for ${type}`
      );
      requireString(payload.slug, "slug");
      requireOptionalString(payload.courseId, "courseId");
      requireOptionalString(payload.chapterId, "chapterId");
      return;
    case "UPDATE_NOTES":
      hasExactKeys(payload, ["slug", "notes"], `Payload for ${type}`);
      requireString(payload.slug, "slug");
      requireString(payload.notes, "notes", true);
      return;
    case "UPDATE_TAGS":
      hasExactKeys(payload, ["slug", "tags"], `Payload for ${type}`);
      requireString(payload.slug, "slug");
      requireStringArray(payload.tags, "tags");
      return;
    case "GET_TODAY_QUEUE":
    case "GET_DASHBOARD_DATA":
    case "GET_APP_SHELL_DATA":
    case "GET_POPUP_SHELL_DATA":
    case "EXPORT_DATA":
    case "RESET_STUDY_HISTORY":
      hasExactKeys(payload, EMPTY_KEYS, `Payload for ${type}`);
      return;
    case "IMPORT_CURATED_SET":
      hasExactKeys(payload, ["setName"], `Payload for ${type}`);
      requireString(payload.setName, "setName");
      return;
    case "IMPORT_CUSTOM_SET":
      hasExactKeys(payload, ["setName", "items"], `Payload for ${type}`);
      requireOptionalString(payload.setName, "setName");
      validateCustomSetItems(payload.items);
      return;
    case "IMPORT_DATA":
      assertImportPayloadShape(payload);
      return;
    case "UPDATE_SETTINGS":
      hasExactKeys(payload, SETTINGS_KEYS, `Payload for ${type}`);
      requireOptionalFiniteNumber(
        payload.dailyQuestionGoal,
        "dailyQuestionGoal"
      );
      requireOptionalStudyMode(payload.studyMode, "studyMode");
      if (payload.activeTrackId !== undefined && payload.activeTrackId !== null) {
        requireString(payload.activeTrackId, "activeTrackId");
      }
      if (payload.notifications !== undefined) {
        validateNotifications(payload.notifications);
      }
      if (payload.memoryReview !== undefined) {
        validateMemoryReview(payload.memoryReview);
      }
      if (payload.questionFilters !== undefined) {
        validateQuestionFilters(payload.questionFilters);
      }
      if (payload.timing !== undefined) {
        validateTiming(payload.timing);
      }
      if (payload.experimental !== undefined) {
        validateExperimental(payload.experimental);
      }
      return;
    case "ADD_PROBLEM_BY_INPUT":
      hasExactKeys(
        payload,
        ["input", "sourceSet", "topics", "markAsStarted"],
        `Payload for ${type}`
      );
      requireString(payload.input, "input");
      requireOptionalString(payload.sourceSet, "sourceSet");
      requireOptionalStringArray(payload.topics, "topics");
      requireOptionalBoolean(payload.markAsStarted, "markAsStarted");
      return;
    case "SUSPEND_PROBLEM":
      hasExactKeys(payload, ["slug", "suspend"], `Payload for ${type}`);
      requireString(payload.slug, "slug");
      requireBoolean(payload.suspend, "suspend");
      return;
    case "RESET_PROBLEM_SCHEDULE":
      hasExactKeys(payload, ["slug", "keepNotes"], `Payload for ${type}`);
      requireString(payload.slug, "slug");
      requireOptionalBoolean(payload.keepNotes, "keepNotes");
      return;
    // v7 — additive surface for the Question-as-SSoT refactor.
    case "EDIT_PROBLEM":
      hasExactKeys(
        payload,
        ["slug", "patch", "markUserEdit"],
        `Payload for ${type}`
      );
      requireString(payload.slug, "slug");
      if (!isRecord(payload.patch)) {
        throw new Error('Invalid field "patch": expected an object.');
      }
      requireOptionalBoolean(payload.markUserEdit, "markUserEdit");
      return;
    case "CREATE_CUSTOM_TOPIC":
    case "CREATE_CUSTOM_COMPANY":
      hasExactKeys(payload, ["name", "description"], `Payload for ${type}`);
      requireString(payload.name, "name");
      requireOptionalString(payload.description, "description");
      return;
    case "ASSIGN_TOPIC_TO_PROBLEM":
      hasExactKeys(
        payload,
        ["slug", "topicId", "assigned"],
        `Payload for ${type}`
      );
      requireString(payload.slug, "slug");
      requireString(payload.topicId, "topicId");
      requireOptionalBoolean(payload.assigned, "assigned");
      return;
    case "ASSIGN_COMPANY_TO_PROBLEM":
      hasExactKeys(
        payload,
        ["slug", "companyId", "assigned"],
        `Payload for ${type}`
      );
      requireString(payload.slug, "slug");
      requireString(payload.companyId, "companyId");
      requireOptionalBoolean(payload.assigned, "assigned");
      return;
    case "CREATE_TRACK":
      hasExactKeys(
        payload,
        ["name", "description"],
        `Payload for ${type}`
      );
      requireString(payload.name, "name");
      requireOptionalString(payload.description, "description");
      return;
    case "UPDATE_TRACK":
      hasExactKeys(
        payload,
        ["id", "name", "description", "enabled"],
        `Payload for ${type}`
      );
      requireString(payload.id, "id");
      requireOptionalString(payload.name, "name");
      requireOptionalString(payload.description, "description");
      requireOptionalBoolean(payload.enabled, "enabled");
      return;
    case "DELETE_TRACK":
      hasExactKeys(payload, ["id"], `Payload for ${type}`);
      requireString(payload.id, "id");
      return;
    case "SET_ACTIVE_FOCUS":
      hasExactKeys(payload, ["trackId"], `Payload for ${type}`);
      if (payload.trackId !== null) {
        requireString(payload.trackId, "trackId");
      }
      return;
    case "CONSUME_PRE_V7_BACKUP":
      hasExactKeys(payload, EMPTY_KEYS, `Payload for ${type}`);
      return;
    default:
      throw new Error(`Unknown message type: ${String(type)}`);
  }
}

export function validateRuntimeMessage(message: unknown): RuntimeMessage {
  if (!isRecord(message)) {
    throw new Error("Invalid runtime message: expected an object.");
  }

  hasExactKeys(message, ["type", "payload"], "Runtime message");

  const { type, payload } = message;
  if (
    typeof type !== "string" ||
    !Object.prototype.hasOwnProperty.call(MESSAGE_TYPES, type)
  ) {
    throw new Error("Invalid runtime message: unknown message type.");
  }

  if (!isRecord(payload)) {
    throw new Error("Invalid runtime message: payload must be an object.");
  }

  validatePayload(type as MessageType, payload);
  return {
    type: type as MessageType,
    payload,
  } as RuntimeMessage;
}

export function assertAuthorizedRuntimeMessage(
  message: RuntimeMessage,
  sender: { id?: string; url?: string | undefined; tab?: { url?: string } },
  extensionId: string,
  extensionOrigin: string
): void {
  if (sender.id !== extensionId) {
    throw new Error("Unauthorized runtime sender.");
  }

  const senderUrl =
    typeof sender.url === "string"
      ? sender.url
      : typeof sender.tab?.url === "string"
        ? sender.tab.url
        : undefined;

  if (!senderUrl) {
    throw new Error("Unauthorized runtime sender.");
  }

  if (senderUrl.startsWith(extensionOrigin)) {
    return;
  }

  if (isProblemPage(senderUrl)) {
    if (!CONTENT_SCRIPT_MESSAGE_TYPES.has(message.type)) {
      throw new Error(`Unauthorized content-script message: ${message.type}.`);
    }
    return;
  }

  throw new Error("Unauthorized runtime sender.");
}

export function canonicalProblemUrlForOpen(slugInput: string): string {
  const normalizedSlug = normalizeSlug(slugInput);
  if (!normalizedSlug) {
    throw new Error("Invalid slug.");
  }
  return slugToUrl(normalizedSlug);
}

export function validateExtensionPagePath(pathInput: string): string {
  const value = pathInput.trim();
  if (!value) {
    throw new Error("Missing extension path.");
  }
  if (
    /^[a-z][a-z0-9+.-]*:/i.test(value) ||
    value.startsWith("/") ||
    value.includes("\\") ||
    value.includes("..")
  ) {
    throw new Error("Invalid extension path.");
  }

  const parsed = new URL(value, "https://extension.invalid/");
  const fileName = parsed.pathname.replace(/^\//, "");
  if (parsed.hash) {
    throw new Error("Invalid extension path.");
  }

  if (fileName === "dashboard.html") {
    const params: string[] = [];
    let viewCount = 0;
    parsed.searchParams.forEach((_, key) => {
      params.push(key);
      if (key === "view") {
        viewCount += 1;
      }
    });
    if (params.some((key) => key !== "view")) {
      throw new Error("Invalid dashboard path.");
    }
    if (viewCount > 1) {
      throw new Error("Invalid dashboard path.");
    }
    const view = parsed.searchParams.get("view");
    if (view && !ALLOWED_DASHBOARD_VIEWS.has(view)) {
      throw new Error("Invalid dashboard view.");
    }
    return view ? `dashboard.html?view=${view}` : "dashboard.html";
  }

  if (fileName === "database.html") {
    if (parsed.searchParams.size > 0) {
      throw new Error("Invalid database path.");
    }
    return "database.html";
  }

  throw new Error("Unknown extension path.");
}
