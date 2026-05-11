/**
 * Phase 2 verification — proves the Drizzle schema round-trips correctly
 * against a real SQLite engine. Runs the drizzle-kit migration on an
 * in-memory better-sqlite3 DB, inserts one row per table, selects each
 * back, and asserts:
 *
 * 1. Rows are flat objects (`{ id, name }`), NOT nested (`{ id: { id, name } }`)
 *    or tuple-shaped (`[id, name]`). This is the charter's lesson #1 trap.
 * 2. SQL defaults fire (timestamps, "Untitled", "Unknown", "", 0/1, true/false).
 * 3. Drizzle `.$default()` JSON defaults fire (empty arrays/objects).
 * 4. Foreign-key cascades work (deleting a problem removes its study_state).
 * 5. JSON columns round-trip (insert object, read it back as the same object).
 *
 * This runs against better-sqlite3, NOT sqlite-wasm. Phase 3 will repeat
 * these assertions against the wasm driver via the sqlite-proxy adapter.
 *
 * Run: `npx tsx scripts/verify-drizzle-schema.ts`
 * Exits 0 on success, 1 on any failure.
 */
import { strict as assert } from "node:assert";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import Database from "better-sqlite3";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

import * as schema from "../src/data/db/schema";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = path.resolve(__dirname, "../src/data/db/migrations");

const sqlite = new Database(":memory:");
sqlite.pragma("foreign_keys = ON");
const db = drizzle(sqlite, { schema, casing: "snake_case" });

migrate(db, { migrationsFolder });

const checks: Array<{ label: string; fn: () => void | Promise<void> }> = [];
const check = (label: string, fn: () => void | Promise<void>) => {
  checks.push({ label, fn });
};

const isFlatObject = (row: unknown, expectedKeys: readonly string[]) => {
  assert.ok(
    row && typeof row === "object" && !Array.isArray(row),
    `row must be a flat object, got: ${JSON.stringify(row)}`,
  );
  const keys = Object.keys(row as object).sort();
  assert.deepEqual(
    keys,
    [...expectedKeys].sort(),
    `keys mismatch — got [${keys.join(", ")}], expected [${expectedKeys.join(", ")}]`,
  );
  for (const [k, v] of Object.entries(row as Record<string, unknown>)) {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const nestedKeys = Object.keys(v);
      assert.ok(
        nestedKeys.length === 0 ||
          nestedKeys.every((nk) => typeof nk === "string"),
        `column "${k}" looks nested: ${JSON.stringify(v)}`,
      );
    }
  }
};

check("topics: insert + flat-object select", () => {
  db.insert(schema.topics)
    .values({ id: "arrays", name: "Arrays" })
    .run();
  const [row] = db.select().from(schema.topics).all();
  isFlatObject(row, ["id", "name"]);
  assert.equal(row.id, "arrays");
  assert.equal(row.name, "Arrays");
});

check("companies: insert + flat-object select", () => {
  db.insert(schema.companies).values({ id: "google", name: "Google" }).run();
  const [row] = db.select().from(schema.companies).all();
  isFlatObject(row, ["id", "name"]);
});

