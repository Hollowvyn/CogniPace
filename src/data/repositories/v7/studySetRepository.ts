/**
 * StudySet aggregate repository — pure mutators on AppDataV7 drafts.
 *
 * Covers all kinds (course / company / topic / difficulty / custom)
 * through one surface. The discriminated `StudySet` union enforces that
 * each kind carries the right config + filter shape; this repository
 * preserves that discipline.
 *
 * Group-DAG operations (add/remove prerequisite, validate cycles)
 * delegate to `domain/sets/prerequisites.ts`; mutations that would
 * introduce a cycle are rejected and the draft is returned unchanged.
 */
import {
  asProblemSlug,
  asStudySetId,
  newSetGroupId,
  newStudySetId,
  type ProblemSlug,
  type SetGroupId,
  type StudySetId,
} from "../../../domain/common/ids";
import { FLAT_GROUP_ID } from "../../../domain/sets/model";
import { isDagAcyclic } from "../../../domain/sets/prerequisites";

import type { AppDataV7 } from "../../../domain/data/appDataV7";
import type {
  BaseStudySetConfig,
  CompanyFilter,
  CourseStudySetConfig,
  CustomFilter,
  DifficultyFilter,
  SetGroup,
  StudySet,
  StudySetFilter,
  TopicFilter,
} from "../../../domain/sets/model";

const DEFAULT_FLAT_CONFIG: BaseStudySetConfig = {
  trackProgress: true,
  ordering: "manual",
};

export type CreateStudySetArgs =
  | {
      kind: "custom";
      name: string;
      description?: string;
      filter?: CustomFilter;
      problemSlugs?: string[];
      config?: Partial<BaseStudySetConfig>;
    }
  | {
      kind: "company";
      name: string;
      description?: string;
      filter: CompanyFilter;
      config?: Partial<BaseStudySetConfig>;
    }
  | {
      kind: "topic";
      name: string;
      description?: string;
      filter: TopicFilter;
      config?: Partial<BaseStudySetConfig>;
    }
  | {
      kind: "difficulty";
      name: string;
      description?: string;
      filter: DifficultyFilter;
      config?: Partial<BaseStudySetConfig>;
    };

/** Create a fresh user-defined StudySet. Curated `kind: "course"` sets
 * arrive via the seed builder, not this entrypoint. */
export function createStudySet(
  data: AppDataV7,
  args: CreateStudySetArgs,
  now: string,
): { data: AppDataV7; id: StudySetId } {
  const id: StudySetId = newStudySetId();
  const baseConfig: BaseStudySetConfig = {
    ...DEFAULT_FLAT_CONFIG,
    ...args.config,
  };
  const flatGroup: SetGroup = {
    id: FLAT_GROUP_ID,
    prerequisiteGroupIds: [],
    problemSlugs:
      args.kind === "custom"
        ? (args.problemSlugs ?? []).map((s) => asProblemSlug(s))
        : [],
  };

  let next: StudySet;
  switch (args.kind) {
    case "custom":
      next = {
        id,
        kind: "custom",
        name: args.name,
        description: args.description,
        isCurated: false,
        enabled: true,
        groups: [flatGroup],
        config: baseConfig,
        filter: args.filter,
        createdAt: now,
        updatedAt: now,
      };
      break;
    case "company":
      next = {
        id,
        kind: "company",
        name: args.name,
        description: args.description,
        isCurated: false,
        enabled: true,
        groups: [flatGroup],
        config: baseConfig,
        filter: args.filter,
        createdAt: now,
        updatedAt: now,
      };
      break;
    case "topic":
      next = {
        id,
        kind: "topic",
        name: args.name,
        description: args.description,
        isCurated: false,
        enabled: true,
        groups: [flatGroup],
        config: baseConfig,
        filter: args.filter,
        createdAt: now,
        updatedAt: now,
      };
      break;
    case "difficulty":
      next = {
        id,
        kind: "difficulty",
        name: args.name,
        description: args.description,
        isCurated: false,
        enabled: true,
        groups: [flatGroup],
        config: baseConfig,
        filter: args.filter,
        createdAt: now,
        updatedAt: now,
      };
      break;
  }

  data.studySetsById[id] = next;
  data.studySetOrder = [...data.studySetOrder, id];
  return { data, id };
}

export interface UpdateStudySetArgs {
  name?: string;
  description?: string;
  enabled?: boolean;
  filter?: StudySetFilter;
  config?: Partial<BaseStudySetConfig> & Partial<CourseStudySetConfig>;
}

/** Patch a StudySet's metadata. Refuses kind/structure mutations — those
 * have their own dedicated mutators below. */
