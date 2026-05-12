/**
 * Tracks repository tests. Better-sqlite3 in-memory for speed; the
 * wasm-backed runtime is exercised by the dbDebug page's Repos checks.
 *
 * Pins:
 *  - Curated tracks survive `deleteTrack` refusal.
 *  - Group/group-problem ordering survives reorder calls.
 *  - FK cascades wipe groups + memberships when a track is deleted.
 *  - The catalog seed is idempotent across re-runs (no duplicate rows).
 *  - `listMembershipsForSlug` answers "which tracks contain this problem".
 */
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import * as schema from "@platform/db/schema";
import {
  asProblemSlug,
  asTrackGroupId,
  asTrackId,
} from "@shared/ids";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { beforeEach, describe, expect, it } from "vitest";

import {
  addGroup,
  addProblemToGroup,
  createTrack,
  deleteTrack,
  getTrack,
  getTrackHeader,
  listMembershipsForSlug,
  listTracks,
  removeGroup,
  removeProblemFromGroup,
  reorderGroupProblems,
  reorderGroups,
  seedCatalogTracks,
  setTrackOrder,
  updateGroup,
  updateTrack,
} from "../../../src/data/tracks/repository";

import type { Db } from "@platform/db/client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = path.resolve(
  __dirname,
  "../../../src/platform/db/migrations",
);

function freshDb(): Db {
  const sqlite = new Database(":memory:");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder });
  return db as unknown as Db;
}

async function seedProblems(db: Db, slugs: string[]): Promise<void> {
  for (const slug of slugs) {
    await db.insert(schema.problems).values({ slug });
  }
}

