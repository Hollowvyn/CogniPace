/** Runtime message validation and sender authorization safeguards. */
import { assertImportPayloadShape } from "../../data/importexport/backup";
import { isProblemPage, normalizeSlug, slugToUrl } from "../../domain/problem/slug";

import { MessageType, RuntimeMessage } from "./contracts";

const MESSAGE_TYPES = {
  UPSERT_PROBLEM_FROM_PAGE: true,
  GET_PROBLEM_CONTEXT: true,
  RATE_PROBLEM: true,
  SAVE_REVIEW_RESULT: true,
  OPEN_EXTENSION_PAGE: true,
  OPEN_PROBLEM_PAGE: true,
  UPDATE_NOTES: true,
  UPDATE_TAGS: true,
  GET_TODAY_QUEUE: true,
  GET_DASHBOARD_DATA: true,
  GET_APP_SHELL_DATA: true,
  SWITCH_ACTIVE_COURSE: true,
  SET_ACTIVE_COURSE_CHAPTER: true,
  TRACK_COURSE_QUESTION_LAUNCH: true,
  IMPORT_CURATED_SET: true,
  IMPORT_CUSTOM_SET: true,
  EXPORT_DATA: true,
  IMPORT_DATA: true,
  UPDATE_SETTINGS: true,
  ADD_PROBLEM_BY_INPUT: true,
  ADD_PROBLEM_TO_COURSE: true,
  SUSPEND_PROBLEM: true,
  RESET_PROBLEM_SCHEDULE: true,
} satisfies Record<MessageType, true>;

const CONTENT_SCRIPT_MESSAGE_TYPES = new Set<MessageType>([
  "UPSERT_PROBLEM_FROM_PAGE",
  "GET_PROBLEM_CONTEXT",
  "SAVE_REVIEW_RESULT",
  "OPEN_EXTENSION_PAGE",
]);

const ALLOWED_DASHBOARD_VIEWS = new Set([
  "dashboard",
  "courses",
  "library",
  "analytics",
  "settings",
]);

