/** Service-worker handlers for Track CRUD operations. */
import { getUserSettings, saveUserSettings } from "@features/settings/server";
import { getDb } from "@platform/db/instance";
import { asTrackId } from "@shared/ids";

import {
  createTrack,
  deleteTrack,
  getTrackHeader,
  updateTrack,
} from "../data/datasource/TrackDataSource";

export interface CreateTrackPayload {
  name: string;
  description?: string;
}

export async function createTrackHandler(
  payload: CreateTrackPayload,
): Promise<{ id: string }> {
  const { db } = await getDb();
  const track = await createTrack(db, {
    name: payload.name,
    description: payload.description,
  });
  return { id: track.id };
}

export interface UpdateTrackPayload {
  id: string;
  name?: string;
  description?: string;
  enabled?: boolean;
}

export async function updateTrackHandler(
  payload: UpdateTrackPayload,
): Promise<{ ok: true } | { ok: false; reason: "not-found" }> {
  const id = asTrackId(payload.id);
  const { db } = await getDb();
  const existing = await getTrackHeader(db, id);
  if (!existing) return { ok: false as const, reason: "not-found" as const };
  const patch: Parameters<typeof updateTrack>[2] = {};
  if (payload.name !== undefined) patch.name = payload.name;
  if (payload.description !== undefined) patch.description = payload.description;
  if (payload.enabled !== undefined) patch.enabled = payload.enabled;
  await updateTrack(db, id, patch);
  return { ok: true as const };
}

export interface DeleteTrackPayload {
  id: string;
}

export async function deleteTrackHandler(
  payload: DeleteTrackPayload,
): Promise<{ ok: true } | { ok: false; reason: "not-found" | "curated" }> {
  const id = asTrackId(payload.id);
  const { db } = await getDb();
  const existing = await getTrackHeader(db, id);
  if (!existing) return { ok: false as const, reason: "not-found" as const };
  if (existing.isCurated) return { ok: false as const, reason: "curated" as const };
  // FK CASCADE wipes groups + group_problems automatically.
  await deleteTrack(db, id);
  // If the deleted track was the active focus, clear it.
  const current = await getUserSettings(db);
  if (current && current.activeTrackId === id) {
    await saveUserSettings(db, { ...current, activeTrackId: null });
  }
  return { ok: true as const };
}
