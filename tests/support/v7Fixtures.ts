/**
 * Factories for the v7 schema. Mirrors the existing `domainFixtures.ts`
 * but builds branded entities for the new aggregate set.
 */
import type { AppDataV7 } from "../../src/domain/data/appDataV7";
import { STORAGE_SCHEMA_VERSION_V7 } from "../../src/domain/data/appDataV7";
import {
  asCompanyId,
  asProblemSlug,
  asSetGroupId,
  asStudySetId,
  asTopicId,
  type ProblemSlug,
} from "../../src/domain/common/ids";
import type { Problem } from "../../src/domain/problems/model";
import type { StudyState } from "../../src/domain/study-state/model";
import { createDefaultStudyState } from "../../src/domain/study-state/defaults";
import type { StudySet } from "../../src/domain/sets/model";
import type { Topic } from "../../src/domain/topics/model";
import type { Company } from "../../src/domain/companies/model";
import { createInitialUserSettings } from "../../src/domain/settings";

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

/** Builds a flat (single-group) custom StudySet with the supplied slugs. */
export function makeCustomStudySetV7(
  id: string,
  name: string,
  slugs: string[] = [],
): StudySet {
  return {
    id: asStudySetId(id),
    kind: "custom",
    name,
    isCurated: false,
    enabled: true,
    config: { trackProgress: true, ordering: "manual" },
    groups: [
      {
        id: asSetGroupId(`${id}::flat`),
        prerequisiteGroupIds: [],
        problemSlugs: slugs.map((s) => asProblemSlug(s)),
      },
    ],
    createdAt: NOW,
    updatedAt: NOW,
  };
}

/** Builds a course-shaped StudySet with named topic groups. */
export function makeCourseStudySetV7(
  id: string,
  name: string,
  groups: Array<{ id?: string; problemSlugs?: string[]; topicId?: string }>,
): StudySet {
  return {
    id: asStudySetId(id),
    kind: "course",
    name,
    isCurated: true,
    enabled: true,
    config: {
      trackProgress: true,
      ordering: "manual",
      enforcePrerequisites: true,
      requireSequentialProblems: false,
      showLockedTopics: true,
      allowReorder: true,
    },
    groups: groups.map((group, index) => ({
      id: asSetGroupId(group.id ?? `${id}::${index}`),
      topicId: group.topicId ? asTopicId(group.topicId) : undefined,
      prerequisiteGroupIds: [],
      problemSlugs: (group.problemSlugs ?? []).map(
        (slug) => asProblemSlug(slug) as ProblemSlug,
      ),
    })),
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
    studySetsById: {},
    studySetOrder: [],
    studySetProgressById: {},
    settings: createInitialUserSettings(),
  };
}

export const FIXTURE_NOW = NOW;
