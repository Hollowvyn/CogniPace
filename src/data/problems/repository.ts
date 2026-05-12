/**
 * Problems repository — Phase 5 SSoT for the Problem aggregate.
 *
 * Bridges the SQLite `problems` table (one row per slug, with JSON
 * `topic_ids` / `company_ids` / `user_edits` columns) to the v7
 * runtime `Problem` domain type. The repo functions own the conversion
 * in both directions and emit the round-tripped value on write so the
 * UI's next read matches (charter lesson #6).
 *
 * Write-path categories:
 *  - `upsertProblem` — generic upsert; respects existing rows; flags
 *    `user_edits` only when the caller asks via `markUserEdit`.
 *  - `importProblem` — for catalog seed / page-detect imports;
 *    preserves user-edited fields (sticky edits) per
 *    `mergeImported` from `src/domain/problems/operations.ts`.
 *  - `editProblem` — user-driven edits; flags every touched field in
 *    `user_edits` per `applyEdit`.
 *  - `seedCatalogProblems` — idempotent bulk insert at SW boot. Uses
 *    `ON CONFLICT DO NOTHING` so subsequent boots don't clobber rows
 *    the user has edited.
 *  - `bulkImportProblems` — bulk import for course imports (handlers
 *    that call importProblemsIntoSet).
 *
 * The repo throws on missing rows in functions where the absence is
 * an error (deleteProblem, getProblemOrThrow). `getProblem` returns
 * undefined for the common "lookup by slug" case so callers don't
 * need defensive guards.
 */
import { eq, inArray, sql } from "drizzle-orm";

import {
  asCompanyId,
  asProblemSlug,
  asTopicId,
  type CompanyId,
  type ProblemSlug,
  type TopicId,
} from "../../domain/common/ids";
import { nowIso } from "../../domain/common/time";
import {
  leetcodeProblemUrl,
  slugToTitle,
} from "../../domain/problems/helpers";
import {
  applyEdit,
  mergeImported,
  type ProblemEditPatch,
} from "../../domain/problems/operations";
import * as schema from "../db/schema";

import type {
  Problem as StrictProblem,
  ProblemEditFlags,
} from "../../domain/problems/model";
import type { Difficulty, Problem } from "../../domain/types";
import type { Db } from "../db/client";

type ProblemRow = typeof schema.problems.$inferSelect;

/**
 * Schema row → domain Problem. v6 transitional fields (id,
 * leetcodeSlug, topics, sourceSet) are derived from slug or set to
 * empty until the broader v6/v7 cleanup phases.
 */
