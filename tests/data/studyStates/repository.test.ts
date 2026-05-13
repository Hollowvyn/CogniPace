/**
 * StudyState repository tests. Better-sqlite3 in-memory for speed; the
 * wasm-backed runtime is exercised by the dbDebug page's Repos checks.
 */
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import {
  appendAttempt,
  ensureStudyState,
  getStudyState,
  listAttempts,
  listStudyStates,
  removeStudyState,
  upsertStudyState,
 createDefaultStudyState } from "@features/study/server";
import * as schema from "@platform/db/schema";
import { asProblemSlug } from "@shared/ids";
import Database from "better-sqlite3";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { beforeEach, describe, expect, it } from "vitest";


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

async function seedProblem(db: Db, slug: string): Promise<void> {
  await db.insert(schema.problems).values({ slug });
}

describe("studyStates repository", () => {
  let db: Db;
  beforeEach(() => {
    db = freshDb();
  });

  it("getStudyState returns undefined for un-materialised slugs", async () => {
    await seedProblem(db, "two-sum");
    const found = await getStudyState(db, asProblemSlug("two-sum"));
    expect(found).toBeUndefined();
  });

  it("ensureStudyState materialises a default + is idempotent", async () => {
    await seedProblem(db, "two-sum");
    const slug = asProblemSlug("two-sum");
    const first = await ensureStudyState(db, slug);
    expect(first.suspended).toBe(false);
    expect(first.tags).toEqual([]);
    expect(first.attemptHistory).toEqual([]);
    const second = await ensureStudyState(db, slug);
    expect(second.createdAt).toBe(first.createdAt);
  });

  it("upsertStudyState round-trips every domain field", async () => {
    await seedProblem(db, "two-sum");
    const slug = asProblemSlug("two-sum");
    const incoming = {
      ...createDefaultStudyState("2026-05-12T00:00:00.000Z"),
      suspended: true,
      tags: ["personal", "tricky"],
      bestTimeMs: 12_000,
      lastSolveTimeMs: 18_000,
      lastRating: 2 as const,
      confidence: 0.7,
      interviewPattern: "Two pointers",
      timeComplexity: "O(n)",
      spaceComplexity: "O(1)",
      languages: "Python, TS",
      notes: "remember the edge case",
      fsrsCard: {
        due: "2026-05-15T00:00:00.000Z",
        stability: 1.5,
        difficulty: 4.3,
        elapsedDays: 0,
        scheduledDays: 3,
        learningSteps: 0,
        reps: 1,
        lapses: 0,
        state: "Review" as const,
        lastReview: "2026-05-12T00:00:00.000Z",
      },
    };
    const saved = await upsertStudyState(db, slug, incoming);
    expect(saved.suspended).toBe(true);
    expect(saved.tags).toEqual(["personal", "tricky"]);
    expect(saved.bestTimeMs).toBe(12_000);
    expect(saved.lastRating).toBe(2);
    expect(saved.confidence).toBe(0.7);
    expect(saved.fsrsCard?.stability).toBe(1.5);
    expect(saved.fsrsCard?.state).toBe("Review");
    expect(saved.fsrsCard?.lastReview).toBe("2026-05-12T00:00:00.000Z");
    expect(saved.interviewPattern).toBe("Two pointers");
    expect(saved.timeComplexity).toBe("O(n)");
    expect(saved.notes).toBe("remember the edge case");
  });

  it("upsertStudyState clears optional fields when domain omits them", async () => {
    await seedProblem(db, "two-sum");
    const slug = asProblemSlug("two-sum");
    await upsertStudyState(db, slug, {
      ...createDefaultStudyState("2026-05-12T00:00:00.000Z"),
      lastRating: 3,
      notes: "had it",
    });
    await upsertStudyState(
      db,
      slug,
      createDefaultStudyState("2026-05-12T00:00:00.000Z"),
    );
    const after = await getStudyState(db, slug);
    expect(after?.lastRating).toBeUndefined();
    expect(after?.notes).toBeUndefined();
  });

  it("appendAttempt persists + listAttempts returns in chronological order", async () => {
    await seedProblem(db, "two-sum");
    const slug = asProblemSlug("two-sum");
    await ensureStudyState(db, slug);
    await appendAttempt(db, slug, {
      reviewedAt: "2026-05-10T10:00:00.000Z",
      rating: 1,
      mode: "FULL_SOLVE",
    });
    await appendAttempt(db, slug, {
      reviewedAt: "2026-05-12T10:00:00.000Z",
      rating: 3,
      solveTimeMs: 9_000,
      mode: "RECALL",
      logSnapshot: { notes: "got it" },
    });
    await appendAttempt(db, slug, {
      reviewedAt: "2026-05-11T10:00:00.000Z",
      rating: 2,
      mode: "FULL_SOLVE",
    });
    const all = await listAttempts(db, slug);
    expect(all.map((a) => a.reviewedAt)).toEqual([
      "2026-05-10T10:00:00.000Z",
      "2026-05-11T10:00:00.000Z",
      "2026-05-12T10:00:00.000Z",
    ]);
    const latestFirst = await listAttempts(db, slug, { descending: true });
    expect(latestFirst[0].rating).toBe(3);
    expect(latestFirst[0].solveTimeMs).toBe(9_000);
    expect(latestFirst[0].logSnapshot?.notes).toBe("got it");
  });

  it("getStudyState returns attempts alongside the state row", async () => {
    await seedProblem(db, "two-sum");
    const slug = asProblemSlug("two-sum");
    await ensureStudyState(db, slug);
    await appendAttempt(db, slug, {
      reviewedAt: "2026-05-10T10:00:00.000Z",
      rating: 1,
      mode: "FULL_SOLVE",
    });
    const state = await getStudyState(db, slug);
    expect(state?.attemptHistory).toHaveLength(1);
    expect(state?.attemptHistory[0].rating).toBe(1);
  });

  it("removeStudyState cascade-deletes attempts via the FK", async () => {
    await seedProblem(db, "two-sum");
    const slug = asProblemSlug("two-sum");
    await ensureStudyState(db, slug);
    await appendAttempt(db, slug, {
      reviewedAt: "2026-05-10T10:00:00.000Z",
      rating: 1,
      mode: "FULL_SOLVE",
    });
    await removeStudyState(db, slug);
    const remaining = await db
      .select()
      .from(schema.attemptHistory)
      .where(eq(schema.attemptHistory.problemSlug, slug));
    expect(remaining).toEqual([]);
  });

  it("deleting the parent problem cascades through study_state + attempt_history", async () => {
    await seedProblem(db, "two-sum");
    const slug = asProblemSlug("two-sum");
    await ensureStudyState(db, slug);
    await appendAttempt(db, slug, {
      reviewedAt: "2026-05-10T10:00:00.000Z",
      rating: 1,
      mode: "FULL_SOLVE",
    });
    await db.delete(schema.problems).where(eq(schema.problems.slug, slug));
    const state = await getStudyState(db, slug);
    expect(state).toBeUndefined();
    const attempts = await db
      .select()
      .from(schema.attemptHistory)
      .where(eq(schema.attemptHistory.problemSlug, slug));
    expect(attempts).toEqual([]);
  });

  it("listStudyStates returns the full map keyed by problem slug", async () => {
    await seedProblem(db, "two-sum");
    await seedProblem(db, "three-sum");
    await ensureStudyState(db, asProblemSlug("two-sum"));
    await ensureStudyState(db, asProblemSlug("three-sum"));
    await appendAttempt(db, asProblemSlug("two-sum"), {
      reviewedAt: "2026-05-10T10:00:00.000Z",
      rating: 1,
      mode: "FULL_SOLVE",
    });
    const map = await listStudyStates(db);
    expect(Object.keys(map).sort()).toEqual(["three-sum", "two-sum"]);
    expect(map["two-sum"]?.attemptHistory).toHaveLength(1);
    expect(map["three-sum"]?.attemptHistory).toHaveLength(0);
  });

  it("removeStudyState throws when nothing to remove (charter lesson #5)", async () => {
    await expect(
      removeStudyState(db, asProblemSlug("does-not-exist")),
    ).rejects.toThrow(/no study state with slug/);
  });
});
