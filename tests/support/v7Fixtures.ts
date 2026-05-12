/**
 * Factories for the v7 schema. Mirrors the existing `domainFixtures.ts`
 * but builds branded entities for the new aggregate set. Track fixtures
 * live alongside the tracks repo tests (they need the SQLite shape, not
 * a v7-blob shape).
 */
import {
  asCompanyId,
  asProblemSlug,
  asTopicId,
} from "../../src/domain/common/ids";
import { STORAGE_SCHEMA_VERSION_V7 } from "../../src/domain/data/appDataV7";
import { createInitialUserSettings } from "../../src/domain/settings";
import { createDefaultStudyState } from "../../src/domain/study-state/defaults";

import type { Company } from "../../src/domain/companies/model";
import type { AppDataV7 } from "../../src/domain/data/appDataV7";
import type { Problem } from "../../src/domain/problems/model";
import type { StudyState } from "../../src/domain/study-state/model";
import type { Topic } from "../../src/domain/topics/model";


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

/** Empty AppDataV7 with seeded settings — useful for repo unit tests. */
export function emptyAppDataV7(): AppDataV7 {
  return {
    schemaVersion: STORAGE_SCHEMA_VERSION_V7,
    problemsBySlug: {},
    studyStatesBySlug: {},
    topicsById: {},
    companiesById: {},
    settings: createInitialUserSettings(),
  };
}

export const FIXTURE_NOW = NOW;
