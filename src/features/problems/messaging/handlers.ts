/** Background handlers for problem-context, review-session, and page actions. */
import {
  createInitialUserSettings,
  getUserSettings,
} from "@features/settings/server";
import {ReviewLogFields} from "@features/study";
import {
  appendAttempt,
  clearAttempts,
  ensureStudyState,
  getStudyState,
  replaceLastAttempt,
  upsertStudyState,
} from "@features/study/server";
import {applyReview, overrideLastReview, resetSchedule,} from "@libs/fsrs/scheduler";
import {getStudyStateSummary, normalizeReviewLogFields,} from "@libs/fsrs/studyState";
import {canonicalProblemUrlForOpen,} from "@libs/runtime-rpc/validator";
import { getDb } from "@platform/db/instance";
import {
  asProblemSlug,
  asTrackGroupId,
  asTrackId,
} from "@shared/ids";

import {nowIso} from "../../../domain/common/time";
import { setActiveFocusHandler } from "../../../extension/background/handlers/v7Handlers";
import {ok} from "../../../extension/background/responses";
import { getProblem, importProblem } from "../data/datasource/ProblemDataSource";
import { normalizeDifficulty } from "../data/repository/ProblemRepository";
import {isProblemPage, normalizeSlug} from "../domain/model";

function readSenderUrl(
  sender?: chrome.runtime.MessageSender
): string | undefined {
  if (typeof sender?.url === "string") {
    return sender.url;
  }

  if (typeof sender?.tab?.url === "string") {
    return sender.tab.url;
  }

  return undefined;
}

/** Opens a LeetCode problem page and optionally records course launch context. */
export async function openProblemPage(
  payload: {
    slug: string;
    courseId?: string;
    chapterId?: string;
  },
  sender?: chrome.runtime.MessageSender
) {
  const slug = normalizeSlug(payload.slug);
  if (!slug) {
    throw new Error("Invalid slug.");
  }

  // Launched from a track context: update the user's "where am I"
  // pointer (settings.activeFocus) so the next dashboard render lands
  // on this chapter. Charter — there's no separate progress aggregate
  // any more; settings owns the focus.
  if (payload.courseId && payload.chapterId) {
    await setActiveFocusHandler({
      focus: {
        kind: "track",
        id: asTrackId(payload.courseId),
        groupId: asTrackGroupId(payload.chapterId),
      },
    });
  }

  const url = canonicalProblemUrlForOpen(slug);
  const senderUrl = readSenderUrl(sender);
  const senderTabId = sender?.tab?.id;
  const shouldReuseSenderTab =
    typeof senderTabId === "number" &&
    !!senderUrl &&
    isProblemPage(senderUrl);

  if (shouldReuseSenderTab) {
    await chrome.tabs.update(senderTabId, {url});
  } else {
    await chrome.tabs.create({url});
  }

  return ok({opened: true});
}

/** Upserts the current problem page into storage from detected page metadata. */
export async function upsertFromPage(payload: {
  slug: string;
  title?: string;
  difficulty?: string;
  isPremium?: boolean;
  url?: string;
  topics?: string[];
}) {
  const slug = normalizeSlug(payload.slug);
  if (!slug) {
    throw new Error("Invalid slug.");
  }
  // Phase 5: SQLite owns problem + studyState writes. importProblem
  // preserves sticky user-edits while accepting page-detect updates;
  // ensureStudyState materialises a default state row if this is the
  // user's first encounter with the problem.
  const { db } = await getDb();
  const branded = asProblemSlug(slug);
  const difficulty = normalizeDifficulty(payload.difficulty);
  const problem = await importProblem(db, {
    slug,
    ...(payload.title !== undefined ? { title: payload.title } : {}),
    ...(difficulty !== undefined ? { difficulty } : {}),
    ...(payload.isPremium !== undefined ? { isPremium: payload.isPremium } : {}),
    ...(payload.url !== undefined ? { url: payload.url } : {}),
  });
  const studyState = await ensureStudyState(db, branded);
  return ok({ problem, studyState });
}

/** Fetches the persisted problem and study-state context for a slug. */
export async function getProblemContext(payload: { slug: string }) {
  const slug = normalizeSlug(payload.slug);
  if (!slug) {
    return ok({problem: null, studyState: null});
  }
  // Phase 5: SQLite is the SSoT for problem + study state. Reading
  // from data.problemsBySlug / data.studyStatesBySlug would return
  // null (those fields are dormant in the v7 blob), so the overlay
  // would render "NO SUBMISSIONS YET" even when attempts exist.
  const { db } = await getDb();
  const branded = asProblemSlug(slug);
  const problem = await getProblem(db, branded);
  const studyState = await getStudyState(db, branded);
  return ok({
    problem: problem ?? null,
    studyState: studyState ?? null,
  });
}

