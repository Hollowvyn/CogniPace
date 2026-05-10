/**
 * StudySet seed builder. Reads the curated catalog (Blind75, NeetCode150,
 * etc.) and produces v7 StudySet entities of `kind: "course"` with one
 * SetGroup per topic. Group ids are deterministic (`<setId>::<index>`) so
 * the seed is stable across builds.
 */
import {
  asProblemSlug,
  asSetGroupId,
  asStudySetId,
  asTopicId,
  type ProblemSlug,
  type SetGroupId,
  type StudySetId,
  type TopicId,
} from "../../domain/common/ids";

import { resolveSeedTopicId } from "./topicsSeed";

import type { StudyPlanSummary } from "./curatedSets";
import type {
  CourseStudySetConfig,
  SetGroup,
  StudySet,
} from "../../domain/sets/model";
import type { Difficulty } from "../../domain/types";


interface CatalogSection {
  topic: string;
  slugs: Array<
    | string
    | {
        slug: string;
        displayTitle?: string;
        difficulty?: Difficulty;
      }
  >;
}

interface CatalogPlan {
  id: string;
  name: string;
  description: string;
  sections: CatalogSection[];
}

const COURSE_CONFIG_DEFAULTS: CourseStudySetConfig = {
  trackProgress: true,
  ordering: "manual",
  enforcePrerequisites: false,
  requireSequentialProblems: false,
  showLockedTopics: true,
  allowReorder: true,
};

/** Builds a StudySet entity for a curated course catalog plan. */
export function buildCourseStudySet(
  plan: CatalogPlan,
  now: string,
): StudySet {
  const setId = asStudySetId(plan.id);
  const groups = plan.sections.map((section, index) =>
    buildSectionGroup(setId, section, index),
  );

  return {
    id: setId,
    kind: "course",
    name: plan.name,
    description: plan.description,
    isCurated: true,
    enabled: true,
    groups,
    config: COURSE_CONFIG_DEFAULTS,
    createdAt: now,
    updatedAt: now,
  };
}

/** Build all curated StudySets keyed by id. */
export function buildStudySetSeed(
  plans: readonly CatalogPlan[],
  now: string,
): { studySetsById: Record<string, StudySet>; studySetOrder: StudySetId[] } {
  const studySetsById: Record<string, StudySet> = {};
  const studySetOrder: StudySetId[] = [];
  for (const plan of plans) {
    const studySet = buildCourseStudySet(plan, now);
    studySetsById[studySet.id] = studySet;
    studySetOrder.push(studySet.id);
  }
  return { studySetsById, studySetOrder };
}

/** Listing of curated StudySet summaries for UI surfaces. */
export function summarizeCourseStudySets(
  plans: readonly CatalogPlan[],
): StudyPlanSummary[] {
  return plans.map((plan) => ({
    id: plan.id,
    name: plan.name,
    description: plan.description,
    sourceSet: plan.id,
    topicCount: plan.sections.length,
    problemCount: countDistinctSlugs(plan.sections),
  }));
}

function buildSectionGroup(
  setId: StudySetId,
  section: CatalogSection,
  index: number,
): SetGroup {
  const groupId: SetGroupId = asSetGroupId(`${setId}::${index}`);
  const topicId: TopicId | undefined = resolveTopicId(section.topic);
  const problemSlugs: ProblemSlug[] = [];
  const titleOverrides: Record<string, string> = {};

  for (const raw of section.slugs) {
    const slugValue = typeof raw === "string" ? raw : raw.slug;
    const slug = asProblemSlug(slugValue);
    problemSlugs.push(slug);
    if (typeof raw !== "string" && raw.displayTitle) {
      titleOverrides[slug] = raw.displayTitle;
    }
  }

  return {
    id: groupId,
    topicId,
    nameOverride: section.topic,
    prerequisiteGroupIds: [],
    problemSlugs,
    problemTitleOverrides:
      Object.keys(titleOverrides).length > 0 ? titleOverrides : undefined,
  };
}

function resolveTopicId(label: string): TopicId | undefined {
  const seeded = resolveSeedTopicId(label);
  if (seeded) return seeded;
  // Curated catalogs occasionally contain free-form section titles
  // ("Grind 75 Path") that aren't part of the canonical topic registry.
  // We deliberately leave `topicId` undefined for those — the group still
  // works as a display container, just without a Topic FK.
  return undefined;
}

function countDistinctSlugs(sections: readonly CatalogSection[]): number {
  const seen = new Set<string>();
  for (const section of sections) {
    for (const raw of section.slugs) {
      seen.add(typeof raw === "string" ? raw : raw.slug);
    }
  }
  return seen.size;
}

export type { CatalogPlan, CatalogSection };
// Helpers re-exported for use by future seed pipelines.
export { asTopicId };