describe("tracks repository", () => {
  let db: Db;
  beforeEach(() => {
    db = freshDb();
  });

  it("createTrack lands at MAX(order_index) + 1 by default", async () => {
    const first = await createTrack(db, { name: "Track A" });
    const second = await createTrack(db, { name: "Track B" });
    expect(first.orderIndex).toBe(0);
    expect(second.orderIndex).toBe(1);
  });

  it("createTrack rejects empty names", async () => {
    await expect(createTrack(db, { name: "   " })).rejects.toThrow(/non-empty/);
  });

  it("updateTrack patches mutable fields and bumps updated_at", async () => {
    const created = await createTrack(db, {
      name: "Original",
      description: "desc",
    });
    const updated = await updateTrack(db, created.id, {
      name: "Renamed",
      description: "",
      enabled: false,
    });
    expect(updated.name).toBe("Renamed");
    expect(updated.description).toBeUndefined();
    expect(updated.enabled).toBe(false);
    expect(new Date(updated.updatedAt).getTime()).toBeGreaterThanOrEqual(
      new Date(created.updatedAt).getTime(),
    );
  });

  it("deleteTrack refuses curated tracks (charter — disable instead)", async () => {
    await createTrack(db, {
      id: asTrackId("blind75"),
      name: "Blind 75",
      isCurated: true,
    });
    await expect(deleteTrack(db, asTrackId("blind75"))).rejects.toThrow(
      /curated/i,
    );
  });

  it("deleteTrack FK-cascades groups and group-problems", async () => {
    await seedProblems(db, ["two-sum", "valid-anagram"]);
    const track = await createTrack(db, { name: "My Plan" });
    const group = await addGroup(db, { trackId: track.id, name: "Arrays" });
    await addProblemToGroup(db, {
      groupId: group.id,
      problemSlug: asProblemSlug("two-sum"),
    });
    await addProblemToGroup(db, {
      groupId: group.id,
      problemSlug: asProblemSlug("valid-anagram"),
    });
    await deleteTrack(db, track.id);
    const groups = await db.select().from(schema.trackGroups);
    const memberships = await db.select().from(schema.trackGroupProblems);
    expect(groups).toEqual([]);
    expect(memberships).toEqual([]);
  });

  it("addProblemToGroup is idempotent on (group_id, slug)", async () => {
    await seedProblems(db, ["two-sum"]);
    const track = await createTrack(db, { name: "Plan" });
    const group = await addGroup(db, { trackId: track.id });
    await addProblemToGroup(db, {
      groupId: group.id,
      problemSlug: asProblemSlug("two-sum"),
    });
    await addProblemToGroup(db, {
      groupId: group.id,
      problemSlug: asProblemSlug("two-sum"),
    });
    const rows = await db.select().from(schema.trackGroupProblems);
    expect(rows.length).toBe(1);
  });

  it("addProblemToGroup throws when the parent group is missing", async () => {
    await seedProblems(db, ["two-sum"]);
    await expect(
      addProblemToGroup(db, {
        groupId: asTrackGroupId("ghost-group"),
        problemSlug: asProblemSlug("two-sum"),
      }),
    ).rejects.toThrow(/group not found/);
  });

  it("reorderGroupProblems honours the requested order; tail keeps unknowns", async () => {
    await seedProblems(db, ["a", "b", "c"]);
    const track = await createTrack(db, { name: "Plan" });
    const group = await addGroup(db, { trackId: track.id });
    for (const slug of ["a", "b", "c"] as const) {
      await addProblemToGroup(db, {
        groupId: group.id,
        problemSlug: asProblemSlug(slug),
      });
    }
    await reorderGroupProblems(db, group.id, [
      asProblemSlug("c"),
      asProblemSlug("a"),
    ]);
    const rows = await db
      .select()
      .from(schema.trackGroupProblems)
      .orderBy(schema.trackGroupProblems.orderIndex);
    expect(rows.map((r) => r.problemSlug)).toEqual(["c", "a", "b"]);
  });

  it("reorderGroups reorders within a single track and bumps updated_at", async () => {
    const track = await createTrack(db, { name: "Plan" });
    const a = await addGroup(db, { trackId: track.id, name: "A" });
    const b = await addGroup(db, { trackId: track.id, name: "B" });
    const c = await addGroup(db, { trackId: track.id, name: "C" });
    await reorderGroups(db, track.id, [c.id, a.id, b.id]);
    const got = await getTrack(db, track.id);
    expect(got?.groups.map((g) => g.id)).toEqual([c.id, a.id, b.id]);
  });

  it("setTrackOrder controls the user-facing track list ordering", async () => {
    const a = await createTrack(db, { name: "A" });
    const b = await createTrack(db, { name: "B" });
    const c = await createTrack(db, { name: "C" });
    await setTrackOrder(db, [c.id, a.id, b.id]);
    const listed = await listTracks(db);
    expect(listed.map((t) => t.id)).toEqual([c.id, a.id, b.id]);
  });

  it("listTracks composes the full track + groups + problems tree via RQB", async () => {
    await seedProblems(db, ["two-sum", "valid-anagram"]);
    const track = await createTrack(db, {
      name: "Course",
      description: "demo",
    });
    const group = await addGroup(db, { trackId: track.id, name: "Arrays" });
    await addProblemToGroup(db, {
      groupId: group.id,
      problemSlug: asProblemSlug("two-sum"),
    });
    await addProblemToGroup(db, {
      groupId: group.id,
      problemSlug: asProblemSlug("valid-anagram"),
    });
    const listed = await listTracks(db);
    expect(listed.length).toBe(1);
    expect(listed[0].groups.length).toBe(1);
    expect(listed[0].groups[0].problems.map((p) => p.problemSlug)).toEqual([
      "two-sum",
      "valid-anagram",
    ]);
  });

  it("removeProblemFromGroup wipes only that membership", async () => {
    await seedProblems(db, ["two-sum", "valid-anagram"]);
    const track = await createTrack(db, { name: "Plan" });
    const group = await addGroup(db, { trackId: track.id });
    await addProblemToGroup(db, {
      groupId: group.id,
      problemSlug: asProblemSlug("two-sum"),
    });
    await addProblemToGroup(db, {
      groupId: group.id,
      problemSlug: asProblemSlug("valid-anagram"),
    });
    await removeProblemFromGroup(db, group.id, asProblemSlug("two-sum"));
    const rows = await db.select().from(schema.trackGroupProblems);
    expect(rows.map((r) => r.problemSlug)).toEqual(["valid-anagram"]);
  });

  it("listMembershipsForSlug answers 'which tracks contain this problem?'", async () => {
    await seedProblems(db, ["two-sum"]);
    const trackA = await createTrack(db, { name: "A" });
    const groupA = await addGroup(db, { trackId: trackA.id });
    const trackB = await createTrack(db, { name: "B" });
    const groupB = await addGroup(db, { trackId: trackB.id });
    await addProblemToGroup(db, {
      groupId: groupA.id,
      problemSlug: asProblemSlug("two-sum"),
    });
    await addProblemToGroup(db, {
      groupId: groupB.id,
      problemSlug: asProblemSlug("two-sum"),
    });
    const memberships = await listMembershipsForSlug(
      db,
      asProblemSlug("two-sum"),
    );
    expect(memberships.length).toBe(2);
    expect(memberships.map((m) => m.groupId).sort()).toEqual(
      [groupA.id, groupB.id].sort(),
    );
  });

  it("updateGroup patches topic + description; removeGroup wipes only that group", async () => {
    const track = await createTrack(db, { name: "Plan" });
    const a = await addGroup(db, { trackId: track.id, name: "A" });
    const b = await addGroup(db, { trackId: track.id, name: "B" });
    const patched = await updateGroup(db, a.id, {
      name: "Renamed",
      description: "desc",
    });
    expect(patched.name).toBe("Renamed");
    expect(patched.description).toBe("desc");
    await removeGroup(db, b.id);
    const surviving = await db.select().from(schema.trackGroups);
    expect(surviving.map((r) => r.id)).toEqual([a.id]);
  });

  it("seedCatalogTracks is idempotent across re-runs (ON CONFLICT DO NOTHING)", async () => {
    await seedProblems(db, ["two-sum"]);
    const seed = {
      tracks: [
        {
          id: asTrackId("demo"),
          name: "Demo",
          description: "test",
          orderIndex: 0,
        },
      ],
      groups: [
        {
          id: asTrackGroupId("demo::0"),
          trackId: asTrackId("demo"),
          name: "Arrays",
          orderIndex: 0,
        },
      ],
      groupProblems: [
        {
          groupId: asTrackGroupId("demo::0"),
          problemSlug: asProblemSlug("two-sum"),
          orderIndex: 0,
        },
      ],
    };
    await seedCatalogTracks(db, seed);
    await seedCatalogTracks(db, seed);
    const tracks = await db.select().from(schema.tracks);
    const groups = await db.select().from(schema.trackGroups);
    const memberships = await db.select().from(schema.trackGroupProblems);
    expect(tracks.length).toBe(1);
    expect(groups.length).toBe(1);
    expect(memberships.length).toBe(1);
    const header = await getTrackHeader(db, asTrackId("demo"));
    expect(header?.isCurated).toBe(true);
  });
});
