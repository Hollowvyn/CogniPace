/**
 * End-to-end integration: Drizzle ORM → sqlite-proxy → @sqlite.org/sqlite-wasm.
 *
 * Confirms the full read/write path returns FLAT OBJECTS (charter
 * lesson #1), not nested wrappers or tuple-shaped values, when going
 * through the real wasm driver.
 */
import { readFile } from "node:fs/promises";
import * as path from "node:path";

import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";

import { createDb, type DbHandle } from "../../../src/data/db/client";
import * as schema from "../../../src/data/db/schema";

const MIGRATION_PATH = path.resolve(
  __dirname,
  "../../../src/data/db/migrations/0000_initial.sql",
);

let migrationSql = "";

beforeAll(async () => {
  migrationSql = await readFile(MIGRATION_PATH, "utf-8");
});

async function freshDb(): Promise<DbHandle> {
  return createDb({ migrationSql });
}

describe("Drizzle on @sqlite.org/sqlite-wasm", () => {
  it("topics: insert + select returns a flat { id, name } object", async () => {
    const { db } = await freshDb();
    await db.insert(schema.topics).values({ id: "arrays", name: "Arrays" });
    const rows = await db.select().from(schema.topics);
    expect(rows).toHaveLength(1);
    const [row] = rows;
    expect(row).toEqual({ id: "arrays", name: "Arrays" });
    expect(Object.keys(row).sort()).toEqual(["id", "name"]);
  });

  it("problems: SQL defaults fire through the wasm path", async () => {
    const { db } = await freshDb();
    await db.insert(schema.problems).values({ slug: "two-sum" });
    const [row] = await db
      .select()
      .from(schema.problems)
      .where(eq(schema.problems.slug, "two-sum"));
    expect(row.title).toBe("Untitled");
    expect(row.difficulty).toBe("Unknown");
    expect(row.url).toBe("");
    expect(row.isPremium).toBe(false);
    expect(row.topicIds).toEqual([]);
    expect(row.companyIds).toEqual([]);
    expect(row.userEdits).toEqual({});
    expect(row.createdAt).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
    );
  });

  it("problems: JSON columns round-trip as parsed values, not strings", async () => {
    const { db } = await freshDb();
    await db.insert(schema.problems).values({
      slug: "three-sum",
      title: "3Sum",
      topicIds: ["arrays", "two-pointers"],
      companyIds: ["google"],
      userEdits: { title: true },
    });
    const [row] = await db
      .select()
      .from(schema.problems)
      .where(eq(schema.problems.slug, "three-sum"));
    expect(Array.isArray(row.topicIds)).toBe(true);
    expect(row.topicIds).toEqual(["arrays", "two-pointers"]);
    expect(row.companyIds).toEqual(["google"]);
    expect(row.userEdits).toEqual({ title: true });
  });

  it("FK cascade fires through the wasm path", async () => {
    const { db, rawDb } = await freshDb();
    rawDb.exec("PRAGMA foreign_keys = ON");

    await db.insert(schema.problems).values({ slug: "cascade-victim" });
    await db
      .insert(schema.studyStates)
      .values({ problemSlug: "cascade-victim" });
    await db.insert(schema.attemptHistory).values({
      problemSlug: "cascade-victim",
      reviewedAt: "2026-05-11T12:00:00.000Z",
      rating: 1,
      mode: "FULL_SOLVE",
    });

    await db
      .delete(schema.problems)
      .where(eq(schema.problems.slug, "cascade-victim"));

    const states = await db
      .select()
      .from(schema.studyStates)
      .where(eq(schema.studyStates.problemSlug, "cascade-victim"));
    const attempts = await db
      .select()
      .from(schema.attemptHistory)
      .where(eq(schema.attemptHistory.problemSlug, "cascade-victim"));
    expect(states).toEqual([]);
    expect(attempts).toEqual([]);
  });

  it("RQB nested track → groups → problems read works through wasm", async () => {
    const { db, rawDb } = await freshDb();
    rawDb.exec("PRAGMA foreign_keys = ON");

    await db.insert(schema.topics).values({ id: "arrays", name: "Arrays" });
    await db.insert(schema.problems).values({ slug: "two-sum" });
    await db
      .insert(schema.tracks)
      .values({ id: "blind75", name: "Blind 75", isCurated: true });
    await db.insert(schema.trackGroups).values({
      id: "blind75-arrays",
      trackId: "blind75",
      topicId: "arrays",
      orderIndex: 0,
    });
    await db.insert(schema.trackGroupProblems).values({
      groupId: "blind75-arrays",
      problemSlug: "two-sum",
      orderIndex: 0,
    });

    const tracks = await db.query.tracks.findMany({
      where: eq(schema.tracks.id, "blind75"),
      with: { groups: { with: { problems: true } } },
    });
    expect(tracks).toHaveLength(1);
    expect(tracks[0].name).toBe("Blind 75");
    expect(tracks[0].groups).toHaveLength(1);
    expect(tracks[0].groups[0].problems).toHaveLength(1);
    expect(tracks[0].groups[0].problems[0].problemSlug).toBe("two-sum");
  });
});
