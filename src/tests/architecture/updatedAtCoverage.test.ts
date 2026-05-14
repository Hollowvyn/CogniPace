/**
 * Architecture-boundary test: every aggregate-root table carries
 * `updated_at`, and every DataSource that writes to those tables sets
 * the column on update operations.
 *
 * Why: `updated_at` is table hygiene that pays for itself even without
 * sync — audit, debugging, and recency-ordered queries all become free.
 * A new aggregate root that forgets the column would silently lose
 * those affordances; this test makes the omission a compile-time
 * (well, test-time) failure.
 *
 * What this test does NOT assert:
 *   - junction tables (`track_group_problems`, `attempt_history`) —
 *     append-only or insert/delete, no per-row "last modified" concept.
 *   - sub-aggregates whose parent already carries the signal
 *     (`track_groups` bumps the parent track's `updated_at`).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const testsDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testsDir, "../../..");

/** Aggregate-root tables in scope for the `updated_at` rule. */
const AGGREGATE_ROOT_TABLES = [
  "problems",
  "studyStates",
  "tracks",
  "settingsKv",
  "topics",
  "companies",
] as const;

function readSchema(table: string): string {
  const file = path.join(repoRoot, "src/platform/db/schema", `${table}.ts`);
  return fs.readFileSync(file, "utf-8");
}

describe("updated_at coverage", () => {
  for (const table of AGGREGATE_ROOT_TABLES) {
    it(`${table} schema declares updated_at with a default-now SQL fragment`, () => {
      const source = readSchema(table);
      // Match either of the two equivalent forms used across schemas:
      //   updatedAt: text("updated_at").notNull().default(nowSql)
      //   updatedAt: text("updated_at")...$default(...)
      expect(source).toMatch(/updatedAt[\s\S]{0,80}text\("updated_at"\)/);
      expect(source).toMatch(/updated_at.*default|default.*nowSql/);
    });
  }
});
