/**
 * v7 message handlers — additive surface for the Question-as-SSoT
 * refactor. These handlers run alongside the existing v6 handlers; once
 * UI surfaces start sending the new message types, this file is the
 * single landing zone for them.
 *
 * All mutations go through the legacy `mutateAppData` funnel so the v6
 * fields (`courseProgressById`, etc.) stay in sync via `ensureCourseData`
 * / `syncCourseProgress` until Phase 8 deletes them.
 */
import {
  readLocalStorage,
  removeLocalStorage,
} from "../../../data/datasources/chrome/storage";
import { mutateAppData , PRE_V7_BACKUP_KEY } from "../../../data/repositories/appDataRepository";
import {
  asCompanyId,
  asProblemSlug,
  asStudySetId,
  asTopicId,
  newStudySetId,
  type CompanyId,
  type ProblemSlug,
  type StudySetId,
  type TopicId,
} from "../../../domain/common/ids";
import { nowIso } from "../../../domain/common/time";
import {
  applyEdit,
  type ProblemEditPatch,
} from "../../../domain/problems/operations";
import { FLAT_GROUP_ID } from "../../../domain/sets/model";
import { ok } from "../responses";

import type { ActiveFocus } from "../../../domain/active-focus/model";
import type { Company } from "../../../domain/companies/model";
import type { StudySet } from "../../../domain/sets/model";
import type { Topic } from "../../../domain/topics/model";
import type { Difficulty } from "../../../domain/types";


// ---------- Problem edits ----------

export interface EditProblemPayload {
  slug: string;
  patch: ProblemEditPatch & { topicIds?: string[]; companyIds?: string[] };
  markUserEdit?: boolean;
}

export async function editProblemHandler(payload: EditProblemPayload) {
  const slug = asProblemSlug(payload.slug);
  await mutateAppData((data) => {
    const existing = data.problemsBySlug[slug];
    if (!existing) return data;
    const patch: ProblemEditPatch = {
      ...payload.patch,
      topicIds: payload.patch.topicIds?.map((id) => asTopicId(id)) as TopicId[] | undefined,
      companyIds: payload.patch.companyIds?.map((id) => asCompanyId(id)) as
        | CompanyId[]
        | undefined,
    };
    const next = applyEdit(
      // The runtime Problem carries v6 fields too; the operations layer
      // ignores them.
      existing as unknown as Parameters<typeof applyEdit>[0],
      patch,
      nowIso(),
      payload.markUserEdit ?? true,
    );
    // Stitch v6 fields back so handlers continue to see consistent data.
    data.problemsBySlug[slug] = {
      ...existing,
      ...next,
      // Mirror difficulty/title/url back onto v6 mirror fields.
      id: existing.id,
      leetcodeSlug: existing.leetcodeSlug,
    };
    return data;
  });
  return ok({ slug });
}

// ---------- Custom topics & companies ----------

export interface CreateCustomTopicPayload {
  name: string;
  description?: string;
}

export async function createCustomTopicHandler(payload: CreateCustomTopicPayload) {
  const id = asTopicId(payload.name);
  if (!id) throw new Error("Topic name cannot be empty.");
  const now = nowIso();
  await mutateAppData((data) => {
    const existing = data.topicsById[id];
    const next: Topic = existing
      ? { ...existing, name: payload.name, description: payload.description, updatedAt: now }
      : {
          id,
          name: payload.name,
          description: payload.description,
          isCustom: true,
          createdAt: now,
          updatedAt: now,
        };
    data.topicsById[id] = next;
    return data;
  });
  return ok({ id });
}

export interface CreateCustomCompanyPayload {
  name: string;
  description?: string;
}

