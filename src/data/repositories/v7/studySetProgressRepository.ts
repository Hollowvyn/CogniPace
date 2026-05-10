/**
 * StudySetProgress aggregate repository — pure mutators on AppDataV7
 * drafts. Progress is lazily created when the user first focuses or
 * completes a problem within a StudySet.
 */
import type { AppDataV7 } from "../../../domain/data/appDataV7";
import { resolveStudySetSlugs } from "../../../domain/sets/services/resolveSlugs";
import type {
  SetGroupProgress,
  StudySetProgress,
} from "../../../domain/sets/progress";
import {
  type ProblemSlug,
  type SetGroupId,
  type StudySetId,
} from "../../../domain/common/ids";

/** Materialise progress for a set on first interaction. No-op if it
 * already exists. */
export function ensureProgress(
  data: AppDataV7,
  setId: StudySetId,
  now: string,
): AppDataV7 {
  if (data.studySetProgressById[setId]) return data;
  const fresh: StudySetProgress = {
    setId,
    startedAt: now,
    lastInteractedAt: now,
    groupProgressById: {},
    completedSlugs: [],
  };
  data.studySetProgressById[setId] = fresh;
  return data;
}

/** Set the user's active group within a focused StudySet. */
export function setActiveGroup(
  data: AppDataV7,
  setId: StudySetId,
  groupId: SetGroupId | undefined,
  now: string,
): AppDataV7 {
  ensureProgress(data, setId, now);
  const existing = data.studySetProgressById[setId];
  data.studySetProgressById[setId] = {
    ...existing,
    activeGroupId: groupId,
    lastInteractedAt: now,
  };
  return data;
}

/** Mark a slug as completed in a specific group. Idempotent. */
export function markCompleted(
  data: AppDataV7,
  setId: StudySetId,
  groupId: SetGroupId,
  slug: ProblemSlug,
  now: string,
): AppDataV7 {
  ensureProgress(data, setId, now);
  const existing = data.studySetProgressById[setId];
  const groupProgress: SetGroupProgress =
    existing.groupProgressById[groupId] ?? {
      groupId,
      completedSlugs: [],
    };
  if (!groupProgress.completedSlugs.includes(slug)) {
    groupProgress.completedSlugs = [...groupProgress.completedSlugs, slug];
  }
  groupProgress.lastInteractedAt = now;
  const completedAggregate = existing.completedSlugs.includes(slug)
    ? existing.completedSlugs
    : [...existing.completedSlugs, slug];
  data.studySetProgressById[setId] = {
    ...existing,
    groupProgressById: {
      ...existing.groupProgressById,
      [groupId]: groupProgress,
    },
    completedSlugs: completedAggregate,
    lastInteractedAt: now,
  };
  return data;
}

/** Reverse `markCompleted`. */
export function unmarkCompleted(
  data: AppDataV7,
  setId: StudySetId,
  groupId: SetGroupId,
  slug: ProblemSlug,
  now: string,
): AppDataV7 {
  const existing = data.studySetProgressById[setId];
  if (!existing) return data;
  const groupProgress = existing.groupProgressById[groupId];
  if (!groupProgress) return data;
  data.studySetProgressById[setId] = {
    ...existing,
    groupProgressById: {
      ...existing.groupProgressById,
      [groupId]: {
        ...groupProgress,
        completedSlugs: groupProgress.completedSlugs.filter((s) => s !== slug),
        lastInteractedAt: now,
      },
    },
    completedSlugs: existing.completedSlugs.filter((s) => s !== slug),
    lastInteractedAt: now,
  };
  return data;
}

/**
 * Reconcile every StudySet's progress against the user's StudyState
 * history — a slug is "completed" once it has at least one rating > 0
 * (Hard / Good / Easy). Called after handler closures that touch reviews
 * so progress views stay in sync.
 */
export function syncAll(data: AppDataV7, now: string): AppDataV7 {
  for (const setId of Object.keys(data.studySetsById)) {
    const studySet = data.studySetsById[setId];
    if (!studySet.config.trackProgress) continue;
    const slugs = resolveStudySetSlugs({
      studySet,
      problemsBySlug: data.problemsBySlug,
    });
    if (slugs.length === 0) continue;

    ensureProgress(data, studySet.id, now);
    const existing = data.studySetProgressById[setId];

    const completedSet = new Set<ProblemSlug>();
    for (const slug of slugs) {
      const study = data.studyStatesBySlug[slug];
      if (!study) continue;
      if (study.attemptHistory.length === 0) continue;
      // "Completed" = at least one non-Again rating recorded.
      const hasGoodAttempt = study.attemptHistory.some(
        (entry) => entry.rating > 0,
      );
      if (hasGoodAttempt) completedSet.add(slug);
    }

    const completedSlugs = Array.from(completedSet);
    if (
      completedSlugs.length !== existing.completedSlugs.length ||
      completedSlugs.some((slug) => !existing.completedSlugs.includes(slug))
    ) {
      data.studySetProgressById[setId] = {
        ...existing,
        completedSlugs,
        lastInteractedAt: now,
      };
    }
  }
  return data;
}

/** Read-only convenience. */
export function getProgress(
  data: AppDataV7,
  setId: StudySetId,
): StudySetProgress | undefined {
  return data.studySetProgressById[setId];
}