function buildReviewLogFields(
  payload: Partial<ReviewLogFields>,
  current: ReviewLogFields
): ReviewLogFields {
  return normalizeReviewLogFields({
    interviewPattern:
      payload.interviewPattern ?? current.interviewPattern,
    timeComplexity: payload.timeComplexity ?? current.timeComplexity,
    spaceComplexity: payload.spaceComplexity ?? current.spaceComplexity,
    languages: payload.languages ?? current.languages,
    notes: payload.notes ?? current.notes,
  });
}

/** Persists a completed review result and returns the next scheduling summary. */
export async function saveReviewResult(payload: {
  slug: string;
  rating: 0 | 1 | 2 | 3;
  solveTimeMs?: number;
  mode?: "RECALL" | "FULL_SOLVE";
  interviewPattern?: string;
  timeComplexity?: string;
  spaceComplexity?: string;
  languages?: string;
  notes?: string;
  courseId?: string;
  chapterId?: string;
}) {
  const normalized = normalizeSlug(payload.slug);
  if (!normalized) {
    throw new Error("Invalid slug.");
  }

  const now = nowIso();
  const { db } = await getDb();
  const branded = asProblemSlug(normalized);
  const problem = await importProblem(db, { slug: normalized });
  const current = await ensureStudyState(db, branded);
  const logSnapshot = buildReviewLogFields(payload, current);
  const settings = (await getUserSettings(db)) ?? createInitialUserSettings();
  const nextState = applyReview({
    state: current,
    difficulty: problem.difficulty,
    rating: payload.rating,
    solveTimeMs: payload.solveTimeMs,
    mode: payload.mode,
    logSnapshot,
    settings,
    now,
  });
  await upsertStudyState(db, branded, nextState);
  // applyReview appended one new entry at the tail of attemptHistory;
  // persist that to attempt_history.
  const newAttempt = nextState.attemptHistory[nextState.attemptHistory.length - 1];
  if (newAttempt) {
    await appendAttempt(db, branded, newAttempt);
  }
  // The user reviewed from a track context — pin activeFocus to that
  // chapter so the next dashboard render lands here.
  if (payload.courseId && payload.chapterId) {
    await setActiveFocusHandler({
      focus: {
        kind: "track",
        id: asTrackId(payload.courseId),
        groupId: asTrackGroupId(payload.chapterId),
      },
    });
  }
  const studyStateSummary = getStudyStateSummary(nextState);
  return ok({
    studyState: nextState,
    nextReviewAt: studyStateSummary.nextReviewAt,
    phase: studyStateSummary.phase,
    lastRating: nextState.lastRating,
  });
}

/** Persists the overlay's structured log draft without mutating review history. */
export async function saveOverlayLogDraft(payload: {
  slug: string;
  interviewPattern?: string;
  timeComplexity?: string;
  spaceComplexity?: string;
  languages?: string;
  notes?: string;
}) {
  const normalized = normalizeSlug(payload.slug);
  if (!normalized) {
    throw new Error("Invalid slug.");
  }

  const { db } = await getDb();
  const branded = asProblemSlug(normalized);
  await importProblem(db, { slug: normalized });
  const current = await ensureStudyState(db, branded);
  const nextLogFields = buildReviewLogFields(payload, current);
  const next = { ...current, ...nextLogFields };
  const saved = await upsertStudyState(db, branded, next);
  return ok({ studyState: saved });
}