export function updateStudySet(
  data: AppDataV7,
  id: StudySetId,
  args: UpdateStudySetArgs,
  now: string,
): AppDataV7 {
  const existing = data.studySetsById[id];
  if (!existing) return data;

  // Filter must match the kind's expected shape; a wrong-shape patch is dropped.
  const nextFilter: StudySetFilter | undefined = args.filter
    ? sanitizeFilterForKind(existing.kind, args.filter)
    : existing.filter;

  // Config update: shallow merge while preserving the kind-specific shape.
  const nextConfig =
    existing.kind === "course"
      ? ({
          ...existing.config,
          ...args.config,
        } as CourseStudySetConfig)
      : ({ ...existing.config, ...args.config } as BaseStudySetConfig);

  const patched = {
    ...existing,
    name: args.name ?? existing.name,
    description: args.description ?? existing.description,
    enabled: args.enabled ?? existing.enabled,
    config: nextConfig,
    filter: nextFilter,
    updatedAt: now,
  } as StudySet;

  data.studySetsById[id] = patched;
  return data;
}

/**
 * Delete a StudySet entirely. Curated sets are protected — they can only
 * be disabled (`enabled: false`), not deleted, so curated seeds remain
 * intact across upgrades.
 */
export function deleteStudySet(
  data: AppDataV7,
  id: StudySetId,
  now: string,
): AppDataV7 {
  const existing = data.studySetsById[id];
  if (!existing || existing.isCurated) return data;
  delete data.studySetsById[id];
  data.studySetOrder = data.studySetOrder.filter((sid) => sid !== id);
  delete data.studySetProgressById[id];
  // If the deleted set was the active focus, clear it.
  if (
    data.settings.activeFocus &&
    data.settings.activeFocus.kind === "studySet" &&
    data.settings.activeFocus.id === id
  ) {
    data.settings = { ...data.settings, activeFocus: null };
  }
  void now;
  return data;
}

export interface AddGroupArgs {
  topicId?: StudySetId;
  nameOverride?: string;
  description?: string;
}

/** Append a new SetGroup to a StudySet (course or grouped custom set). */
export function addGroup(
  data: AppDataV7,
  setId: StudySetId,
  args: AddGroupArgs,
  now: string,
): { data: AppDataV7; groupId: SetGroupId | null } {
  const existing = data.studySetsById[setId];
  if (!existing) return { data, groupId: null };
  const groupId: SetGroupId = newSetGroupId();
  const group: SetGroup = {
    id: groupId,
    nameOverride: args.nameOverride,
    description: args.description,
    prerequisiteGroupIds: [],
    problemSlugs: [],
  };
  const next: StudySet = {
    ...existing,
    groups: [...existing.groups, group],
    updatedAt: now,
  } as StudySet;
  data.studySetsById[setId] = next;
  return { data, groupId };
}

/** Remove a group from a StudySet. Sweeps it from any other group's
 * prerequisite list to preserve DAG validity. */
export function removeGroup(
  data: AppDataV7,
  setId: StudySetId,
  groupId: SetGroupId,
  now: string,
): AppDataV7 {
  const existing = data.studySetsById[setId];
  if (!existing) return data;
  const groups = existing.groups
    .filter((g) => g.id !== groupId)
    .map((g) => ({
      ...g,
      prerequisiteGroupIds: g.prerequisiteGroupIds.filter((id) => id !== groupId),
    }));
  const next: StudySet = {
    ...existing,
    groups,
    updatedAt: now,
  } as StudySet;
  data.studySetsById[setId] = next;
  return data;
}

/** Reorder the groups within a StudySet by their ids. Unknown ids are
 * silently dropped; missing ids are appended in their original order. */
export function reorderGroups(
  data: AppDataV7,
  setId: StudySetId,
  orderedGroupIds: SetGroupId[],
  now: string,
): AppDataV7 {
  const existing = data.studySetsById[setId];
  if (!existing) return data;
  const byId = new Map(existing.groups.map((g) => [g.id, g] as const));
  const ordered: SetGroup[] = [];
  for (const id of orderedGroupIds) {
    const group = byId.get(id);
    if (group) {
      ordered.push(group);
      byId.delete(id);
    }
  }
  for (const remaining of byId.values()) {
    ordered.push(remaining);
  }
  data.studySetsById[setId] = {
    ...existing,
    groups: ordered,
    updatedAt: now,
  } as StudySet;
  return data;
}

/** Reorder a group's problem slugs. Unknown slugs are silently dropped;
 * missing ones are appended in their original order. */