check("problems: defaults fire (title/difficulty/url/booleans/JSON)", () => {
  db.insert(schema.problems).values({ slug: "two-sum" }).run();
  const [row] = db
    .select()
    .from(schema.problems)
    .where(eq(schema.problems.slug, "two-sum"))
    .all();
  isFlatObject(row, [
    "slug",
    "leetcodeId",
    "title",
    "difficulty",
    "isPremium",
    "url",
    "topicIds",
    "companyIds",
    "userEdits",
    "createdAt",
    "updatedAt",
  ]);
  assert.equal(row.slug, "two-sum");
  assert.equal(row.leetcodeId, null);
  assert.equal(row.title, "Untitled");
  assert.equal(row.difficulty, "Unknown");
  assert.equal(row.isPremium, false);
  assert.equal(row.url, "");
  assert.deepEqual(row.topicIds, []);
  assert.deepEqual(row.companyIds, []);
  assert.deepEqual(row.userEdits, {});
  assert.match(
    row.createdAt,
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
    "createdAt should be ISO 8601 UTC",
  );
  assert.match(row.updatedAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
});

check("problems: explicit values + JSON round-trip", () => {
  db.insert(schema.problems)
    .values({
      slug: "three-sum",
      leetcodeId: "15",
      title: "3Sum",
      difficulty: "Medium",
      url: "https://leetcode.com/problems/3sum/",
      topicIds: ["arrays", "two-pointers"],
      companyIds: ["google", "meta"],
      userEdits: { title: true },
    })
    .run();
  const [row] = db
    .select()
    .from(schema.problems)
    .where(eq(schema.problems.slug, "three-sum"))
    .all();
  assert.equal(row.title, "3Sum");
  assert.equal(row.difficulty, "Medium");
  assert.deepEqual(row.topicIds, ["arrays", "two-pointers"]);
  assert.deepEqual(row.companyIds, ["google", "meta"]);
  assert.deepEqual(row.userEdits, { title: true });
});

check("study_states: insert with defaults + nullable FSRS scalars", () => {
  db.insert(schema.studyStates)
    .values({ problemSlug: "two-sum" })
    .run();
  const [row] = db.select().from(schema.studyStates).all();
  assert.equal(row.problemSlug, "two-sum");
  assert.equal(row.suspended, false);
  assert.deepEqual(row.tags, []);
  assert.equal(row.fsrsDue, null);
  assert.equal(row.fsrsStability, null);
  assert.equal(row.fsrsState, null);
  assert.equal(row.notes, null);
});

check("attempt_history: insert + auto-increment id + JSON log snapshot", () => {
  db.insert(schema.attemptHistory)
    .values({
      problemSlug: "two-sum",
      reviewedAt: "2026-05-11T12:00:00.000Z",
      rating: 2,
      mode: "FULL_SOLVE",
      solveTimeMs: 180_000,
      logSnapshot: { notes: "ran clean", timeComplexity: "O(n)" },
    })
    .run();
  const [row] = db.select().from(schema.attemptHistory).all();
  assert.equal(typeof row.id, "number");
  assert.equal(row.id, 1);
  assert.equal(row.rating, 2);
  assert.equal(row.mode, "FULL_SOLVE");
  assert.deepEqual(row.logSnapshot, {
    notes: "ran clean",
    timeComplexity: "O(n)",
  });
});

check("tracks: defaults fire + insert with description", () => {
  db.insert(schema.tracks)
    .values({ id: "blind75", isCurated: true, description: "The Blind 75" })
    .run();
  const [row] = db
    .select()
    .from(schema.tracks)
    .where(eq(schema.tracks.id, "blind75"))
    .all();
  assert.equal(row.id, "blind75");
  assert.equal(row.name, "Untitled Track");
  assert.equal(row.description, "The Blind 75");
  assert.equal(row.enabled, true);
  assert.equal(row.isCurated, true);
  assert.equal(row.orderIndex, null);
});

check("track_groups + track_group_problems: composite PK + FK ordering", () => {
  db.insert(schema.trackGroups)
    .values({
      id: "blind75-arrays",
      trackId: "blind75",
      topicId: "arrays",
      orderIndex: 0,
    })
    .run();
  db.insert(schema.trackGroupProblems)
    .values([
      {
        groupId: "blind75-arrays",
        problemSlug: "two-sum",
        orderIndex: 0,
      },
      {
        groupId: "blind75-arrays",
        problemSlug: "three-sum",
        orderIndex: 1,
      },
    ])
    .run();
  const groups = db.select().from(schema.trackGroups).all();
  assert.equal(groups.length, 1);
  assert.equal(groups[0].topicId, "arrays");
  const memberships = db
    .select()
    .from(schema.trackGroupProblems)
    .all();
  assert.equal(memberships.length, 2);
  assert.equal(memberships[0].orderIndex, 0);
  assert.equal(memberships[1].orderIndex, 1);
});

check("settings_kv: insert + select JSON-encoded user settings", () => {
  const settings = { dailyQuestionGoal: 5, studyMode: "freestyle" };
  db.insert(schema.settingsKv)
    .values({ key: "user_settings", value: JSON.stringify(settings) })
    .run();
  const [row] = db
    .select()
    .from(schema.settingsKv)
    .where(eq(schema.settingsKv.key, "user_settings"))
    .all();
  isFlatObject(row, ["key", "value", "updatedAt"]);
  assert.deepEqual(JSON.parse(row.value), settings);
});

check("FK cascade: deleting problem cascades to study_states + attempt_history", () => {
  db.insert(schema.problems).values({ slug: "cascade-victim" }).run();
  db.insert(schema.studyStates)
    .values({ problemSlug: "cascade-victim" })
    .run();
  db.insert(schema.attemptHistory)
    .values({
      problemSlug: "cascade-victim",
      reviewedAt: "2026-05-11T12:00:00.000Z",
      rating: 1,
      mode: "FULL_SOLVE",
    })
    .run();

  db.delete(schema.problems)
    .where(eq(schema.problems.slug, "cascade-victim"))
    .run();

  const remainingStates = db
    .select()
    .from(schema.studyStates)
    .where(eq(schema.studyStates.problemSlug, "cascade-victim"))
    .all();
  const remainingAttempts = db
    .select()
    .from(schema.attemptHistory)
    .where(eq(schema.attemptHistory.problemSlug, "cascade-victim"))
    .all();
  assert.equal(remainingStates.length, 0, "study_states should cascade-delete");
  assert.equal(
    remainingAttempts.length,
    0,
    "attempt_history should cascade through study_states",
  );
});

check("FK restrict: cannot delete a problem referenced by track_group_problems", () => {
  assert.throws(
    () => {
      db.delete(schema.problems)
        .where(eq(schema.problems.slug, "three-sum"))
        .run();
    },
    /FOREIGN KEY constraint failed/,
    "expected RESTRICT to block delete",
  );
});

check("FK set-null: deleting a topic nulls out track_groups.topic_id", () => {
  db.delete(schema.topics).where(eq(schema.topics.id, "arrays")).run();
  const [group] = db
    .select()
    .from(schema.trackGroups)
    .where(eq(schema.trackGroups.id, "blind75-arrays"))
    .all();
  assert.equal(group.topicId, null, "topic_id should be SET NULL");
});

check("db.query RQB: nested track → groups → problems read", async () => {
  const tracksWithGroups = await db.query.tracks.findMany({
    where: eq(schema.tracks.id, "blind75"),
    with: {
      groups: {
        with: {
          problems: true,
        },
      },
    },
  });
  assert.equal(tracksWithGroups.length, 1);
  const [track] = tracksWithGroups;
  assert.equal(track.id, "blind75");
  assert.equal(track.groups.length, 1);
  assert.equal(
    track.groups[0].problems.length,
    2,
    "group should carry both two-sum and three-sum memberships",
  );
});

async function runAll() {
  let failed = 0;
  for (const { label, fn } of checks) {
    try {
      await fn();
      console.log(`✓ ${label}`);
    } catch (err) {
      failed += 1;
      console.error(`✗ ${label}`);
      console.error(err);
    }
  }

  console.log(`\n${checks.length - failed}/${checks.length} checks passed`);
  if (failed > 0) {
    process.exit(1);
  }
}

void runAll();
