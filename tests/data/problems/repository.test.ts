/**
 * Problems repository tests. Better-sqlite3, fast.
 *
 * Pinned behaviours:
 *  - listProblems alphabetises by title
 *  - getProblem returns undefined on miss (not error)
 *  - importProblem inserts new + merges existing (sticky user-edits)
 *  - editProblem flags userEdits on touched fields
 *  - bulkImportProblems is idempotent (ON CONFLICT DO NOTHING)
 *  - removeProblem deletes; throws on missing
 *  - JSON columns (topicIds/companyIds/userEdits) round-trip
 */
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { beforeEach, describe, expect, it } from "vitest";

import * as schema from "../../../src/data/db/schema";
import {
  bulkImportProblems,
  editProblem,
  getProblem,
  getProblemsBySlugs,
  importProblem,
  listProblems,
  removeProblem,
  upsertProblem,
} from "../../../src/data/problems/repository";
import {
  asCompanyId,
  asProblemSlug,
  asTopicId,
} from "../../../src/domain/common/ids";

import type { Db } from "../../../src/data/db/client";
import type { Problem } from "../../../src/domain/types";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = path.resolve(
  __dirname,
  "../../../src/data/db/migrations",
);

function freshDb(): Db {
  const sqlite = new Database(":memory:");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder });
  return db as unknown as Db;
}

function makeProblem(slug: string, overrides: Partial<Problem> = {}): Problem {
  const now = "2026-05-11T12:00:00.000Z";
  return {
    id: slug,
    leetcodeSlug: slug,
    slug,
    title: slug,
    difficulty: "Unknown",
    isPremium: false,
    url: `https://leetcode.com/problems/${slug}/`,
    topics: [],
    topicIds: [],
    companyIds: [],
    sourceSet: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("problems repository", () => {
  let db: Db;
  beforeEach(() => {
    db = freshDb();
  });

  it("listProblems returns alphabetised problems", async () => {
    await importProblem(db, { slug: "zebra", title: "Zebra Problem" });
    await importProblem(db, { slug: "alpha", title: "Alpha Problem" });
    await importProblem(db, { slug: "mango", title: "Mango Problem" });
    const rows = await listProblems(db);
    expect(rows.map((p) => p.title)).toEqual([
      "Alpha Problem",
      "Mango Problem",
      "Zebra Problem",
    ]);
  });

  it("getProblem returns undefined for missing slug (not an error)", async () => {
    await importProblem(db, { slug: "two-sum", title: "Two Sum" });
    const found = await getProblem(db, asProblemSlug("two-sum"));
    expect(found?.title).toBe("Two Sum");
    const missing = await getProblem(db, asProblemSlug("ghost"));
    expect(missing).toBeUndefined();
  });

  it("importProblem inserts new with defaults derived from slug", async () => {
    const p = await importProblem(db, { slug: "two-sum" });
    expect(p.slug).toBe("two-sum");
    expect(p.title).toBe("Two Sum");
    expect(p.url).toContain("two-sum");
    expect(p.difficulty).toBe("Unknown");
    expect(p.isPremium).toBe(false);
    expect(p.topicIds).toEqual([]);
  });

  it("importProblem merges existing rows without clobbering user-edits", async () => {
    // Initial import.
    await importProblem(db, {
      slug: "two-sum",
      title: "Two Sum",
      difficulty: "Easy",
      topicIds: ["arrays"],
    });
    // User edits the title — applies sticky flag.
    await editProblem(db, {
      slug: "two-sum",
      patch: { title: "User-Renamed Two Sum" },
    });
    // Re-import (e.g. page-detect) attempts to overwrite title.
    const final = await importProblem(db, {
      slug: "two-sum",
      title: "LeetCode Two Sum",
      difficulty: "Medium",
      topicIds: ["arrays", "hash-map"],
    });
    expect(final.title).toBe("User-Renamed Two Sum");
    // Untouched fields take the import (difficulty was not user-edited).
    expect(final.difficulty).toBe("Medium");
  });

  it("editProblem flags touched fields in userEdits", async () => {
    await importProblem(db, { slug: "two-sum", title: "Two Sum" });
    const edited = await editProblem(db, {
      slug: "two-sum",
      patch: { title: "Renamed", difficulty: "Hard" },
    });
    expect(edited.userEdits?.title).toBe(true);
    expect(edited.userEdits?.difficulty).toBe(true);
    expect(edited.userEdits?.url).toBeUndefined();
  });

  it("editProblem throws when the slug doesn't exist (loud failure)", async () => {
    await expect(
      editProblem(db, { slug: "ghost", patch: { title: "X" } }),
    ).rejects.toThrow(/no problem with slug "ghost"/);
  });

  it("JSON cols (topicIds/companyIds/userEdits) round-trip as parsed values", async () => {
    await importProblem(db, {
      slug: "three-sum",
      title: "3Sum",
      topicIds: [asTopicId("arrays"), asTopicId("two-pointers")],
      companyIds: [asCompanyId("google"), asCompanyId("meta")],
    });
    await editProblem(db, {
      slug: "three-sum",
      patch: { difficulty: "Medium" },
    });
    const row = await getProblem(db, asProblemSlug("three-sum"));
    expect(row?.topicIds).toEqual(["arrays", "two-pointers"]);
    expect(row?.companyIds).toEqual(["google", "meta"]);
    expect(row?.userEdits?.difficulty).toBe(true);
  });

  it("upsertProblem replaces all fields", async () => {
    await importProblem(db, { slug: "p", title: "Initial" });
    const replaced = await upsertProblem(
      db,
      makeProblem("p", {
        title: "Replaced",
        difficulty: "Hard",
        isPremium: true,
      }),
    );
    expect(replaced.title).toBe("Replaced");
    expect(replaced.difficulty).toBe("Hard");
    expect(replaced.isPremium).toBe(true);
  });

  it("bulkImportProblems is idempotent across multiple boots", async () => {
    const catalog = [makeProblem("two-sum", { title: "Two Sum" })];
    const firstInserted = await bulkImportProblems(db, catalog);
    expect(firstInserted).toBe(1);
    const secondInserted = await bulkImportProblems(db, catalog);
    expect(secondInserted).toBe(0);
    expect((await listProblems(db)).length).toBe(1);
  });

  it("getProblemsBySlugs returns rows in input order; skips missing", async () => {
    await importProblem(db, { slug: "a" });
    await importProblem(db, { slug: "b" });
    await importProblem(db, { slug: "c" });
    const got = await getProblemsBySlugs(db, ["c", "ghost", "a"]);
    expect(got.map((p) => p.slug)).toEqual(["c", "a"]);
  });

  it("removeProblem deletes; throws on missing", async () => {
    await importProblem(db, { slug: "to-remove" });
    await removeProblem(db, asProblemSlug("to-remove"));
    expect(await getProblem(db, asProblemSlug("to-remove"))).toBeUndefined();
    await expect(
      removeProblem(db, asProblemSlug("never-existed")),
    ).rejects.toThrow(/no problem with slug "never-existed"/);
  });
});