export function reorderGroupProblems(
  data: AppDataV7,
  setId: StudySetId,
  groupId: SetGroupId,
  orderedSlugs: ProblemSlug[],
  now: string,
): AppDataV7 {
  const existing = data.studySetsById[setId];
  if (!existing) return data;
  const groups = existing.groups.map((g) => {
    if (g.id !== groupId) return g;
    const present = new Set(g.problemSlugs);
    const ordered: ProblemSlug[] = [];
    for (const slug of orderedSlugs) {
      if (present.has(slug)) {
        ordered.push(slug);
        present.delete(slug);
      }
    }
    for (const remaining of g.problemSlugs) {
      if (present.has(remaining)) {
        ordered.push(remaining);
      }
    }
    return { ...g, problemSlugs: ordered };
  });
  data.studySetsById[setId] = {
    ...existing,
    groups,
    updatedAt: now,
  } as StudySet;
  return data;
}

/** Add a problem to a group. No-op when the slug is already present. */
export function addProblemToGroup(
  data: AppDataV7,
  setId: StudySetId,
  groupId: SetGroupId,
  slug: ProblemSlug,
  now: string,
): AppDataV7 {
  const existing = data.studySetsById[setId];
  if (!existing) return data;
  const groups = existing.groups.map((g) => {
    if (g.id !== groupId) return g;
    if (g.problemSlugs.includes(slug)) return g;
    return { ...g, problemSlugs: [...g.problemSlugs, slug] };
  });
  data.studySetsById[setId] = {
    ...existing,
    groups,
    updatedAt: now,
  } as StudySet;
  return data;
}

/** Remove a problem slug from a group. */
export function removeProblemFromGroup(
  data: AppDataV7,
  setId: StudySetId,
  groupId: SetGroupId,
  slug: ProblemSlug,
  now: string,
): AppDataV7 {
  const existing = data.studySetsById[setId];
  if (!existing) return data;
  const groups = existing.groups.map((g) =>
    g.id === groupId
      ? { ...g, problemSlugs: g.problemSlugs.filter((s) => s !== slug) }
      : g,
  );
  data.studySetsById[setId] = {
    ...existing,
    groups,
    updatedAt: now,
  } as StudySet;
  return data;
}

/** Add a prerequisite edge between two groups. Rejected if it would
 * introduce a cycle. */
export function addGroupPrerequisite(
  data: AppDataV7,
  setId: StudySetId,
  groupId: SetGroupId,
  prerequisiteId: SetGroupId,
  now: string,
): AppDataV7 {
  const existing = data.studySetsById[setId];
  if (!existing) return data;
  if (groupId === prerequisiteId) return data;

  const next = existing.groups.map((g) => {
    if (g.id !== groupId) return g;
    if (g.prerequisiteGroupIds.includes(prerequisiteId)) return g;
    return {
      ...g,
      prerequisiteGroupIds: [...g.prerequisiteGroupIds, prerequisiteId],
    };
  });
  if (!isDagAcyclic(next)) return data;
  data.studySetsById[setId] = {
    ...existing,
    groups: next,
    updatedAt: now,
  } as StudySet;
  return data;
}

/** Remove a prerequisite edge between two groups. */
export function removeGroupPrerequisite(
  data: AppDataV7,
  setId: StudySetId,
  groupId: SetGroupId,
  prerequisiteId: SetGroupId,
  now: string,
): AppDataV7 {
  const existing = data.studySetsById[setId];
  if (!existing) return data;
  const groups = existing.groups.map((g) =>
    g.id === groupId
      ? {
          ...g,
          prerequisiteGroupIds: g.prerequisiteGroupIds.filter(
            (id) => id !== prerequisiteId,
          ),
        }
      : g,
  );
  data.studySetsById[setId] = {
    ...existing,
    groups,
    updatedAt: now,
  } as StudySet;
  return data;
}

/** Bulk-replace the StudySet ordering shown in dashboards. Unknown ids
 * are dropped. */
export function setStudySetOrder(
  data: AppDataV7,
  ordered: StudySetId[],
): AppDataV7 {
  const known = new Set(Object.keys(data.studySetsById));
  const filtered = ordered.filter((id) => known.has(id));
  const remainder = data.studySetOrder.filter((id) => !filtered.includes(id));
  data.studySetOrder = [...filtered, ...remainder];
  return data;
}

/** Read-only convenience. */
export function getStudySet(
  data: AppDataV7,
  id: StudySetId,
): StudySet | undefined {
  return data.studySetsById[id];
}

function sanitizeFilterForKind(
  kind: StudySet["kind"],
  filter: StudySetFilter,
): StudySetFilter | undefined {
  switch (kind) {
    case "company":
      return filter.kind === "company" ? filter : undefined;
    case "topic":
      return filter.kind === "topic" ? filter : undefined;
    case "difficulty":
      return filter.kind === "difficulty" ? filter : undefined;
    case "custom":
      return filter.kind === "custom" ? filter : undefined;
    case "course":
      return undefined;
  }
}

export { asStudySetId };
