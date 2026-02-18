import { summarizeAnalytics } from "./shared/analytics";
import { getCuratedSet, listCuratedSetNames } from "./shared/curatedSets";
import { buildTodayQueue } from "./shared/queue";
import {
  ensureProblem,
  ensureStudyState,
  importProblemsIntoSet,
  normalizeDifficulty,
  parseProblemInput
} from "./shared/repository";
import { applyReview, resetSchedule } from "./shared/scheduler";
import { RuntimeResponse } from "./shared/runtime";
import { getAppData, mergeSettings, mutateAppData } from "./shared/storage";
import { ExportPayload, MessageType, RuntimeMessage, StudyState } from "./shared/types";
import { normalizeSlug, nowIso, slugToTitle, slugToUrl, uniqueStrings } from "./shared/utils";

function ok<T>(data: T): RuntimeResponse<T> {
  return { ok: true, data };
}

function fail(error: unknown): RuntimeResponse<never> {
  const message = error instanceof Error ? error.message : "Unknown error";
  return { ok: false, error: message };
}

async function upsertFromPage(payload: {
  slug: string;
  title?: string;
  difficulty?: string;
  url?: string;
  topics?: string[];
}): Promise<RuntimeResponse> {
  const updated = await mutateAppData((data) => {
    const problem = ensureProblem(data, {
      slug: payload.slug,
      title: payload.title,
      difficulty: normalizeDifficulty(payload.difficulty),
      url: payload.url,
      topics: payload.topics
    });

    const state = ensureStudyState(data, payload.slug);

    return {
      ...data,
      problemsBySlug: {
        ...data.problemsBySlug,
        [problem.leetcodeSlug]: problem
      },
      studyStatesBySlug: {
        ...data.studyStatesBySlug,
        [problem.leetcodeSlug]: state
      }
    };
  });

  const slug = payload.slug.toLowerCase();
  return ok({
    problem: updated.problemsBySlug[slug],
    studyState: updated.studyStatesBySlug[slug]
  });
}

async function getProblemContext(payload: { slug: string }): Promise<RuntimeResponse> {
  const data = await getAppData();
  const slug = payload.slug.toLowerCase();
  const problem = data.problemsBySlug[slug];
  const studyState = data.studyStatesBySlug[slug];

  if (!problem) {
    return ok({ problem: null, studyState: null });
  }

  return ok({
    problem,
    studyState: studyState ?? null
  });
}

async function rateProblem(payload: {
  slug: string;
  rating: 0 | 1 | 2 | 3;
  solveTimeMs?: number;
  mode?: "RECALL" | "FULL_SOLVE";
  notesSnapshot?: string;
}): Promise<RuntimeResponse> {
  const updated = await mutateAppData((data) => {
    const problem = ensureProblem(data, { slug: payload.slug });
    const current = ensureStudyState(data, payload.slug);

    const nextState = applyReview({
      state: current,
      rating: payload.rating,
      solveTimeMs: payload.solveTimeMs,
      mode: payload.mode,
      notesSnapshot: payload.notesSnapshot,
      settings: data.settings
    });

    data.studyStatesBySlug[problem.leetcodeSlug] = nextState;
    return data;
  });

  const slug = payload.slug.toLowerCase();
  const nextState = updated.studyStatesBySlug[slug];

  return ok({
    studyState: nextState,
    nextReviewAt: nextState.nextReviewAt,
    status: nextState.status,
    lastRating: nextState.lastRating
  });
}

async function updateNotes(payload: { slug: string; notes: string }): Promise<RuntimeResponse> {
  const updated = await mutateAppData((data) => {
    ensureProblem(data, { slug: payload.slug });
    const state = ensureStudyState(data, payload.slug);
    state.notes = payload.notes;
    data.studyStatesBySlug[payload.slug.toLowerCase()] = state;
    return data;
  });

  return ok({ studyState: updated.studyStatesBySlug[payload.slug.toLowerCase()] });
}

async function updateTags(payload: { slug: string; tags: string[] }): Promise<RuntimeResponse> {
  const updated = await mutateAppData((data) => {
    ensureProblem(data, { slug: payload.slug });
    const state = ensureStudyState(data, payload.slug);
    state.tags = payload.tags.map((tag) => tag.trim()).filter(Boolean);
    data.studyStatesBySlug[payload.slug.toLowerCase()] = state;
    return data;
  });

  return ok({ studyState: updated.studyStatesBySlug[payload.slug.toLowerCase()] });
}

async function getQueue(): Promise<RuntimeResponse> {
  const data = await getAppData();
  return ok(buildTodayQueue(data));
}

