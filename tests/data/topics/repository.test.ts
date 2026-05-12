/**
 * Topics repository tests. Runs against better-sqlite3 for speed; the
 * wasm-backed runtime is covered by the dbDebug page's Repos checks.
 *
 * What we pin:
 *  - listTopics returns flat domain Topic objects, alphabetised
 *  - getTopic by id is round-tripped (and missing => undefined)
 *  - upsertTopic inserts new and updates existing without flipping isCustom
 *  - removeTopic deletes custom topics and refuses curated ones
 *  - seedCatalogTopics is idempotent (no duplicate-key error on re-seed)
 */
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import * as schema from "@platform/db/schema";
import { asTopicId } from "@shared/ids";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { beforeEach, describe, expect, it } from "vitest";

import {
  getTopic,
  listTopics,
  removeTopic,
  seedCatalogTopics,
  upsertTopic,
} from "../../../src/data/topics/repository";

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
  // The repo type is the async-proxy Db; better-sqlite3's drizzle has the
  // same API surface for select/insert/update/delete.
  return db as unknown as Db;
}

describe("topics repository", () => {
  let db: Db;
  beforeEach(() => {
    db = freshDb();
  });

  it("listTopics returns alphabetised flat domain Topic objects", async () => {
    await upsertTopic(db, { name: "Zebra", isCustom: false });
    await upsertTopic(db, { name: "Alpha", isCustom: false });
    await upsertTopic(db, { name: "Mango", isCustom: true });
    const topics = await listTopics(db);
    expect(topics.map((t) => t.name)).toEqual(["Alpha", "Mango", "Zebra"]);
    expect(Object.keys(topics[0]).sort()).toEqual([
      "createdAt",
      "id",
      "isCustom",
      "name",
      "updatedAt",
    ]);
    expect(topics[1].isCustom).toBe(true);
  });

  it("getTopic returns undefined for missing ids (not an error)", async () => {
    await upsertTopic(db, { name: "Arrays", isCustom: false });
    const found = await getTopic(db, asTopicId("arrays"));
    expect(found?.name).toBe("Arrays");
    const missing = await getTopic(db, asTopicId("not-a-real-topic"));
    expect(missing).toBeUndefined();
  });

  it("upsertTopic inserts new and renames existing without flipping isCustom", async () => {
    const inserted = await upsertTopic(db, {
      name: "Original",
      isCustom: true,
    });
    expect(inserted.isCustom).toBe(true);
    const renamed = await upsertTopic(db, {
      id: inserted.id,
      name: "Renamed",
      description: "now with description",
    });
    expect(renamed.id).toBe(inserted.id);
    expect(renamed.name).toBe("Renamed");
    expect(renamed.description).toBe("now with description");
    // isCustom must NOT be reset to false even though the upsert call
    // didn't pass it explicitly — preserving the original discriminator
    // is the whole point of ON CONFLICT carrying it forward.
    expect(renamed.isCustom).toBe(true);
  });

  it("upsertTopic surfaces empty-name as a thrown error (repos throw)", async () => {
    await expect(upsertTopic(db, { name: "   " })).rejects.toThrow(
      /name must be non-empty/,
    );
  });

  it("removeTopic deletes custom topics but refuses curated ones", async () => {
    const custom = await upsertTopic(db, { name: "Custom", isCustom: true });
    const curated = await upsertTopic(db, {
      name: "Curated",
      isCustom: false,
    });

    await removeTopic(db, custom.id);
    expect(await getTopic(db, custom.id)).toBeUndefined();

    await expect(removeTopic(db, curated.id)).rejects.toThrow(
      /refusing to remove curated/,
    );
  });

  it("removeTopic throws when the topic doesn't exist (loud failure)", async () => {
    await expect(removeTopic(db, asTopicId("ghost"))).rejects.toThrow(
      /topic not found/,
    );
  });

  it("seedCatalogTopics is idempotent across multiple boots", async () => {
    const seeds = [
      { id: asTopicId("array"), name: "Array" },
      { id: asTopicId("graph"), name: "Graph", description: "Edges & nodes" },
    ];
    await seedCatalogTopics(db, seeds);
    await seedCatalogTopics(db, seeds);
    await seedCatalogTopics(db, seeds);
    const topics = await listTopics(db);
    expect(topics).toHaveLength(2);
    const graph = topics.find((t) => t.id === "graph");
    expect(graph?.description).toBe("Edges & nodes");
    expect(graph?.isCustom).toBe(false);
  });

  it("seedCatalogTopics does NOT clobber a user's rename of a curated topic", async () => {
    // Boot 1: seed canonical "Array"
    await seedCatalogTopics(db, [{ id: asTopicId("array"), name: "Array" }]);
    // User renames it to "Arrays" (still isCustom=false — it's the same row).
    await upsertTopic(db, {
      id: asTopicId("array"),
      name: "Arrays",
    });
    // Boot 2: SW wakes, seed runs again — the rename should NOT be reverted.
    await seedCatalogTopics(db, [{ id: asTopicId("array"), name: "Array" }]);
    const [row] = await listTopics(db);
    expect(row.name).toBe("Arrays");
  });
});