function toProblem(row: ProblemRow): Problem {
  const userEdits =
    row.userEdits && Object.keys(row.userEdits).length > 0
      ? (row.userEdits as ProblemEditFlags)
      : undefined;
  const transitional: Problem = {
    id: row.slug,
    leetcodeSlug: row.slug,
    slug: row.slug,
    title: row.title,
    difficulty: row.difficulty as Difficulty,
    isPremium: row.isPremium,
    url: row.url,
    topics: [],
    topicIds: row.topicIds,
    companyIds: row.companyIds,
    sourceSet: [],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
  if (row.leetcodeId) transitional.leetcodeId = row.leetcodeId;
  if (userEdits) {
    (transitional as Problem & { userEdits?: ProblemEditFlags }).userEdits =
      userEdits;
  }
  return transitional;
}

/** Domain Problem → schema insert/update payload. Drops v6 fields. */
function toRow(
  problem: Problem,
): typeof schema.problems.$inferInsert {
  const userEdits =
    (problem as Problem & { userEdits?: ProblemEditFlags }).userEdits ?? {};
  return {
    slug: problem.slug,
    leetcodeId: problem.leetcodeId ?? null,
    title: problem.title,
    difficulty: problem.difficulty,
    isPremium: problem.isPremium ?? false,
    url: problem.url,
    topicIds: problem.topicIds,
    companyIds: problem.companyIds,
    userEdits: userEdits as Record<string, true>,
    createdAt: problem.createdAt,
    updatedAt: problem.updatedAt,
  };
}

/**
 * Returns every problem, alphabetised by title for stable listing in
 * the dashboard library view. Used by handler hydration paths.
 */
export async function listProblems(db: Db): Promise<Problem[]> {
  const rows = await db.select().from(schema.problems);
  return rows.map(toProblem).sort((a, b) => a.title.localeCompare(b.title));
}

/** Lookup by slug. Returns undefined when missing (not an error). */
export async function getProblem(
  db: Db,
  slug: ProblemSlug,
): Promise<Problem | undefined> {
  const [row] = await db
    .select()
    .from(schema.problems)
    .where(eq(schema.problems.slug, slug));
  return row ? toProblem(row) : undefined;
}

/** Batch lookup. Returns problems in the order their slugs appear in
 * the input (missing slugs are skipped silently). */
export async function getProblemsBySlugs(
  db: Db,
  slugs: readonly string[],
): Promise<Problem[]> {
  if (slugs.length === 0) return [];
  const rows = await db
    .select()
    .from(schema.problems)
    .where(inArray(schema.problems.slug, slugs as string[]));
  const bySlug = new Map(rows.map((r) => [r.slug, toProblem(r)]));
  const out: Problem[] = [];
  for (const slug of slugs) {
    const p = bySlug.get(slug);
    if (p) out.push(p);
  }
  return out;
}

export interface ImportProblemArgs {
  slug: string;
  leetcodeId?: string;
  title?: string;
  difficulty?: Difficulty;
  isPremium?: boolean;
  url?: string;
  topicIds?: ReadonlyArray<TopicId | string>;
  companyIds?: ReadonlyArray<CompanyId | string>;
}

/**
 * Insert-or-merge a Problem from an import source (curated seed,
 * LeetCode page detect, manual add). Existing user-edited fields are
 * preserved (sticky). Missing fields fall back to derived defaults
 * (slug → title, slug → URL).
 *
 * Equivalent to v7Repo.importProblem + appDataRepository.ensureProblem.
 */
export async function importProblem(
  db: Db,
  args: ImportProblemArgs,
): Promise<Problem> {
  const slug = asProblemSlug(args.slug);
  if (!slug) throw new Error("importProblem: slug cannot be empty");
  const now = nowIso();

  const existing = await getProblem(db, slug);
  const patch = buildPatch(args);

  let next: Problem;
  if (existing) {
    const merged = mergeImported(
      existing as unknown as StrictProblem,
      patch,
      now,
    );
    next = { ...existing, ...(merged as unknown as Problem) };
  } else {
    next = {
      id: slug,
      leetcodeSlug: slug,
      slug,
      title: args.title ?? slugToTitle(slug),
      difficulty: args.difficulty ?? "Unknown",
      isPremium: args.isPremium ?? false,
      url: args.url ?? leetcodeProblemUrl(slug),
      topics: [],
      topicIds: brandTopicIds(args.topicIds),
      companyIds: brandCompanyIds(args.companyIds),
      sourceSet: [],
      createdAt: now,
      updatedAt: now,
    };
    if (args.leetcodeId) next.leetcodeId = args.leetcodeId;
  }

  await upsertRow(db, toRow(next));
  return next;
}

export interface EditProblemArgs {
  slug: string;
  patch: ProblemEditPatch;
  /** Default true; system-driven edits should pass false. */
  markUserEdit?: boolean;
}

/**
 * User-driven edit. Touched fields are flagged in `userEdits` so
 * subsequent imports preserve them. Throws when the slug doesn't
 * exist — callers should pre-create via `importProblem` for new rows.
 */
export async function editProblem(
  db: Db,
  args: EditProblemArgs,
): Promise<Problem> {
  const slug = asProblemSlug(args.slug);
  const existing = await getProblem(db, slug);
  if (!existing) {
    throw new Error(`editProblem: no problem with slug "${slug}"`);
  }
  const markUserEdit = args.markUserEdit ?? true;
  const edited = applyEdit(
    existing as unknown as StrictProblem,
    args.patch,
    nowIso(),
    markUserEdit,
  );
  // Stitch the v6 transitional fields back from `existing` since
  // applyEdit returns the slim v7 shape.
  const next: Problem = { ...existing, ...(edited as unknown as Problem) };
  await upsertRow(db, toRow(next));
  return next;
}

/**
 * Generic upsert by slug. Used by code paths that already have a
 * complete Problem object (e.g. addProblemByInput, course imports).
 * If the slug exists, the existing row is replaced with the supplied
 * fields. If absent, a new row is inserted.
 */
export async function upsertProblem(
  db: Db,
  problem: Problem,
): Promise<Problem> {
  await upsertRow(db, toRow(problem));
  const reread = await getProblem(db, asProblemSlug(problem.slug));
  if (!reread) {
    throw new Error(
      `upsertProblem: post-insert re-read returned undefined for "${problem.slug}"`,
    );
  }
  return reread;
}

/**
 * Bulk import — used by SW boot catalog seeding and by course import
 * handlers. Inserts with `ON CONFLICT DO NOTHING` so existing rows
 * (potentially user-edited) are not clobbered. Returns the number of
 * actually-inserted rows (the caller can detect "no-op" boots).
 */
export async function bulkImportProblems(
  db: Db,
  problems: readonly Problem[],
): Promise<number> {
  if (problems.length === 0) return 0;
  const rows = problems.map(toRow);
  // Snapshot the existing slug set so we can report inserted count.
  const existingRows = await db
    .select({ slug: schema.problems.slug })
    .from(schema.problems);
  const existingSlugs = new Set(existingRows.map((r) => r.slug));
  await db
    .insert(schema.problems)
    .values(rows)
    .onConflictDoNothing({ target: schema.problems.slug });
  return rows.filter((r) => !existingSlugs.has(r.slug)).length;
}

/**
 * SW-boot idempotent catalog seed. Identical to bulkImportProblems
 * but named so the caller's intent is clear at the boot site.
 */
export async function seedCatalogProblems(
  db: Db,
  catalog: readonly Problem[],
): Promise<number> {
  return bulkImportProblems(db, catalog);
}

/** Removes a problem by slug. Cascade behaviour on FKs (study_states,
 * track_group_problems) is configured in schema.ts. Throws when the
 * slug doesn't exist. */
export async function removeProblem(
  db: Db,
  slug: ProblemSlug,
): Promise<void> {
  const existing = await getProblem(db, slug);
  if (!existing) {
    throw new Error(`removeProblem: no problem with slug "${slug}"`);
  }
  await db.delete(schema.problems).where(eq(schema.problems.slug, slug));
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function upsertRow(
  db: Db,
  row: typeof schema.problems.$inferInsert,
): Promise<void> {
  await db
    .insert(schema.problems)
    .values(row)
    .onConflictDoUpdate({
      target: schema.problems.slug,
      set: {
        leetcodeId: row.leetcodeId,
        title: row.title,
        difficulty: row.difficulty,
        isPremium: row.isPremium,
        url: row.url,
        topicIds: row.topicIds,
        companyIds: row.companyIds,
        userEdits: row.userEdits,
        updatedAt: row.updatedAt ?? sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`,
      },
    });
}

function buildPatch(args: ImportProblemArgs): ProblemEditPatch {
  const patch: ProblemEditPatch = {};
  if (args.title !== undefined) patch.title = args.title;
  if (args.difficulty !== undefined) patch.difficulty = args.difficulty;
  if (args.url !== undefined) patch.url = args.url;
  if (args.isPremium !== undefined) patch.isPremium = args.isPremium;
  if (args.leetcodeId !== undefined) patch.leetcodeId = args.leetcodeId;
  const topicIds = brandTopicIds(args.topicIds);
  if (topicIds.length > 0) patch.topicIds = topicIds;
  const companyIds = brandCompanyIds(args.companyIds);
  if (companyIds.length > 0) patch.companyIds = companyIds;
  return patch;
}

function brandTopicIds(
  input?: ReadonlyArray<TopicId | string>,
): TopicId[] {
  if (!input) return [];
  return input
    .map((v) => (typeof v === "string" ? asTopicId(v) : v))
    .filter((v) => v.length > 0);
}

function brandCompanyIds(
  input?: ReadonlyArray<CompanyId | string>,
): CompanyId[] {
  if (!input) return [];
  return input
    .map((v) => (typeof v === "string" ? asCompanyId(v) : v))
    .filter((v) => v.length > 0);
}