async function getDashboardData(): Promise<RuntimeResponse> {
  const data = await getAppData();
  const queue = buildTodayQueue(data);
  const analytics = summarizeAnalytics(data);
  const problems = Object.values(data.problemsBySlug)
    .map((problem) => ({
      problem,
      studyState: data.studyStatesBySlug[problem.leetcodeSlug] ?? null
    }))
    .sort((a, b) => a.problem.title.localeCompare(b.problem.title));

  return ok({
    problems,
    queue,
    analytics,
    settings: data.settings,
    curatedSetNames: listCuratedSetNames()
  });
}

async function importCurated(payload: { setName: string }): Promise<RuntimeResponse> {
  const setProblems = getCuratedSet(payload.setName);
  if (setProblems.length === 0) {
    throw new Error(`Unknown curated set: ${payload.setName}`);
  }

  let importResult = { added: 0, updated: 0 };

  await mutateAppData((data) => {
    importResult = importProblemsIntoSet(data, payload.setName, setProblems);
    data.settings = mergeSettings(data.settings, {
      setsEnabled: {
        ...data.settings.setsEnabled,
        [payload.setName]: true
      }
    });
    return data;
  });

  return ok({
    setName: payload.setName,
    count: setProblems.length,
    added: importResult.added,
    updated: importResult.updated
  });
}

async function importCustom(payload: {
  setName?: string;
  items: Array<{ slug: string; title?: string; difficulty?: "Easy" | "Medium" | "Hard" | "Unknown"; tags?: string[] }>;
}): Promise<RuntimeResponse> {
  if (!Array.isArray(payload.items) || payload.items.length === 0) {
    throw new Error("Custom set import requires at least one item.");
  }

  const normalizedName = payload.setName?.trim() || "Custom";
  let importResult = { added: 0, updated: 0 };

  await mutateAppData((data) => {
    importResult = importProblemsIntoSet(data, normalizedName, payload.items);
    data.settings = mergeSettings(data.settings, {
      setsEnabled: {
        ...data.settings.setsEnabled,
        [normalizedName]: true,
        Custom: true
      }
    });
    return data;
  });

  return ok({
    setName: normalizedName,
    count: payload.items.length,
    added: importResult.added,
    updated: importResult.updated
  });
}

async function exportData(): Promise<RuntimeResponse<ExportPayload>> {
  const data = await getAppData();
  return ok({
    problems: Object.values(data.problemsBySlug),
    studyStatesBySlug: data.studyStatesBySlug,
    settings: data.settings
  });
}

function normalizeImportedState(state: StudyState): StudyState {
  return {
    ...state,
    tags: Array.isArray(state.tags) ? state.tags : [],
    attemptHistory: Array.isArray(state.attemptHistory) ? state.attemptHistory : [],
    reviewCount: Number.isFinite(state.reviewCount) ? state.reviewCount : 0,
    lapses: Number.isFinite(state.lapses) ? state.lapses : 0,
    ease: Number.isFinite(state.ease) ? state.ease : 2.5,
    intervalDays: Number.isFinite(state.intervalDays) ? state.intervalDays : 0,
    status: state.status ?? "NEW"
  };
}

async function importData(payload: ExportPayload): Promise<RuntimeResponse> {
  if (!Array.isArray(payload.problems)) {
    throw new Error("Invalid import format: problems must be an array.");
  }

  await mutateAppData((data) => {
    data.problemsBySlug = {};

    for (const problem of payload.problems) {
      const slug = normalizeSlug(problem.leetcodeSlug);
      if (!slug) {
        continue;
      }

      const now = nowIso();
      data.problemsBySlug[slug] = {
        id: problem.id || slug,
        leetcodeSlug: slug,
        leetcodeId: problem.leetcodeId,
        title: problem.title?.trim() || slugToTitle(slug),
        difficulty: problem.difficulty ?? "Unknown",
        url: problem.url || slugToUrl(slug),
        topics: uniqueStrings(problem.topics ?? []),
        sourceSet: uniqueStrings(problem.sourceSet ?? []),
        createdAt: problem.createdAt || now,
        updatedAt: problem.updatedAt || now
      };
    }

    data.studyStatesBySlug = {};
    for (const [slug, state] of Object.entries(payload.studyStatesBySlug ?? {})) {
      data.studyStatesBySlug[slug.toLowerCase()] = normalizeImportedState(state);
    }

    data.settings = mergeSettings(data.settings, payload.settings ?? {});
    return data;
  });

  return ok({ imported: true });
}

async function updateSettings(payload: Record<string, unknown>): Promise<RuntimeResponse> {
  const updated = await mutateAppData((data) => {
    data.settings = mergeSettings(data.settings, payload);
    return data;
  });

  return ok({ settings: updated.settings });
}

