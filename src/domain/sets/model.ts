/**
 * StudySet — the unified aggregate covering curated courses, company /
 * topic / difficulty -derived lists, and user-custom lists. The shape is
 * discriminated on `kind` so the type system enforces "course requires
 * grouped + course-config" and "company-derived requires a CompanyFilter".
 *
 * `groups: SetGroup[]` is ALWAYS present. Flat sets carry a single
 * synthetic group; grouped (course-shaped) sets have one group per topic
 * with optional DAG prerequisites. This keeps callers on one rendering
 * code path regardless of kind.
 */
import type {
  CompanyId,
  ProblemSlug,
  SetGroupId,
  StudySetId,
  TopicId,
} from "../common/ids";
import type { Difficulty } from "../types";

export type StudySetKind = "course" | "company" | "topic" | "difficulty" | "custom";

export interface BaseStudySetConfig {
  trackProgress: boolean;
  ordering: "manual" | "difficulty" | "alphabetical" | "added";
}

/** Course-flavoured config. Only valid when kind === "course". */
export interface CourseStudySetConfig extends BaseStudySetConfig {
  enforcePrerequisites: boolean;
  requireSequentialProblems: boolean;
  showLockedTopics: boolean;
  allowReorder: boolean;
}

export interface CompanyFilter {
  readonly kind: "company";
  companyIds: CompanyId[];
}
export interface TopicFilter {
  readonly kind: "topic";
  topicIds: TopicId[];
}
export interface DifficultyFilter {
  readonly kind: "difficulty";
  difficulties: Difficulty[];
}
export interface CustomFilter {
  readonly kind: "custom";
  companyIds?: CompanyId[];
  topicIds?: TopicId[];
  difficulties?: Difficulty[];
  includePremium?: boolean;
}

export type StudySetFilter =
  | CompanyFilter
  | TopicFilter
  | DifficultyFilter
  | CustomFilter;

export interface SetGroup {
  readonly id: SetGroupId;
  /** FK → Topic registry when the group represents a topic. */
  topicId?: TopicId;
  /** Display override for curated catalogs (e.g. ByteByteGo101). */
  nameOverride?: string;
  description?: string;
  /** DAG within the StudySet — references SetGroup.id. */
  prerequisiteGroupIds: SetGroupId[];
  /** Ordered FK → Problem.slug. The same slug may appear in multiple groups. */
  problemSlugs: ProblemSlug[];
  /** Per-problem display title overrides preserved from curated seeds. */
  problemTitleOverrides?: Record<string, string>;
}

interface StudySetCommon {
  readonly id: StudySetId;
  name: string;
  description?: string;
  isCurated: boolean;
  /** Replaces UserSettings.setsEnabled — controls whether queue draws from this set. */
  enabled: boolean;
  /** Always populated; flat sets carry a single synthetic group. */
  groups: SetGroup[];
  readonly createdAt: string;
  updatedAt: string;
}

export type StudySet =
  | (StudySetCommon & {
      readonly kind: "course";
      config: CourseStudySetConfig;
      filter?: never;
    })
  | (StudySetCommon & {
      readonly kind: "custom";
      config: BaseStudySetConfig;
      filter?: CustomFilter;
    })
  | (StudySetCommon & {
      readonly kind: "company";
      config: BaseStudySetConfig;
      filter: CompanyFilter;
    })
  | (StudySetCommon & {
      readonly kind: "topic";
      config: BaseStudySetConfig;
      filter: TopicFilter;
    })
  | (StudySetCommon & {
      readonly kind: "difficulty";
      config: BaseStudySetConfig;
      filter: DifficultyFilter;
    });

/** Stable id for the synthetic group used when a StudySet's structure is flat. */
export const FLAT_GROUP_ID = "__flat__" as SetGroupId;

/** True when the StudySet should source its slugs from a derived filter. */
export function isDerivedKind(kind: StudySetKind): boolean {
  return kind === "company" || kind === "topic" || kind === "difficulty";
}