export async function createCustomCompanyHandler(
  payload: CreateCustomCompanyPayload,
) {
  const id = asCompanyId(payload.name);
  if (!id) throw new Error("Company name cannot be empty.");
  const now = nowIso();
  await mutateAppData((data) => {
    const existing = data.companiesById[id];
    const next: Company = existing
      ? { ...existing, name: payload.name, description: payload.description, updatedAt: now }
      : {
          id,
          name: payload.name,
          description: payload.description,
          isCustom: true,
          createdAt: now,
          updatedAt: now,
        };
    data.companiesById[id] = next;
    return data;
  });
  return ok({ id });
}

// ---------- Topic / company assignment ----------

export interface AssignTopicPayload {
  slug: string;
  topicId: string;
  assigned?: boolean;
}

export async function assignTopicHandler(payload: AssignTopicPayload) {
  const slug = asProblemSlug(payload.slug);
  const topicId = asTopicId(payload.topicId);
  await mutateAppData((data) => {
    const existing = data.problemsBySlug[slug];
    if (!existing) return data;
    const current = (existing.topicIds ?? []) as TopicId[];
    const has = current.includes(topicId);
    const assigned = payload.assigned ?? true;
    if (assigned && has) return data;
    if (!assigned && !has) return data;
    const next = assigned
      ? [...current, topicId]
      : current.filter((id) => id !== topicId);
    data.problemsBySlug[slug] = {
      ...existing,
      topicIds: next,
      updatedAt: nowIso(),
    };
    return data;
  });
  return ok({ slug });
}

export interface AssignCompanyPayload {
  slug: string;
  companyId: string;
  assigned?: boolean;
}

export async function assignCompanyHandler(payload: AssignCompanyPayload) {
  const slug = asProblemSlug(payload.slug);
  const companyId = asCompanyId(payload.companyId);
  await mutateAppData((data) => {
    const existing = data.problemsBySlug[slug];
    if (!existing) return data;
    const current = (existing.companyIds ?? []) as CompanyId[];
    const has = current.includes(companyId);
    const assigned = payload.assigned ?? true;
    if (assigned && has) return data;
    if (!assigned && !has) return data;
    const next = assigned
      ? [...current, companyId]
      : current.filter((id) => id !== companyId);
    data.problemsBySlug[slug] = {
      ...existing,
      companyIds: next,
      updatedAt: nowIso(),
    };
    return data;
  });
  return ok({ slug });
}

// ---------- StudySet CRUD ----------

interface DerivedFilter {
  kind: "company" | "topic" | "difficulty" | "custom";
  companyIds?: string[];
  topicIds?: string[];
  difficulties?: Difficulty[];
  includePremium?: boolean;
}

export interface CreateStudySetPayload {
  kind: "custom" | "company" | "topic" | "difficulty";
  name: string;
  description?: string;
  filter?: DerivedFilter;
  problemSlugs?: string[];
}

