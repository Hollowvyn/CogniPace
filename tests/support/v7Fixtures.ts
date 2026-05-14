/**
 * Branded-entity factories for tests that build problem/study-state/topic/
 * company fixtures. Track fixtures live alongside the tracks repo tests
 * (they need the SQLite shape).
 */
import { createDefaultStudyState } from "@features/study/server";
import {
  asCompanyId,
  asProblemSlug,
  asTopicId,
} from "@shared/ids";

import type { Company , Problem , Topic } from "@features/problems";
import type { StudyState } from "@features/study/server";


const NOW = "2026-03-01T00:00:00.000Z";

export function makeProblemV7(
  slug: string,
  overrides: Partial<Problem> = {},
): Problem {
  const branded = asProblemSlug(slug);
  return {
    slug: branded,
    title: overrides.title ?? "Sample Problem",
    difficulty: overrides.difficulty ?? "Medium",
    isPremium: overrides.isPremium ?? false,
    url: overrides.url ?? `https://leetcode.com/problems/${branded}/`,
    topicIds: overrides.topicIds ?? [],
    companyIds: overrides.companyIds ?? [],
    leetcodeId: overrides.leetcodeId,
    userEdits: overrides.userEdits,
    createdAt: overrides.createdAt ?? NOW,
    updatedAt: overrides.updatedAt ?? NOW,
  };
}

export function makeStudyStateV7(
  overrides: Partial<StudyState> = {},
): StudyState {
  const baseline = createDefaultStudyState(NOW);
  return { ...baseline, ...overrides };
}

export function makeTopicV7(id: string, name: string, isCustom = false): Topic {
  return {
    id: asTopicId(id),
    name,
    isCustom,
    createdAt: NOW,
    updatedAt: NOW,
  };
}

export function makeCompanyV7(
  id: string,
  name: string,
  isCustom = false,
): Company {
  return {
    id: asCompanyId(id),
    name,
    isCustom,
    createdAt: NOW,
    updatedAt: NOW,
  };
}

export const FIXTURE_NOW = NOW;
