/** Background handlers for problem-context, review-session, and page actions. */
import {
  getAppData,
  mutateAppData,
} from "../../../data/repositories/appDataRepository";
import {
  ensureProblem,
  ensureStudyState,
  normalizeDifficulty,
} from "../../../data/repositories/problemRepository";
import { nowIso } from "../../../domain/common/time";
import {
  markCourseQuestionLaunched,
  syncCourseProgress,
} from "../../../domain/courses/courseProgress";
import { applyReview, resetSchedule } from "../../../domain/fsrs/scheduler";
import { getStudyStateSummary } from "../../../domain/fsrs/studyState";
import { normalizeSlug } from "../../../domain/problem/slug";
import {
  canonicalProblemUrlForOpen,
} from "../../runtime/validator";
import { ok } from "../responses";

import { trackCourseQuestionLaunch } from "./courseHandlers";

/** Opens a LeetCode problem page and optionally records course launch context. */
export async function openProblemPage(payload: {
  slug: string;
  courseId?: string;
  chapterId?: string;
}) {
  const slug = normalizeSlug(payload.slug);
  if (!slug) {
    throw new Error("Invalid slug.");
  }

  if (payload.courseId || payload.chapterId) {
    await trackCourseQuestionLaunch({
      slug,
      courseId: payload.courseId,
      chapterId: payload.chapterId,
    });
  }

  await chrome.tabs.create({ url: canonicalProblemUrlForOpen(slug) });
  return ok({ opened: true });
}

/** Upserts the current problem page into storage from detected page metadata. */
export async function upsertFromPage(payload: {
  slug: string;
  title?: string;
  difficulty?: string;
  url?: string;
  topics?: string[];
}) {
  const updated = await mutateAppData((data) => {
    const problem = ensureProblem(data, {
      slug: payload.slug,
      title: payload.title,
      difficulty: normalizeDifficulty(payload.difficulty),
      url: payload.url,
      topics: payload.topics,
    });

    const state = ensureStudyState(data, payload.slug);
    syncCourseProgress(data);

    return {
      ...data,
      problemsBySlug: {
        ...data.problemsBySlug,
        [problem.leetcodeSlug]: problem,
      },
      studyStatesBySlug: {
        ...data.studyStatesBySlug,
        [problem.leetcodeSlug]: state,
      },
    };
  });

  const slug = normalizeSlug(payload.slug);
  if (!slug) {
    throw new Error("Invalid slug.");
  }

  return ok({
    problem: updated.problemsBySlug[slug],
    studyState: updated.studyStatesBySlug[slug],
  });
}

/** Fetches the persisted problem and study-state context for a slug. */
export async function getProblemContext(payload: { slug: string }) {
  const data = await getAppData();
  const slug = normalizeSlug(payload.slug);
  if (!slug) {
    return ok({ problem: null, studyState: null });
  }

  return ok({
    problem: data.problemsBySlug[slug] ?? null,
    studyState: data.studyStatesBySlug[slug] ?? null,
  });
}

/** Persists a completed review result and returns the next scheduling summary. */
export async function saveReviewResult(payload: {
  slug: string;
  rating: 0 | 1 | 2 | 3;
  solveTimeMs?: number;
  mode?: "RECALL" | "FULL_SOLVE";
  notes?: string;
  courseId?: string;
  chapterId?: string;
}) {
  const normalized = normalizeSlug(payload.slug);
  if (!normalized) {
    throw new Error("Invalid slug.");
  }

  const now = nowIso();
  const updated = await mutateAppData((data) => {
    const problem = ensureProblem(data, { slug: normalized });
    const current = ensureStudyState(data, normalized);

    const nextState = applyReview({
      state: current,
      difficulty: problem.difficulty,
      rating: payload.rating,
      solveTimeMs: payload.solveTimeMs,
      mode: payload.mode,
      notesSnapshot: payload.notes ?? current.notes,
      settings: data.settings,
      now,
    });

    if (typeof payload.notes === "string") {
      nextState.notes = payload.notes;
    }

    data.studyStatesBySlug[problem.leetcodeSlug] = nextState;
    markCourseQuestionLaunched(
      data,
      normalized,
      now,
      payload.courseId,
      payload.chapterId
    );
    syncCourseProgress(data, now);
    return data;
  });

  const nextState = updated.studyStatesBySlug[normalized];
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

  const updated = await mutateAppData((data) => {
    ensureProblem(data, { slug: normalized });
    const state = ensureStudyState(data, normalized);
    state.notes = payload.notes;
    data.studyStatesBySlug[normalized] = state;
    return data;
  });

  return ok({ studyState: updated.studyStatesBySlug[normalized] });
}

/** Updates the saved tags for a specific problem. */
export async function updateTags(payload: { slug: string; tags: string[] }) {
  const normalized = normalizeSlug(payload.slug);
  if (!normalized) {
    throw new Error("Invalid slug.");
  }

  const updated = await mutateAppData((data) => {
    ensureProblem(data, { slug: normalized });
    const state = ensureStudyState(data, normalized);
    state.tags = payload.tags.map((tag) => tag.trim()).filter(Boolean);
    data.studyStatesBySlug[normalized] = state;
    return data;
  });

  return ok({ studyState: updated.studyStatesBySlug[normalized] });
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

  const updated = await mutateAppData((data) => {
    ensureProblem(data, { slug: normalized });
    const state = ensureStudyState(data, normalized);
    state.suspended = payload.suspend;
    data.studyStatesBySlug[normalized] = state;
    syncCourseProgress(data);
    return data;
  });

  return ok({ studyState: updated.studyStatesBySlug[normalized] });
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

  const updated = await mutateAppData((data) => {
    ensureProblem(data, { slug: normalized });
    const state = data.studyStatesBySlug[normalized];
    data.studyStatesBySlug[normalized] = resetSchedule(
      state,
      payload.keepNotes ?? true
    );
    syncCourseProgress(data);
    return data;
  });

  return ok({ studyState: updated.studyStatesBySlug[normalized] });
}