/** Replaces the latest review result and rebuilds the schedule from history. */
export async function overrideLastReviewResult(payload: {
  slug: string;
  rating: 0 | 1 | 2 | 3;
  solveTimeMs?: number;
  mode?: "RECALL" | "FULL_SOLVE";
  interviewPattern?: string;
  timeComplexity?: string;
  spaceComplexity?: string;
  languages?: string;
  notes?: string;
  courseId?: string;
  chapterId?: string;
}) {
  const normalized = normalizeSlug(payload.slug);
  if (!normalized) {
    throw new Error("Invalid slug.");
  }

  const now = nowIso();
  const { db } = await getDb();
  const branded = asProblemSlug(normalized);
  await importProblem(db, { slug: normalized });
  const current = await ensureStudyState(db, branded);
  const logSnapshot = buildReviewLogFields(payload, current);
  const settings = (await getUserSettings(db)) ?? createInitialUserSettings();
  const nextState = overrideLastReview({
    state: current,
    rating: payload.rating,
    solveTimeMs: payload.solveTimeMs,
    mode: payload.mode,
    logSnapshot,
    settings,
    now,
  });
  await upsertStudyState(db, branded, nextState);
  // overrideLastReview replaced the tail entry rather than appending —
  // mirror that in attempt_history.
  const replacedAttempt =
    nextState.attemptHistory[nextState.attemptHistory.length - 1];
  if (replacedAttempt) {
    await replaceLastAttempt(db, branded, replacedAttempt);
  }
  if (payload.courseId && payload.chapterId) {
    await setActiveFocusHandler({
      focus: {
        kind: "track",
        id: asTrackId(payload.courseId),
        groupId: asTrackGroupId(payload.chapterId),
      },
    });
  }
  const studyStateSummary = getStudyStateSummary(nextState);
  return ok({
    studyState: nextState,
    nextReviewAt: studyStateSummary.nextReviewAt,
    phase: studyStateSummary.phase,
    lastRating: nextState.lastRating,
  });
}

/** Handles the deprecated rating message by forwarding to the canonical save-review flow. */
export async function rateProblem(payload: {
  slug: string;
  rating: 0 | 1 | 2 | 3;
  solveTimeMs?: number;
  mode?: "RECALL" | "FULL_SOLVE";
  notesSnapshot?: string;
}) {
  return saveReviewResult({
    slug: payload.slug,
    rating: payload.rating,
    solveTimeMs: payload.solveTimeMs,
    mode: payload.mode,
    notes: payload.notesSnapshot,
  });
}

/** Updates the saved notes for a specific problem. */
export async function updateNotes(payload: { slug: string; notes: string }) {
  const normalized = normalizeSlug(payload.slug);
  if (!normalized) {
    throw new Error("Invalid slug.");
  }
  const { db } = await getDb();
  const branded = asProblemSlug(normalized);
  await importProblem(db, { slug: normalized });
  const current = await ensureStudyState(db, branded);
  const saved = await upsertStudyState(db, branded, {
    ...current,
    notes: payload.notes,
  });
  return ok({ studyState: saved });
}

/** Updates the saved tags for a specific problem. */
export async function updateTags(payload: { slug: string; tags: string[] }) {
  const normalized = normalizeSlug(payload.slug);
  if (!normalized) {
    throw new Error("Invalid slug.");
  }
  const { db } = await getDb();
  const branded = asProblemSlug(normalized);
  await importProblem(db, { slug: normalized });
  const current = await ensureStudyState(db, branded);
  const saved = await upsertStudyState(db, branded, {
    ...current,
    tags: payload.tags.map((tag) => tag.trim()).filter(Boolean),
  });
  return ok({ studyState: saved });
}

/** Suspends or unsuspends a problem in the scheduler. */
export async function suspendProblem(payload: {
  slug: string;
  suspend: boolean;
}) {
  const normalized = normalizeSlug(payload.slug);
  if (!normalized) {
    throw new Error("Invalid slug.");
  }
  const { db } = await getDb();
  const branded = asProblemSlug(normalized);
  await importProblem(db, { slug: normalized });
  const current = await ensureStudyState(db, branded);
  const saved = await upsertStudyState(db, branded, {
    ...current,
    suspended: payload.suspend,
  });
  return ok({ studyState: saved });
}

/** Resets the schedule for a specific problem while optionally preserving notes. */
export async function resetProblem(payload: {
  slug: string;
  keepNotes?: boolean;
}) {
  const normalized = normalizeSlug(payload.slug);
  if (!normalized) {
    throw new Error("Invalid slug.");
  }
  const { db } = await getDb();
  const branded = asProblemSlug(normalized);
  await importProblem(db, { slug: normalized });
  const existing = await getStudyState(db, branded);
  const reset = resetSchedule(existing, payload.keepNotes ?? true);
  // Wipe attempt_history first — a reset means "start over"; the
  // matching v7 semantics drop the prior log entries.
  await clearAttempts(db, branded);
  const saved = await upsertStudyState(db, branded, reset);
  return ok({ studyState: saved });
}
