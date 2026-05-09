/**
 * Domain service that resolves a StudySet to the ordered list of problem
 * slugs the user should consume.
 *
 *   - Course / custom (with explicit groups): iterate groups in array order
 *     and concatenate `problemSlugs`. For courses, callers can additionally
 *     filter on prerequisites via `isGroupUnlocked`.
 *   - Derived kinds (`company`, `topic`, `difficulty`) and `custom` sets
 *     with a filter: ignore stored slugs and recompute live from
 *     `problemsBySlug` matching the filter conjunction.
 *
 * The service is pure — given the same StudySet + AppData slice, it
 * returns the same result. Memoisation is the caller's responsibility.
 */
import type {
  CompanyId,
  ProblemSlug,
  TopicId,
} from "../../common/ids";
import type { Problem } from "../../problems/model";
import type { Difficulty } from "../../types";
import {
  isDerivedKind,
  type CustomFilter,
  type StudySet,
  type StudySetFilter,
} from "../model";

export interface ResolveSlugsInput {
  studySet: StudySet;
  problemsBySlug: Record<string, Problem>;
}

export function resolveStudySetSlugs(input: ResolveSlugsInput): ProblemSlug[] {
  const { studySet, problemsBySlug } = input;

  if (studySet.kind === "custom" && !studySet.filter) {
    return concatGroupSlugs(studySet);
  }

  if (studySet.kind === "course") {
    return concatGroupSlugs(studySet);
  }

  if (isDerivedKind(studySet.kind) || studySet.filter) {
    return resolveByFilter(studySet.filter, problemsBySlug);
  }

  return concatGroupSlugs(studySet);
}

function concatGroupSlugs(studySet: StudySet): ProblemSlug[] {
  const seen = new Set<ProblemSlug>();
  const out: ProblemSlug[] = [];
  for (const group of studySet.groups) {
    for (const slug of group.problemSlugs) {
      if (seen.has(slug)) continue;
      seen.add(slug);
      out.push(slug);
    }
  }
  return out;
}

function resolveByFilter(
  filter: StudySetFilter | undefined,
  problemsBySlug: Record<string, Problem>,
): ProblemSlug[] {
  if (!filter) return [];
  const candidates = Object.values(problemsBySlug);
  return candidates
    .filter((problem) => problemMatchesFilter(problem, filter))
    .map((problem) => problem.slug);
}

function problemMatchesFilter(
  problem: Problem,
  filter: StudySetFilter,
): boolean {
  switch (filter.kind) {
    case "company":
      return hasAny(problem.companyIds, filter.companyIds);
    case "topic":
      return hasAny(problem.topicIds, filter.topicIds);
    case "difficulty":
      return filter.difficulties.includes(problem.difficulty);
    case "custom":
      return matchesCustomFilter(problem, filter);
  }
}

function matchesCustomFilter(problem: Problem, filter: CustomFilter): boolean {
  if (filter.companyIds && filter.companyIds.length > 0) {
    if (!hasAny(problem.companyIds, filter.companyIds)) return false;
  }
  if (filter.topicIds && filter.topicIds.length > 0) {
    if (!hasAny(problem.topicIds, filter.topicIds)) return false;
  }
  if (filter.difficulties && filter.difficulties.length > 0) {
    if (!filter.difficulties.includes(problem.difficulty)) return false;
  }
  if (filter.includePremium === false && problem.isPremium) {
    return false;
  }
  return true;
}

function hasAny<T>(left: readonly T[], right: readonly T[]): boolean {
  if (left.length === 0 || right.length === 0) return false;
  const set = new Set<T>(left);
  for (const value of right) {
    if (set.has(value)) return true;
  }
  return false;
}

// re-export types so callers don't need a separate import
export type { Difficulty, CompanyId, TopicId };