export async function createStudySetHandler(payload: CreateStudySetPayload) {
  const id: StudySetId = newStudySetId();
  const now = nowIso();
  await mutateAppData((data) => {
    const flatGroup = {
      id: FLAT_GROUP_ID,
      prerequisiteGroupIds: [],
      problemSlugs:
        payload.kind === "custom"
          ? (payload.problemSlugs ?? []).map((s) => asProblemSlug(s))
          : ([] as ProblemSlug[]),
    };
    const baseConfig = {
      trackProgress: true,
      ordering: "manual" as const,
    };
    let next: StudySet;
    switch (payload.kind) {
      case "custom":
        next = {
          id,
          kind: "custom",
          name: payload.name,
          description: payload.description,
          isCurated: false,
          enabled: true,
          groups: [flatGroup],
          config: baseConfig,
          filter:
            payload.filter && payload.filter.kind === "custom"
              ? {
                  kind: "custom",
                  companyIds: payload.filter.companyIds?.map((id) =>
                    asCompanyId(id),
                  ) as CompanyId[] | undefined,
                  topicIds: payload.filter.topicIds?.map((id) => asTopicId(id)) as
                    | TopicId[]
                    | undefined,
                  difficulties: payload.filter.difficulties,
                  includePremium: payload.filter.includePremium,
                }
              : undefined,
          createdAt: now,
          updatedAt: now,
        };
        break;
      case "company":
        next = {
          id,
          kind: "company",
          name: payload.name,
          description: payload.description,
          isCurated: false,
          enabled: true,
          groups: [flatGroup],
          config: baseConfig,
          filter: {
            kind: "company",
            companyIds: (payload.filter?.companyIds ?? []).map((id) =>
              asCompanyId(id),
            ) as CompanyId[],
          },
          createdAt: now,
          updatedAt: now,
        };
        break;
      case "topic":
        next = {
          id,
          kind: "topic",
          name: payload.name,
          description: payload.description,
          isCurated: false,
          enabled: true,
          groups: [flatGroup],
          config: baseConfig,
          filter: {
            kind: "topic",
            topicIds: (payload.filter?.topicIds ?? []).map((id) =>
              asTopicId(id),
            ) as TopicId[],
          },
          createdAt: now,
          updatedAt: now,
        };
        break;
      case "difficulty":
        next = {
          id,
          kind: "difficulty",
          name: payload.name,
          description: payload.description,
          isCurated: false,
          enabled: true,
          groups: [flatGroup],
          config: baseConfig,
          filter: {
            kind: "difficulty",
            difficulties: payload.filter?.difficulties ?? [],
          },
          createdAt: now,
          updatedAt: now,
        };
        break;
    }

    data.studySetsById[id] = next;
    data.studySetOrder = [...data.studySetOrder, id];
    return data;
  });
  return ok({ id });
}

export interface UpdateStudySetPayload {
  id: string;
  name?: string;
  description?: string;
  enabled?: boolean;
}

export async function updateStudySetHandler(payload: UpdateStudySetPayload) {
  const id = asStudySetId(payload.id);
  await mutateAppData((data) => {
    const existing = data.studySetsById[id];
    if (!existing) return data;
    data.studySetsById[id] = {
      ...existing,
      name: payload.name ?? existing.name,
      description: payload.description ?? existing.description,
      enabled: payload.enabled ?? existing.enabled,
      updatedAt: nowIso(),
    } as StudySet;
    return data;
  });
  return ok({ ok: true });
}

export interface DeleteStudySetPayload {
  id: string;
}

export async function deleteStudySetHandler(payload: DeleteStudySetPayload) {
  const id = asStudySetId(payload.id);
  await mutateAppData((data) => {
    const existing = data.studySetsById[id];
    if (!existing || existing.isCurated) return data;
    delete data.studySetsById[id];
    data.studySetOrder = data.studySetOrder.filter((sid) => sid !== id);
    delete data.studySetProgressById[id];
    if (
      data.settings.activeFocus &&
      data.settings.activeFocus.kind === "studySet" &&
      data.settings.activeFocus.id === id
    ) {
      data.settings = { ...data.settings, activeFocus: null };
    }
    return data;
  });
  return ok({ ok: true });
}

// ---------- Active focus ----------

export interface SetActiveFocusPayload {
  focus: ActiveFocus;
}

export async function setActiveFocusHandler(payload: SetActiveFocusPayload) {
  const updated = await mutateAppData((data) => {
    data.settings = {
      ...data.settings,
      activeFocus: payload.focus,
      activeCourseId:
        payload.focus?.kind === "studySet"
          ? payload.focus.id
          : data.settings.activeCourseId,
    };
    return data;
  });
  return ok({ settings: updated.settings });
}

// ---------- Pre-v7 backup ----------

export async function consumePreV7BackupHandler() {
  const result = await readLocalStorage([PRE_V7_BACKUP_KEY]);
  const blob = result[PRE_V7_BACKUP_KEY];
  if (!blob) return ok({ backup: null });
  await removeLocalStorage([PRE_V7_BACKUP_KEY]);
  return ok({ backup: blob });
}
