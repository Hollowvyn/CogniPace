/**
 * Tracks repository — SQLite source of truth for the Track + TrackGroup
 * + TrackGroupProblem trio.
 *
 * Charter rules in force:
 *   - Repos throw on failure; SW message boundary translates into a
 *     `{ ok: false, error }` envelope. No defensive try/catch.
 *   - Row → domain conversion is named: `toTrack`, `toTrackGroup`,
 *     `toTrackGroupProblem`.
 *   - Reads compose via simple `select()` everywhere except `listTracks`
 *     / `getTrack`, which use the relational query builder so a single
 *     SQLite round trip returns the full track + groups + problems tree
 *     (the one place RQB earns its keep, per the Phase 1 data-shape doc).
 *
 * Order semantics:
 *   - `tracks.order_index`: user-controlled list ordering. Curated seeds
 *     get sequential indexes; user creates land at `MAX + 1`.
 *   - `track_groups.order_index`: sort order within a track.
 *   - `track_group_problems.order_index`: sort order within a group.
 *
 * Curated protection:
 *   - `deleteTrack` refuses when `track.isCurated`.
 *   - `updateTrack` allows renaming a curated track (charter's stance:
 *     user can rebrand the list they see). If we ever need to lock the
 *     name on curated tracks, gate it here.
 */
import { and, asc, eq, max, sql } from "drizzle-orm";

import {
  asProblemSlug,
  asTrackGroupId,
  asTrackId,
  newTrackGroupId,
  newTrackId,
  type ProblemSlug,
  type TopicId,
  type TrackGroupId,
  type TrackId,
} from "../../domain/common/ids";
import { nowIso } from "../../domain/common/time";
import * as schema from "../db/schema";

import type {
  Track,
  TrackGroup,
  TrackGroupProblem,
  TrackGroupWithProblems,
  TrackWithGroups,
} from "../../domain/tracks/model";
import type { Db } from "../db/client";

type TrackRow = typeof schema.tracks.$inferSelect;
type TrackGroupRow = typeof schema.trackGroups.$inferSelect;
type TrackGroupProblemRow = typeof schema.trackGroupProblems.$inferSelect;

// ---------- row → domain ----------