async function addProblemByInput(payload: { input: string; sourceSet?: string }): Promise<RuntimeResponse> {
  const parsed = parseProblemInput(payload.input);
  const updated = await mutateAppData((data) => {
    const problem = ensureProblem(data, {
      slug: parsed.slug,
      url: parsed.url,
      sourceSet: payload.sourceSet
    });
    const state = ensureStudyState(data, parsed.slug);

    return {
      ...data,
      problemsBySlug: {
        ...data.problemsBySlug,
        [problem.leetcodeSlug]: problem
      },
      studyStatesBySlug: {
        ...data.studyStatesBySlug,
        [problem.leetcodeSlug]: state
      }
    };
  });

  return ok({
    slug: parsed.slug,
    problem: updated.problemsBySlug[parsed.slug],
    studyState: updated.studyStatesBySlug[parsed.slug]
  });
}

async function suspendProblem(payload: { slug: string; suspend: boolean }): Promise<RuntimeResponse> {
  const updated = await mutateAppData((data) => {
    ensureProblem(data, { slug: payload.slug });
    const state = ensureStudyState(data, payload.slug);
    state.status = payload.suspend ? "SUSPENDED" : "LEARNING";
    data.studyStatesBySlug[payload.slug.toLowerCase()] = state;
    return data;
  });

  return ok({ studyState: updated.studyStatesBySlug[payload.slug.toLowerCase()] });
}

async function resetProblem(payload: { slug: string; keepNotes?: boolean }): Promise<RuntimeResponse> {
  const updated = await mutateAppData((data) => {
    ensureProblem(data, { slug: payload.slug });
    const state = data.studyStatesBySlug[payload.slug.toLowerCase()];
    data.studyStatesBySlug[payload.slug.toLowerCase()] = resetSchedule(state, payload.keepNotes ?? true);
    return data;
  });

  return ok({ studyState: updated.studyStatesBySlug[payload.slug.toLowerCase()] });
}

async function handleMessage(message: RuntimeMessage): Promise<RuntimeResponse> {
  switch (message.type as MessageType) {
    case "UPSERT_PROBLEM_FROM_PAGE":
      return upsertFromPage(message.payload as Parameters<typeof upsertFromPage>[0]);
    case "GET_PROBLEM_CONTEXT":
      return getProblemContext(message.payload as Parameters<typeof getProblemContext>[0]);
    case "RATE_PROBLEM":
      return rateProblem(message.payload as Parameters<typeof rateProblem>[0]);
    case "UPDATE_NOTES":
      return updateNotes(message.payload as Parameters<typeof updateNotes>[0]);
    case "UPDATE_TAGS":
      return updateTags(message.payload as Parameters<typeof updateTags>[0]);
    case "GET_TODAY_QUEUE":
      return getQueue();
    case "GET_DASHBOARD_DATA":
      return getDashboardData();
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
      return addProblemByInput(message.payload as Parameters<typeof addProblemByInput>[0]);
    case "SUSPEND_PROBLEM":
      return suspendProblem(message.payload as Parameters<typeof suspendProblem>[0]);
    case "RESET_PROBLEM_SCHEDULE":
      return resetProblem(message.payload as Parameters<typeof resetProblem>[0]);
    default:
      return fail(`Unknown message type: ${(message as RuntimeMessage).type}`);
  }
}

function inQuietHours(startHour: number, endHour: number, currentHour: number): boolean {
  if (startHour === endHour) {
    return false;
  }

  if (startHour < endHour) {
    return currentHour >= startHour && currentHour < endHour;
  }

  return currentHour >= startHour || currentHour < endHour;
}

async function maybeNotifyDueQueue(): Promise<void> {
  const data = await getAppData();
  if (!data.settings.notifications) {
    return;
  }

  const now = new Date();
  const hour = now.getHours();
  if (inQuietHours(data.settings.quietHours.startHour, data.settings.quietHours.endHour, hour)) {
    return;
  }

  const queue = buildTodayQueue(data, now);
  if (queue.dueCount <= 0) {
    return;
  }

  await chrome.notifications.create("leetcode-spaced-repetition-due", {
    type: "basic",
    iconUrl: "icons/icon-128.png",
    title: "LeetCode reviews due",
    message: `You have ${queue.dueCount} review${queue.dueCount === 1 ? "" : "s"} due today.`
  });
}

chrome.runtime.onInstalled.addListener(async () => {
  await mutateAppData((data) => ({ ...data }));
  chrome.alarms.create("due-check", { periodInMinutes: 60 });
});

chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create("due-check", { periodInMinutes: 60 });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "due-check") {
    void maybeNotifyDueQueue();
  }
});

chrome.runtime.onMessage.addListener((message: RuntimeMessage, _sender, sendResponse) => {
  void handleMessage(message)
    .then((response) => sendResponse(response))
    .catch((error) => sendResponse(fail(error)));
  return true;
});
