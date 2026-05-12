/**
 * v7 message handlers — single landing zone for Question / Track / Topic /
 * Company / ActiveFocus mutations. All writes flow through the
 * `mutateAppData` funnel so persistence is serialised.
 */
import { upsertCompany } from "../../../data/companies/repository";
import {
  readLocalStorage,
  removeLocalStorage,
} from "../../../data/datasources/chrome/storage";
import { getDb } from "../../../data/db/instance";
import {
  editProblem,
  getProblem,
} from "../../../data/problems/repository";
import { mutateAppData , PRE_V7_BACKUP_KEY } from "../../../data/repositories/appDataRepository";
import { markSlugLaunched } from "../../../data/repositories/v7/studySetProgressRepository";
import {
  getUserSettings,
  saveUserSettings,
} from "../../../data/settings/repository";
import { upsertTopic } from "../../../data/topics/repository";
import {
  asCompanyId,
  asProblemSlug,
  asSetGroupId,
  asStudySetId,
  asTopicId,
  newStudySetId,
  type CompanyId,
  type ProblemSlug,
  type StudySetId,
  type TopicId,
} from "../../../domain/common/ids";
import { nowIso } from "../../../domain/common/time";
import { FLAT_GROUP_ID } from "../../../domain/sets/model";
import { ok } from "../responses";

import type { ActiveFocus } from "../../../domain/active-focus/model";
import type { ProblemEditPatch } from "../../../domain/problems/operations";
import type { StudySet } from "../../../domain/sets/model";
import type { Difficulty } from "../../../domain/types";


// ---------- Problem edits ----------

export interface EditProblemPayload {
  slug: string;
  patch: ProblemEditPatch & { topicIds?: string[]; companyIds?: string[] };
  markUserEdit?: boolean;
}

export async function editProblemHandler(payload: EditProblemPayload) {
  const slug = asProblemSlug(payload.slug);
  const patch: ProblemEditPatch = {
    ...payload.patch,
    topicIds: payload.patch.topicIds?.map((id) => asTopicId(id)) as
      | TopicId[]
      | undefined,
    companyIds: payload.patch.companyIds?.map((id) => asCompanyId(id)) as
      | CompanyId[]
      | undefined,
  };
  const { db } = await getDb();
  const existing = await getProblem(db, slug);
  if (!existing) {
    // Fail loud per charter lesson #5. The library row may be a
    // synthesised placeholder for a problem the user has seen
    // referenced in a track but never actually opened on LeetCode —
    // editing it doesn't make sense until it's been initialised by
    // a page visit. Surface the requirement to the UI rather than
    // silently succeeding or auto-creating a half-populated row.
    throw new Error(
      "Open this problem on LeetCode first — it hasn't been initialised yet, so there's nothing to edit. Visit the page and then come back.",
    );
  }
  await editProblem(db, {
    slug,
    patch,
    markUserEdit: payload.markUserEdit ?? true,
  });
  return ok({ slug });
}

// ---------- Custom topics & companies ----------

export interface CreateCustomTopicPayload {
  name: string;
  description?: string;
}

export async function createCustomTopicHandler(payload: CreateCustomTopicPayload) {
  const { db } = await getDb();
  const topic = await upsertTopic(db, {
    name: payload.name,
    description: payload.description,
    isCustom: true,
  });
  return ok({ id: topic.id });
}

export interface CreateCustomCompanyPayload {
  name: string;
  description?: string;
}

export async function createCustomCompanyHandler(
  payload: CreateCustomCompanyPayload,
) {
  const { db } = await getDb();
  const company = await upsertCompany(db, {
    name: payload.name,
    description: payload.description,
    isCustom: true,
  });
  return ok({ id: company.id });
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
  const assigned = payload.assigned ?? true;
  const { db } = await getDb();
  const existing = await getProblem(db, slug);
  if (!existing) {
    throw new Error(
      "Open this problem on LeetCode first — it hasn't been initialised yet, so there's nothing to assign a topic to.",
    );
  }
  const current = existing.topicIds as TopicId[];
  const has = current.includes(topicId);
  if (assigned && has) return ok({ slug });
  if (!assigned && !has) return ok({ slug });
  const nextIds = assigned
    ? [...current, topicId]
    : current.filter((id) => id !== topicId);
  await editProblem(db, {
    slug,
    patch: { topicIds: nextIds },
    markUserEdit: true,
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
  const assigned = payload.assigned ?? true;
  const { db } = await getDb();
  const existing = await getProblem(db, slug);
  if (!existing) {
    throw new Error(
      "Open this problem on LeetCode first — it hasn't been initialised yet, so there's nothing to assign a company to.",
    );
  }
  const current = existing.companyIds as CompanyId[];
  const has = current.includes(companyId);
  if (assigned && has) return ok({ slug });
  if (!assigned && !has) return ok({ slug });
  const nextIds = assigned
    ? [...current, companyId]
    : current.filter((id) => id !== companyId);
  await editProblem(db, {
    slug,
    patch: { companyIds: nextIds },
    markUserEdit: true,
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
    return data;
  });
  // Phase 5: settings live in SQLite. The activeFocus check has to
  // read from SQLite — `data.settings.activeFocus` in the v7 blob is
  // stale after the settings slice and would miss the case where the
  // user set activeFocus post-Phase-5 (so SQLite has it, blob does
  // not).
  const { db } = await getDb();
  const current = await getUserSettings(db);
  if (
    current &&
    current.activeFocus?.kind === "track" &&
    current.activeFocus.id === id
  ) {
    await saveUserSettings(db, { ...current, activeFocus: null });
  }
  return ok({ ok: true });
}

// ---------- Active focus ----------

export interface SetActiveFocusPayload {
  focus: ActiveFocus;
}

export async function setActiveFocusHandler(payload: SetActiveFocusPayload) {
  const { db } = await getDb();
  const current = await getUserSettings(db);
  if (!current) {
    throw new Error("setActiveFocusHandler: no settings row in DB (boot seed missing)");
  }
  const saved = await saveUserSettings(db, {
    ...current,
    activeFocus: payload.focus,
  });
  return ok({ settings: saved });
}

// ---------- Track launch tracking ----------

export interface TrackQuestionLaunchPayload {
  slug: string;
  trackId: string;
  groupId: string;
}

/** Records that the user launched a problem from a track context. Pins
 * the active group on the StudySetProgress aggregate so the user's
 * "where am I" pointer stays aligned across surfaces. */
export async function trackQuestionLaunch(payload: TrackQuestionLaunchPayload) {
  const slug = payload.slug.trim();
  if (!slug || !payload.trackId || !payload.groupId) {
    return ok({ tracked: false });
  }
  await mutateAppData((data) => {
    markSlugLaunched(
      data as unknown as Parameters<typeof markSlugLaunched>[0],
      asStudySetId(payload.trackId),
      asSetGroupId(payload.groupId),
      asProblemSlug(slug),
      nowIso(),
    );
    return data;
  });
  return ok({ tracked: true });
}

// ---------- Pre-v7 backup ----------

export async function consumePreV7BackupHandler() {
  const result = await readLocalStorage([PRE_V7_BACKUP_KEY]);
  const blob = result[PRE_V7_BACKUP_KEY];
  if (!blob) return ok({ backup: null });
  await removeLocalStorage([PRE_V7_BACKUP_KEY]);
  return ok({ backup: blob });
}