const EMPTY_KEYS: readonly string[] = [];
const SETTINGS_KEYS = [
  "dailyNewLimit",
  "dailyReviewLimit",
  "reviewOrder",
  "studyMode",
  "activeCourseId",
  "setsEnabled",
  "requireSolveTime",
  "autoDetectSolved",
  "notifications",
  "quietHours",
  "activeStudyPlanId",
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

function validateQuietHours(value: unknown): void {
  if (!isRecord(value)) {
    throw new Error('Invalid field "quietHours": expected an object.');
  }
  hasExactKeys(value, ["startHour", "endHour"], 'Field "quietHours"');
  requireOptionalFiniteNumber(value.startHour, "quietHours.startHour");
  requireOptionalFiniteNumber(value.endHour, "quietHours.endHour");
}

function validateSetsEnabled(value: unknown): void {
  if (!isRecord(value)) {
    throw new Error('Invalid field "setsEnabled": expected an object.');
  }
  for (const [key, enabled] of Object.entries(value)) {
    if (typeof enabled !== "boolean") {
      throw new Error(`Invalid field "setsEnabled.${key}": expected a boolean.`);
    }
  }
}

function validateCustomSetItems(value: unknown): void {
  if (!Array.isArray(value)) {
    throw new Error('Invalid field "items": expected an array.');
  }

  for (const item of value) {
    if (!isRecord(item)) {
      throw new Error('Invalid field "items": expected object entries.');
    }
    hasExactKeys(item, ["slug", "title", "difficulty", "tags"], 'Field "items[]"');
    requireString(item.slug, "items[].slug");
    requireOptionalString(item.title, "items[].title");
    requireOptionalDifficulty(item.difficulty, "items[].difficulty");
    requireOptionalStringArray(item.tags, "items[].tags");
  }
}

function validatePayload(type: MessageType, payload: UnknownRecord): void {
  switch (type) {
    case "UPSERT_PROBLEM_FROM_PAGE":
      hasExactKeys(
        payload,
        ["slug", "title", "difficulty", "url", "topics", "solvedDetected"],
        `Payload for ${type}`
      );
      requireString(payload.slug, "slug");
      requireOptionalString(payload.title, "title");
      requireOptionalDifficulty(payload.difficulty, "difficulty");
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
      hasExactKeys(
        payload,
        ["slug", "rating", "solveTimeMs", "mode", "notes", "courseId", "chapterId", "source"],
        `Payload for ${type}`
      );
      requireString(payload.slug, "slug");
      requireRating(payload.rating, "rating");
      requireOptionalFiniteNumber(payload.solveTimeMs, "solveTimeMs");
      requireOptionalReviewMode(payload.mode, "mode");
      requireOptionalString(payload.notes, "notes");
      requireOptionalString(payload.courseId, "courseId");
      requireOptionalString(payload.chapterId, "chapterId");
      if (
        payload.source !== undefined &&
        payload.source !== "overlay" &&
        payload.source !== "dashboard"
      ) {
        throw new Error('Invalid field "source": expected "overlay" or "dashboard".');
      }
      return;
    case "OPEN_EXTENSION_PAGE":
      hasExactKeys(payload, ["path"], `Payload for ${type}`);
      requireString(payload.path, "path");
      return;
    case "OPEN_PROBLEM_PAGE":
      hasExactKeys(payload, ["slug", "courseId", "chapterId"], `Payload for ${type}`);
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
    case "EXPORT_DATA":
      hasExactKeys(payload, EMPTY_KEYS, `Payload for ${type}`);
      return;
    case "SWITCH_ACTIVE_COURSE":
      hasExactKeys(payload, ["courseId"], `Payload for ${type}`);
      requireString(payload.courseId, "courseId");
      return;
    case "SET_ACTIVE_COURSE_CHAPTER":
      hasExactKeys(payload, ["courseId", "chapterId"], `Payload for ${type}`);
      requireString(payload.courseId, "courseId");
      requireString(payload.chapterId, "chapterId");
      return;
    case "TRACK_COURSE_QUESTION_LAUNCH":
      hasExactKeys(payload, ["slug", "courseId", "chapterId"], `Payload for ${type}`);
      requireString(payload.slug, "slug");
      requireOptionalString(payload.courseId, "courseId");
      requireOptionalString(payload.chapterId, "chapterId");
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
      requireOptionalFiniteNumber(payload.dailyNewLimit, "dailyNewLimit");
      requireOptionalFiniteNumber(payload.dailyReviewLimit, "dailyReviewLimit");
      requireOptionalReviewOrder(payload.reviewOrder, "reviewOrder");
      requireOptionalStudyMode(payload.studyMode, "studyMode");
      requireOptionalString(payload.activeCourseId, "activeCourseId");
      requireOptionalString(payload.activeStudyPlanId, "activeStudyPlanId");
      requireOptionalBoolean(payload.requireSolveTime, "requireSolveTime");
      requireOptionalBoolean(payload.autoDetectSolved, "autoDetectSolved");
      requireOptionalBoolean(payload.notifications, "notifications");
      if (payload.quietHours !== undefined) {
        validateQuietHours(payload.quietHours);
      }
      if (payload.setsEnabled !== undefined) {
        validateSetsEnabled(payload.setsEnabled);
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
    case "ADD_PROBLEM_TO_COURSE":
      hasExactKeys(
        payload,
        ["courseId", "chapterId", "input", "markAsStarted"],
        `Payload for ${type}`
      );
      requireString(payload.courseId, "courseId");
      requireString(payload.chapterId, "chapterId");
      requireString(payload.input, "input");
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
    return;
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
  if (/^[a-z][a-z0-9+.-]*:/i.test(value) || value.startsWith("/") || value.includes("\\") || value.includes("..")) {
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