export function toTrack(row: TrackRow): Track {
  const track: Track = {
    id: asTrackId(row.id),
    name: row.name,
    enabled: row.enabled,
    isCurated: row.isCurated,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
  if (row.description !== null) track.description = row.description;
  if (row.orderIndex !== null) track.orderIndex = row.orderIndex;
  return track;
}

export function toTrackGroup(row: TrackGroupRow): TrackGroup {
  const group: TrackGroup = {
    id: asTrackGroupId(row.id),
    trackId: asTrackId(row.trackId),
    orderIndex: row.orderIndex,
  };
  if (row.topicId !== null) group.topicId = row.topicId as TopicId;
  if (row.name !== null) group.name = row.name;
  if (row.description !== null) group.description = row.description;
  return group;
}

export function toTrackGroupProblem(
  row: TrackGroupProblemRow,
): TrackGroupProblem {
  return {
    groupId: asTrackGroupId(row.groupId),
    problemSlug: asProblemSlug(row.problemSlug),
    orderIndex: row.orderIndex,
  };
}

// ---------- reads ----------

/** Lists every track with its groups + group problems, ordered by
 * `tracks.order_index` (tracks), `track_groups.order_index` (groups
 * within a track), `track_group_problems.order_index` (problems within
 * a group). Uses RQB — see file header. */
export async function listTracks(db: Db): Promise<TrackWithGroups[]> {
  const rows = await db.query.tracks.findMany({
    orderBy: (t, { asc: a }) => [a(t.orderIndex), a(t.createdAt)],
    with: {
      groups: {
        orderBy: (g, { asc: a }) => [a(g.orderIndex)],
        with: {
          problems: {
            orderBy: (p, { asc: a }) => [a(p.orderIndex)],
          },
        },
      },
    },
  });
  return rows.map(rqbRowToTrackWithGroups);
}

/** Fetches a single track + groups + problems. Returns `undefined` when
 * the id doesn't exist — missing is a legitimate result. */
export async function getTrack(
  db: Db,
  id: TrackId,
): Promise<TrackWithGroups | undefined> {
  const row = await db.query.tracks.findFirst({
    where: (t, { eq: e }) => e(t.id, id),
    with: {
      groups: {
        orderBy: (g, { asc: a }) => [a(g.orderIndex)],
        with: {
          problems: {
            orderBy: (p, { asc: a }) => [a(p.orderIndex)],
          },
        },
      },
    },
  });
  return row ? rqbRowToTrackWithGroups(row) : undefined;
}

/** Plain-row read of a track without its groups; useful for the
 * curated-protection check before mutators. */
export async function getTrackHeader(
  db: Db,
  id: TrackId,
): Promise<Track | undefined> {
  const rows = await db
    .select()
    .from(schema.tracks)
    .where(eq(schema.tracks.id, id));
  return rows[0] ? toTrack(rows[0]) : undefined;
}

/** Returns the group with the given id, or `undefined` when missing. */
export async function getTrackGroup(
  db: Db,
  groupId: TrackGroupId,
): Promise<TrackGroup | undefined> {
  const rows = await db
    .select()
    .from(schema.trackGroups)
    .where(eq(schema.trackGroups.id, groupId));
  return rows[0] ? toTrackGroup(rows[0]) : undefined;
}

// ---------- track CRUD ----------

export interface CreateTrackArgs {
  /** Optional caller-provided id (used by the curated seed for stable
   * deterministic ids). User creations omit this and get a UUID. */
  id?: TrackId;
  name: string;
  description?: string;
  enabled?: boolean;
  isCurated?: boolean;
  /** Optional explicit order index. Omit to land the track at the end
   * of the user-facing list. */
  orderIndex?: number;
}

/** Inserts a new track. Returns the row. Throws if name is empty after trim. */
export async function createTrack(
  db: Db,
  args: CreateTrackArgs,
): Promise<Track> {
  const name = args.name.trim();
  if (!name) {
    throw new Error("createTrack: name must be non-empty");
  }
  const id = args.id ?? newTrackId();
  const orderIndex =
    args.orderIndex !== undefined ? args.orderIndex : await nextTrackOrderIndex(db);
  const now = nowIso();
  await db.insert(schema.tracks).values({
    id,
    name,
    description: args.description ?? null,
    enabled: args.enabled ?? true,
    isCurated: args.isCurated ?? false,
    orderIndex,
    createdAt: now,
    updatedAt: now,
  });
  const saved = await getTrackHeader(db, id);
  if (!saved) {
    throw new Error(`createTrack: insert succeeded but row vanished (id=${id})`);
  }
  return saved;
}

export interface UpdateTrackArgs {
  name?: string;
  description?: string;
  enabled?: boolean;
  orderIndex?: number;
}

/** Patches a track's metadata. Throws when the track doesn't exist —
 * caller is expected to check first if "no-op on missing" is wanted. */
export async function updateTrack(
  db: Db,
  id: TrackId,
  patch: UpdateTrackArgs,
): Promise<Track> {
  const existing = await getTrackHeader(db, id);
  if (!existing) {
    throw new Error(`updateTrack: track not found (id=${id})`);
  }
  const updates: Partial<typeof schema.tracks.$inferInsert> = {
    updatedAt: nowIso(),
  };
  if (patch.name !== undefined) {
    const trimmed = patch.name.trim();
    if (!trimmed) {
      throw new Error("updateTrack: name must be non-empty");
    }
    updates.name = trimmed;
  }
  if (patch.description !== undefined) {
    updates.description = patch.description === "" ? null : patch.description;
  }
  if (patch.enabled !== undefined) updates.enabled = patch.enabled;
  if (patch.orderIndex !== undefined) updates.orderIndex = patch.orderIndex;
  await db.update(schema.tracks).set(updates).where(eq(schema.tracks.id, id));
  const saved = await getTrackHeader(db, id);
  if (!saved) {
    throw new Error(`updateTrack: update succeeded but row vanished (id=${id})`);
  }
  return saved;
}

/** Deletes a non-curated track. FK CASCADE removes track_groups +
 * track_group_problems automatically. Throws on missing or curated. */
export async function deleteTrack(db: Db, id: TrackId): Promise<void> {
  const existing = await getTrackHeader(db, id);
  if (!existing) {
    throw new Error(`deleteTrack: track not found (id=${id})`);
  }
  if (existing.isCurated) {
    throw new Error(
      `deleteTrack: refusing to delete curated track (id=${id}) — disable it instead`,
    );
  }
  await db.delete(schema.tracks).where(eq(schema.tracks.id, id));
}

/** Replaces the user-facing track ordering. Unknown ids are dropped;
 * tracks not present in `ordered` keep their existing order_index but
 * are bumped to the tail. */
export async function setTrackOrder(
  db: Db,
  ordered: TrackId[],
): Promise<void> {
  const present = await db
    .select({ id: schema.tracks.id })
    .from(schema.tracks);
  const known = new Set(present.map((row) => row.id));
  const filtered = ordered.filter((id) => known.has(id));
  let index = 0;
  for (const id of filtered) {
    await db
      .update(schema.tracks)
      .set({ orderIndex: index, updatedAt: nowIso() })
      .where(eq(schema.tracks.id, id));
    index += 1;
  }
  // Append the remainder in their existing order_index ordering.
  const remainder = present
    .map((row) => row.id)
    .filter((id) => !filtered.includes(asTrackId(id)));
  for (const id of remainder) {
    await db
      .update(schema.tracks)
      .set({ orderIndex: index, updatedAt: nowIso() })
      .where(eq(schema.tracks.id, id));
    index += 1;
  }
}

// ---------- group CRUD ----------

export interface AddGroupArgs {
  id?: TrackGroupId;
  trackId: TrackId;
  topicId?: TopicId;
  name?: string;
  description?: string;
  orderIndex?: number;
}

/** Adds a group to a track. Throws when the parent track is missing. */
export async function addGroup(
  db: Db,
  args: AddGroupArgs,
): Promise<TrackGroup> {
  const parent = await getTrackHeader(db, args.trackId);
  if (!parent) {
    throw new Error(`addGroup: track not found (id=${args.trackId})`);
  }
  const id = args.id ?? newTrackGroupId();
  const orderIndex =
    args.orderIndex !== undefined
      ? args.orderIndex
      : await nextGroupOrderIndex(db, args.trackId);
  await db.insert(schema.trackGroups).values({
    id,
    trackId: args.trackId,
    topicId: args.topicId ?? null,
    name: args.name ?? null,
    description: args.description ?? null,
    orderIndex,
  });
  const saved = await getTrackGroup(db, id);
  if (!saved) {
    throw new Error(`addGroup: insert succeeded but row vanished (id=${id})`);
  }
  return saved;
}

export interface UpdateGroupArgs {
  name?: string;
  description?: string;
  topicId?: TopicId | null;
  orderIndex?: number;
}

export async function updateGroup(
  db: Db,
  id: TrackGroupId,
  patch: UpdateGroupArgs,
): Promise<TrackGroup> {
  const existing = await getTrackGroup(db, id);
  if (!existing) {
    throw new Error(`updateGroup: group not found (id=${id})`);
  }
  const updates: Partial<typeof schema.trackGroups.$inferInsert> = {};
  if (patch.name !== undefined) {
    updates.name = patch.name === "" ? null : patch.name;
  }
  if (patch.description !== undefined) {
    updates.description = patch.description === "" ? null : patch.description;
  }
  if (patch.topicId !== undefined) {
    updates.topicId = patch.topicId === null ? null : patch.topicId;
  }
  if (patch.orderIndex !== undefined) updates.orderIndex = patch.orderIndex;
  if (Object.keys(updates).length === 0) return existing;
  await db
    .update(schema.trackGroups)
    .set(updates)
    .where(eq(schema.trackGroups.id, id));
  // Bump parent track's updated_at so consumers see a mutation tick.
  await db
    .update(schema.tracks)
    .set({ updatedAt: nowIso() })
    .where(eq(schema.tracks.id, existing.trackId));
  const saved = await getTrackGroup(db, id);
  if (!saved) {
    throw new Error(`updateGroup: update succeeded but row vanished (id=${id})`);
  }
  return saved;
}

export async function removeGroup(
  db: Db,
  id: TrackGroupId,
): Promise<void> {
  const existing = await getTrackGroup(db, id);
  if (!existing) {
    throw new Error(`removeGroup: group not found (id=${id})`);
  }
  await db.delete(schema.trackGroups).where(eq(schema.trackGroups.id, id));
  await db
    .update(schema.tracks)
    .set({ updatedAt: nowIso() })
    .where(eq(schema.tracks.id, existing.trackId));
}

/** Reorders groups within a track. Unknown ids are dropped; missing
 * ones keep their existing order_index but get bumped to the tail. */
export async function reorderGroups(
  db: Db,
  trackId: TrackId,
  ordered: TrackGroupId[],
): Promise<void> {
  const existing = await db
    .select({ id: schema.trackGroups.id })
    .from(schema.trackGroups)
    .where(eq(schema.trackGroups.trackId, trackId));
  const known = new Set(existing.map((row) => row.id));
  const filtered = ordered.filter((id) => known.has(id));
  let index = 0;
  for (const id of filtered) {
    await db
      .update(schema.trackGroups)
      .set({ orderIndex: index })
      .where(eq(schema.trackGroups.id, id));
    index += 1;
  }
  const remainder = existing
    .map((row) => row.id)
    .filter((id) => !filtered.includes(asTrackGroupId(id)));
  for (const id of remainder) {
    await db
      .update(schema.trackGroups)
      .set({ orderIndex: index })
      .where(eq(schema.trackGroups.id, id));
    index += 1;
  }
  await db
    .update(schema.tracks)
    .set({ updatedAt: nowIso() })
    .where(eq(schema.tracks.id, trackId));
}

// ---------- group-problem membership ----------

export interface AddProblemToGroupArgs {
  groupId: TrackGroupId;
  problemSlug: ProblemSlug;
  /** Defaults to `MAX(order_index) + 1` within the group. */
  orderIndex?: number;
}

/** Adds a problem to a group. Idempotent — already-present membership
 * is a no-op (the existing order_index stays). Throws when the group
 * doesn't exist; the schema FK on `problem_slug` enforces the problem
 * row exists. */
export async function addProblemToGroup(
  db: Db,
  args: AddProblemToGroupArgs,
): Promise<TrackGroupProblem> {
  const existingMembership = await db
    .select()
    .from(schema.trackGroupProblems)
    .where(
      and(
        eq(schema.trackGroupProblems.groupId, args.groupId),
        eq(schema.trackGroupProblems.problemSlug, args.problemSlug),
      ),
    );
  if (existingMembership[0]) {
    return toTrackGroupProblem(existingMembership[0]);
  }
  const group = await getTrackGroup(db, args.groupId);
  if (!group) {
    throw new Error(
      `addProblemToGroup: group not found (id=${args.groupId})`,
    );
  }
  const orderIndex =
    args.orderIndex !== undefined
      ? args.orderIndex
      : await nextGroupProblemOrderIndex(db, args.groupId);
  await db.insert(schema.trackGroupProblems).values({
    groupId: args.groupId,
    problemSlug: args.problemSlug,
    orderIndex,
  });
  return {
    groupId: args.groupId,
    problemSlug: args.problemSlug,
    orderIndex,
  };
}

export async function removeProblemFromGroup(
  db: Db,
  groupId: TrackGroupId,
  problemSlug: ProblemSlug,
): Promise<void> {
  await db
    .delete(schema.trackGroupProblems)
    .where(
      and(
        eq(schema.trackGroupProblems.groupId, groupId),
        eq(schema.trackGroupProblems.problemSlug, problemSlug),
      ),
    );
}

/** Reorders problems within a group. Unknown slugs are dropped; missing
 * ones keep their existing index but are bumped to the tail. */
export async function reorderGroupProblems(
  db: Db,
  groupId: TrackGroupId,
  ordered: ProblemSlug[],
): Promise<void> {
  const existing = await db
    .select({ slug: schema.trackGroupProblems.problemSlug })
    .from(schema.trackGroupProblems)
    .where(eq(schema.trackGroupProblems.groupId, groupId));
  const known = new Set(existing.map((row) => row.slug));
  const filtered = ordered.filter((slug) => known.has(slug));
  let index = 0;
  for (const slug of filtered) {
    await db
      .update(schema.trackGroupProblems)
      .set({ orderIndex: index })
      .where(
        and(
          eq(schema.trackGroupProblems.groupId, groupId),
          eq(schema.trackGroupProblems.problemSlug, slug),
        ),
      );
    index += 1;
  }
  const remainder = existing
    .map((row) => row.slug)
    .filter((slug) => !filtered.includes(asProblemSlug(slug)));
  for (const slug of remainder) {
    await db
      .update(schema.trackGroupProblems)
      .set({ orderIndex: index })
      .where(
        and(
          eq(schema.trackGroupProblems.groupId, groupId),
          eq(schema.trackGroupProblems.problemSlug, slug),
        ),
      );
    index += 1;
  }
}

/** Lists every group membership for a slug — "which tracks contain this
 * problem?". Used by the library's `trackMemberships` column. */
export async function listMembershipsForSlug(
  db: Db,
  slug: ProblemSlug,
): Promise<TrackGroupProblem[]> {
  const rows = await db
    .select()
    .from(schema.trackGroupProblems)
    .where(eq(schema.trackGroupProblems.problemSlug, slug))
    .orderBy(asc(schema.trackGroupProblems.orderIndex));
  return rows.map(toTrackGroupProblem);
}

// ---------- helpers ----------

async function nextTrackOrderIndex(db: Db): Promise<number> {
  const result = await db
    .select({ value: max(schema.tracks.orderIndex) })
    .from(schema.tracks);
  const current = result[0]?.value ?? null;
  return current === null ? 0 : current + 1;
}

async function nextGroupOrderIndex(
  db: Db,
  trackId: TrackId,
): Promise<number> {
  const result = await db
    .select({ value: max(schema.trackGroups.orderIndex) })
    .from(schema.trackGroups)
    .where(eq(schema.trackGroups.trackId, trackId));
  const current = result[0]?.value ?? null;
  return current === null ? 0 : current + 1;
}

async function nextGroupProblemOrderIndex(
  db: Db,
  groupId: TrackGroupId,
): Promise<number> {
  const result = await db
    .select({ value: max(schema.trackGroupProblems.orderIndex) })
    .from(schema.trackGroupProblems)
    .where(eq(schema.trackGroupProblems.groupId, groupId));
  const current = result[0]?.value ?? null;
  return current === null ? 0 : current + 1;
}

interface RqbTrackRow extends TrackRow {
  groups: RqbGroupRow[];
}
interface RqbGroupRow extends TrackGroupRow {
  problems: TrackGroupProblemRow[];
}

function rqbRowToTrackWithGroups(row: RqbTrackRow): TrackWithGroups {
  const base = toTrack(row);
  const groups: TrackGroupWithProblems[] = row.groups.map((groupRow) => {
    const groupBase = toTrackGroup(groupRow);
    return {
      ...groupBase,
      problems: groupRow.problems.map(toTrackGroupProblem),
    };
  });
  return { ...base, groups };
}

// ---------- catalog seed ----------

export interface SeedTrackRow {
  id: TrackId;
  name: string;
  description?: string;
  orderIndex: number;
}

export interface SeedTrackGroupRow {
  id: TrackGroupId;
  trackId: TrackId;
  topicId?: TopicId;
  name?: string;
  orderIndex: number;
}

export interface SeedTrackGroupProblemRow {
  groupId: TrackGroupId;
  problemSlug: ProblemSlug;
  orderIndex: number;
}

export interface SeedTracksInput {
  tracks: ReadonlyArray<SeedTrackRow>;
  groups: ReadonlyArray<SeedTrackGroupRow>;
  groupProblems: ReadonlyArray<SeedTrackGroupProblemRow>;
}

/**
 * Idempotent catalog seed. Inserts curated tracks/groups/group-problems
 * if absent; leaves user-modified rows (or user-renamed curated tracks)
 * intact. `track_group_problems` membership uses `ON CONFLICT DO NOTHING`
 * so re-running the seed never disturbs the user's reorderings within a
 * curated group.
 *
 * Caller must have already seeded the referenced problems (the FK on
 * `track_group_problems.problem_slug` will throw otherwise — fail-loud
 * by design).
 */
export async function seedCatalogTracks(
  db: Db,
  input: SeedTracksInput,
): Promise<void> {
  if (input.tracks.length === 0) return;
  const now = nowIso();
  await db
    .insert(schema.tracks)
    .values(
      input.tracks.map((track) => ({
        id: track.id,
        name: track.name,
        description: track.description ?? null,
        enabled: true,
        isCurated: true,
        orderIndex: track.orderIndex,
        createdAt: now,
        updatedAt: now,
      })),
    )
    .onConflictDoNothing({ target: schema.tracks.id });
  if (input.groups.length > 0) {
    await db
      .insert(schema.trackGroups)
      .values(
        input.groups.map((group) => ({
          id: group.id,
          trackId: group.trackId,
          topicId: group.topicId ?? null,
          name: group.name ?? null,
          description: null,
          orderIndex: group.orderIndex,
        })),
      )
      .onConflictDoNothing({ target: schema.trackGroups.id });
  }
  if (input.groupProblems.length > 0) {
    await db
      .insert(schema.trackGroupProblems)
      .values(
        input.groupProblems.map((membership) => ({
          groupId: membership.groupId,
          problemSlug: membership.problemSlug,
          orderIndex: membership.orderIndex,
        })),
      )
      .onConflictDoNothing({
        target: [
          schema.trackGroupProblems.groupId,
          schema.trackGroupProblems.problemSlug,
        ],
      });
  }
}

// Re-export shared aliases for callers that previously imported from the
// legacy v7 studySetRepository file.
export { sql };
