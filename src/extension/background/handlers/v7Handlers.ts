/**
 * v7 message handlers — single landing zone for Problem / Track / Topic /
 * Company / ActiveFocus mutations. SQLite-backed writes go straight
 * through their repo; legacy v7-blob writes still pass through the
 * `mutateAppData` funnel for the slices that haven't migrated yet
 * (Phase 8 will rip the funnel).
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
import { PRE_V7_BACKUP_KEY } from "../../../data/repositories/appDataRepository";
import {
  getUserSettings,
  saveUserSettings,
} from "../../../data/settings/repository";
import { upsertTopic } from "../../../data/topics/repository";
import {
  createTrack,
  deleteTrack,
  getTrackHeader,
  updateTrack,
} from "../../../data/tracks/repository";
import {
  asCompanyId,
  asProblemSlug,
  asTopicId,
  asTrackId,
  type CompanyId,
  type TopicId,
} from "../../../domain/common/ids";
import { ok } from "../responses";

import type { ActiveFocus } from "../../../domain/active-focus/model";
import type { ProblemEditPatch } from "../../../domain/problems/operations";


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

// ---------- Track CRUD ----------

export interface CreateTrackPayload {
  name: string;
  description?: string;
}

/** Creates a fresh user-defined Track in SQLite. Slim charter shape —
 * no `kind` discriminator, no derived filter. If users want a
 * filtered list (company / topic / difficulty), the library tab
 * already filters on those facets. */
export async function createTrackHandler(payload: CreateTrackPayload) {
  const { db } = await getDb();
  const track = await createTrack(db, {
    name: payload.name,
    description: payload.description,
  });
  return ok({ id: track.id });
}

export interface UpdateTrackPayload {
  id: string;
  name?: string;
  description?: string;
  enabled?: boolean;
}

export async function updateTrackHandler(payload: UpdateTrackPayload) {
  const id = asTrackId(payload.id);
  const { db } = await getDb();
  const existing = await getTrackHeader(db, id);
  if (!existing) {
    return ok({ ok: false, reason: "not-found" });
  }
  const patch: Parameters<typeof updateTrack>[2] = {};
  if (payload.name !== undefined) patch.name = payload.name;
  if (payload.description !== undefined) patch.description = payload.description;
  if (payload.enabled !== undefined) patch.enabled = payload.enabled;
  await updateTrack(db, id, patch);
  return ok({ ok: true });
}

export interface DeleteTrackPayload {
  id: string;
}

export async function deleteTrackHandler(payload: DeleteTrackPayload) {
  const id = asTrackId(payload.id);
  const { db } = await getDb();
  const existing = await getTrackHeader(db, id);
  if (!existing) {
    return ok({ ok: false, reason: "not-found" });
  }
  if (existing.isCurated) {
    return ok({ ok: false, reason: "curated" });
  }
  // FK CASCADE wipes groups + group_problems automatically.
  await deleteTrack(db, id);
  // If the deleted track was the active focus, clear it.
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

// ---------- Pre-v7 backup ----------

export async function consumePreV7BackupHandler() {
  const result = await readLocalStorage([PRE_V7_BACKUP_KEY]);
  const blob = result[PRE_V7_BACKUP_KEY];
  if (!blob) return ok({ backup: null });
  await removeLocalStorage([PRE_V7_BACKUP_KEY]);
  return ok({ backup: blob });
}
