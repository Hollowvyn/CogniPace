/**
 * Drizzle + sqlite-wasm debug & verification surface. Loaded via
 * dbDebug.html.
 *
 * Two roles:
 *
 * 1. **Verification suite** — a growing set of typed Drizzle assertions
 *    organised by category (Defaults, CRUD lifecycles, Foreign keys,
 *    JSON round-trip, Indexes, RQB). Click "Run all" to confirm
 *    end-to-end data-layer correctness in the real Chrome MV3 runtime.
 *    New checks should be appended to `allChecks` as later phases add
 *    tables / repos / domain code.
 *
 * 2. **Ad-hoc SQL** — textarea + Run button executes against the raw
 *    wasm DB so you can poke at schema, run one-off queries, etc.
 *
 * Boots an in-memory wasm DB via the same `createDb` factory the SW
 * will use in Phase 6, so any wasm / proxy / Drizzle issue reproduces
 * here too. Resets on every reload — no persistence yet.
 */
import {
  bulkImportProblems,
  editProblem,
  getCompany,
  getProblem,
  getTopic,
  importProblem,
  listCatalogCompanySeeds,
  listCatalogTopicSeeds,
  listCompanies,
  listProblems,
  listTopics,
  removeCompany,
  removeProblem,
  removeTopic,
  seedCatalogCompanies,
  seedCatalogTopics,
  upsertCompany,
  upsertTopic,
} from "@features/problems/server";
import { createInitialUserSettings } from "@features/settings";
import {
  getUserSettings,
  saveUserSettings,
  seedInitialSettings,
} from "@features/settings/server";
import {
  appendAttempt,
  ensureStudyState,
  getStudyState,
  upsertStudyState,
} from "@features/study/server";
import { buildTrackCatalogSeed ,
  addGroup as addGroupRepo,
  addProblemToGroup as addProblemToGroupRepo,
  createTrack as createTrackRepo,
  deleteTrack as deleteTrackRepo,
  listTracks as listTracksRepo,
  seedCatalogTracks,
} from "@features/tracks/server";
import { createDb, type DbHandle } from "@platform/db/client";
import migrationSql from "@platform/db/migrations/0000_initial.sql";
import * as schema from "@platform/db/schema";
import {
  base64ToBytes,
  bytesToBase64,
  computeFingerprint,
  deserializeDb,
  serializeDb,
} from "@platform/db/snapshot";
import {
  asCompanyId,
  asProblemSlug,
  asTopicId,
  asTrackId,
} from "@shared/ids";
import { eq, and } from "drizzle-orm";



let handle: DbHandle | undefined;

async function bootDb(): Promise<DbHandle> {
  // foreign_keys is already enabled by createDb; no further setup needed.
  return createDb({
    migrationSql,
    locateWasm: (file) => chrome.runtime.getURL(file),
  });
}

/** Helper for Persistence-category checks: creates a sub-DB inside the
 * same extension page using the same wasm locator the page booted
 * with. Without `locateWasm`, `createDb()` fails in the IIFE bundle
 * because sqlite-wasm's auto-detection can't resolve sqlite3.wasm. */
function createSubDb(opts: { migrationSql?: string } = {}): Promise<DbHandle> {
  return createDb({
    ...opts,
    locateWasm: (file) => chrome.runtime.getURL(file),
  });
}

// ---------------------------------------------------------------------------
// DOM helpers
// ---------------------------------------------------------------------------

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  init?: { text?: string; cls?: string; style?: string },
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (init?.text !== undefined) node.textContent = init.text;
  if (init?.cls) node.className = init.cls;
  if (init?.style) node.setAttribute("style", init.style);
  return node;
}

function setStatus(text: string, ok = true): void {
  const status = document.getElementById("status");
  if (!status) return;
  status.textContent = text;
  status.style.color = ok ? "#0a7d2c" : "#b3261e";
}

function appendOutput(node: Node): void {
  const out = document.getElementById("output");
  if (!out) return;
  out.appendChild(node);
  out.scrollTop = out.scrollHeight;
}

function clearOutput(): void {
  const out = document.getElementById("output");
  if (out) out.innerHTML = "";
}

function formatCell(v: unknown): string {
  if (v === null || v === undefined) return "null";
  if (typeof v === "object") return JSON.stringify(v);
  if (typeof v === "bigint") return v.toString();
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return JSON.stringify(v);
}

function renderRowsAsTable(rows: Record<string, unknown>[]): HTMLElement {
  if (rows.length === 0) return el("div", { text: "(no rows)", cls: "muted" });
  const cols = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  const table = el("table");
  const thead = el("thead");
  const headRow = el("tr");
  for (const c of cols) headRow.appendChild(el("th", { text: c }));
  thead.appendChild(headRow);
  table.appendChild(thead);
  const tbody = el("tbody");
  for (const row of rows) {
    const tr = el("tr");
    for (const c of cols) {
      const v = row[c];
      const td = el("td");
      td.textContent = formatCell(v);
      if (v === null || v === undefined) td.style.color = "#888";
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  return table;
}

// ---------------------------------------------------------------------------
// Check framework
// ---------------------------------------------------------------------------

type Category =
  | "Defaults"
  | "CRUD"
  | "Foreign keys"
  | "JSON columns"
  | "Indexes"
  | "RQB"
  | "Repos"
  | "Persistence";

interface CheckOutcome {
  ok: boolean;
  detail?: string;
}

interface CheckDef {
  category: Category;
  label: string;
  run: (h: DbHandle) => CheckOutcome | Promise<CheckOutcome>;
}

let runCounter = 0;
const uniq = (prefix: string): string => `${prefix}-${++runCounter}-${Date.now().toString(36)}`;

const ISO_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

// ---------------------------------------------------------------------------
// Check definitions
// ---------------------------------------------------------------------------

const allChecks: CheckDef[] = [
  // -------------------- Defaults --------------------
  {
    category: "Defaults",
    label: "problems: title/difficulty/url defaults fire on missing values",
    run: async ({ db }) => {
      const slug = uniq("def-problem");
      await db.insert(schema.problems).values({ slug });
      const [row] = await db
        .select()
        .from(schema.problems)
        .where(eq(schema.problems.slug, slug));
      await db.delete(schema.problems).where(eq(schema.problems.slug, slug));
      const ok =
        row.title === "Untitled" &&
        row.difficulty === "Unknown" &&
        row.url === "" &&
        row.isPremium === false;
      return {
        ok,
        detail: `title=${row.title} difficulty=${row.difficulty} url="${row.url}" isPremium=${row.isPremium}`,
      };
    },
  },
  {
    category: "Defaults",
    label: "problems: JSON empties fire ($default → [] and {})",
    run: async ({ db }) => {
      const slug = uniq("def-problem-json");
      await db.insert(schema.problems).values({ slug });
      const [row] = await db
        .select()
        .from(schema.problems)
        .where(eq(schema.problems.slug, slug));
      await db.delete(schema.problems).where(eq(schema.problems.slug, slug));
      const ok =
        Array.isArray(row.topicIds) &&
        row.topicIds.length === 0 &&
        Array.isArray(row.companyIds) &&
        row.companyIds.length === 0 &&
        row.userEdits !== null &&
        typeof row.userEdits === "object" &&
        Object.keys(row.userEdits).length === 0;
      return {
        ok,
        detail: `topicIds=${JSON.stringify(row.topicIds)} companyIds=${JSON.stringify(row.companyIds)} userEdits=${JSON.stringify(row.userEdits)}`,
      };
    },
  },
  {
    category: "Defaults",
    label: "tracks: name 'Untitled Track', enabled=true, isCurated=false",
    run: async ({ db }) => {
      const id = uniq("def-track");
      await db.insert(schema.tracks).values({ id });
      const [row] = await db
        .select()
        .from(schema.tracks)
        .where(eq(schema.tracks.id, id));
      await db.delete(schema.tracks).where(eq(schema.tracks.id, id));
      const ok =
        row.name === "Untitled Track" &&
        row.enabled === true &&
        row.isCurated === false;
      return {
        ok,
        detail: `name=${row.name} enabled=${row.enabled} isCurated=${row.isCurated}`,
      };
    },
  },
  {
    category: "Defaults",
    label: "study_states: suspended=false, tags=[]",
    run: async ({ db }) => {
      const slug = uniq("def-state");
      await db.insert(schema.problems).values({ slug });
      await db.insert(schema.studyStates).values({ problemSlug: slug });
      const [row] = await db
        .select()
        .from(schema.studyStates)
        .where(eq(schema.studyStates.problemSlug, slug));
      await db.delete(schema.problems).where(eq(schema.problems.slug, slug));
      const ok =
        row.suspended === false &&
        Array.isArray(row.tags) &&
        row.tags.length === 0;
      return {
        ok,
        detail: `suspended=${row.suspended} tags=${JSON.stringify(row.tags)}`,
      };
    },
  },
  {
    category: "Defaults",
    label: "timestamps: created_at / updated_at SQL defaults match ISO 8601 UTC",
    run: async ({ db }) => {
      const slug = uniq("def-ts");
      await db.insert(schema.problems).values({ slug });
      const [row] = await db
        .select()
        .from(schema.problems)
        .where(eq(schema.problems.slug, slug));
      await db.delete(schema.problems).where(eq(schema.problems.slug, slug));
      const ok =
        ISO_PATTERN.test(row.createdAt) && ISO_PATTERN.test(row.updatedAt);
      return { ok, detail: `createdAt=${row.createdAt} updatedAt=${row.updatedAt}` };
    },
  },

  // -------------------- CRUD lifecycles --------------------
  {
    category: "CRUD",
    label: "topics: insert → select → update → delete (with rich columns)",
    run: async ({ db }) => {
      const id = uniq("crud-topic");
      await db
        .insert(schema.topics)
        .values({ id, name: "Original", description: "first", isCustom: true });
      const r1 = await db
        .select()
        .from(schema.topics)
        .where(eq(schema.topics.id, id));
      if (
        r1.length !== 1 ||
        r1[0].name !== "Original" ||
        r1[0].description !== "first" ||
        r1[0].isCustom !== true
      )
        return { ok: false, detail: `INSERT/SELECT failed: ${JSON.stringify(r1)}` };
      await db
        .update(schema.topics)
        .set({ name: "Updated", description: "renamed" })
        .where(eq(schema.topics.id, id));
      const r2 = await db
        .select()
        .from(schema.topics)
        .where(eq(schema.topics.id, id));
      if (r2[0].name !== "Updated" || r2[0].description !== "renamed")
        return { ok: false, detail: `UPDATE failed: ${JSON.stringify(r2)}` };
      await db.delete(schema.topics).where(eq(schema.topics.id, id));
      const r3 = await db
        .select()
        .from(schema.topics)
        .where(eq(schema.topics.id, id));
      if (r3.length !== 0)
        return { ok: false, detail: `DELETE failed: ${JSON.stringify(r3)}` };
      return { ok: true, detail: "CREATE → READ → UPDATE → DELETE all OK" };
    },
  },
  {
    category: "CRUD",
    label: "companies: insert → select → update → delete (with rich columns)",
    run: async ({ db }) => {
      const id = uniq("crud-company");
      await db
        .insert(schema.companies)
        .values({ id, name: "OrigCo", isCustom: true });
      const r1 = await db
        .select()
        .from(schema.companies)
        .where(eq(schema.companies.id, id));
      if (r1.length !== 1 || r1[0].isCustom !== true)
        return { ok: false, detail: `INSERT failed: ${JSON.stringify(r1)}` };
      await db
        .update(schema.companies)
        .set({ name: "NewCo", description: "updated" })
        .where(eq(schema.companies.id, id));
      const r2 = await db
        .select()
        .from(schema.companies)
        .where(eq(schema.companies.id, id));
      if (r2[0].name !== "NewCo" || r2[0].description !== "updated")
        return { ok: false, detail: `UPDATE failed: ${JSON.stringify(r2)}` };
      await db.delete(schema.companies).where(eq(schema.companies.id, id));
      const r3 = await db
        .select()
        .from(schema.companies)
        .where(eq(schema.companies.id, id));
      return {
        ok: r3.length === 0,
        detail: r3.length === 0 ? "all OK" : "DELETE failed",
      };
    },
  },
  {
    category: "CRUD",
    label: "problems: full CRUD with explicit columns",
    run: async ({ db }) => {
      const slug = uniq("crud-problem");
      await db.insert(schema.problems).values({
        slug,
        leetcodeId: "9999",
        title: "Test Problem",
        difficulty: "Medium",
        url: "https://example.com",
        isPremium: true,
        topicIds: ["arrays"],
      });
      const [r1] = await db
        .select()
        .from(schema.problems)
        .where(eq(schema.problems.slug, slug));
      if (r1.title !== "Test Problem" || r1.isPremium !== true)
        return { ok: false, detail: `INSERT failed: ${JSON.stringify(r1)}` };
      await db
        .update(schema.problems)
        .set({ title: "Edited", difficulty: "Hard" })
        .where(eq(schema.problems.slug, slug));
      const [r2] = await db
        .select()
        .from(schema.problems)
        .where(eq(schema.problems.slug, slug));
      if (r2.title !== "Edited" || r2.difficulty !== "Hard")
        return { ok: false, detail: `UPDATE failed: ${JSON.stringify(r2)}` };
      await db.delete(schema.problems).where(eq(schema.problems.slug, slug));
      const r3 = await db
        .select()
        .from(schema.problems)
        .where(eq(schema.problems.slug, slug));
      return {
        ok: r3.length === 0,
        detail: r3.length === 0 ? "all OK" : "DELETE failed",
      };
    },
  },
  {
    category: "CRUD",
    label: "study_states: full CRUD (depends on a problem row)",
    run: async ({ db }) => {
      const slug = uniq("crud-state");
      await db.insert(schema.problems).values({ slug });
      await db
        .insert(schema.studyStates)
        .values({ problemSlug: slug, suspended: false });
      const [r1] = await db
        .select()
        .from(schema.studyStates)
        .where(eq(schema.studyStates.problemSlug, slug));
      if (r1.problemSlug !== slug)
        return { ok: false, detail: `INSERT failed: ${JSON.stringify(r1)}` };
      await db
        .update(schema.studyStates)
        .set({ suspended: true, fsrsStability: 1.23, fsrsState: "Learning" })
        .where(eq(schema.studyStates.problemSlug, slug));
      const [r2] = await db
        .select()
        .from(schema.studyStates)
        .where(eq(schema.studyStates.problemSlug, slug));
      if (
        r2.suspended !== true ||
        r2.fsrsStability !== 1.23 ||
        r2.fsrsState !== "Learning"
      )
        return { ok: false, detail: `UPDATE failed: ${JSON.stringify(r2)}` };
      await db.delete(schema.problems).where(eq(schema.problems.slug, slug));
      const r3 = await db
        .select()
        .from(schema.studyStates)
        .where(eq(schema.studyStates.problemSlug, slug));
      return {
        ok: r3.length === 0,
        detail: r3.length === 0 ? "CRUD + cleanup OK" : "DELETE failed",
      };
    },
  },
  {
    category: "CRUD",
    label: "attempt_history: insert ordered + select desc + delete by problem",
    run: async ({ db }) => {
      const slug = uniq("crud-attempts");
      await db.insert(schema.problems).values({ slug });
      await db.insert(schema.studyStates).values({ problemSlug: slug });
      await db.insert(schema.attemptHistory).values([
        {
          problemSlug: slug,
          reviewedAt: "2026-05-10T10:00:00.000Z",
          rating: 1,
          mode: "FULL_SOLVE",
        },
        {
          problemSlug: slug,
          reviewedAt: "2026-05-11T10:00:00.000Z",
          rating: 2,
          mode: "RECALL",
          logSnapshot: { notes: "second attempt" },
        },
      ]);
      const attempts = await db
        .select()
        .from(schema.attemptHistory)
        .where(eq(schema.attemptHistory.problemSlug, slug));
      if (attempts.length !== 2)
        return { ok: false, detail: `expected 2 attempts, got ${attempts.length}` };
      const ratings = attempts.map((a) => a.rating).sort();
      if (ratings[0] !== 1 || ratings[1] !== 2)
        return { ok: false, detail: `ratings off: ${JSON.stringify(ratings)}` };
      await db.delete(schema.problems).where(eq(schema.problems.slug, slug));
      const after = await db
        .select()
        .from(schema.attemptHistory)
        .where(eq(schema.attemptHistory.problemSlug, slug));
      return {
        ok: after.length === 0,
        detail: after.length === 0 ? "all OK + cascade-deleted" : "cascade failed",
      };
    },
  },
  {
    category: "CRUD",
    label: "tracks: full CRUD",
    run: async ({ db }) => {
      const id = uniq("crud-track");
      await db.insert(schema.tracks).values({ id, name: "Init" });
      const [r1] = await db
        .select()
        .from(schema.tracks)
        .where(eq(schema.tracks.id, id));
      if (r1.name !== "Init")
        return { ok: false, detail: `INSERT failed: ${JSON.stringify(r1)}` };
      await db
        .update(schema.tracks)
        .set({ name: "Renamed", enabled: false, isCurated: true })
        .where(eq(schema.tracks.id, id));
      const [r2] = await db
        .select()
        .from(schema.tracks)
        .where(eq(schema.tracks.id, id));
      if (r2.name !== "Renamed" || r2.enabled !== false || r2.isCurated !== true)
        return { ok: false, detail: `UPDATE failed: ${JSON.stringify(r2)}` };
      await db.delete(schema.tracks).where(eq(schema.tracks.id, id));
      const r3 = await db
        .select()
        .from(schema.tracks)
        .where(eq(schema.tracks.id, id));
      return {
        ok: r3.length === 0,
        detail: r3.length === 0 ? "all OK" : "DELETE failed",
      };
    },
  },
  {
    category: "CRUD",
    label: "track_groups + track_group_problems: composite PK, ordered membership",
    run: async ({ db }) => {
      const trackId = uniq("crud-tg-track");
      const groupId = uniq("crud-tg-group");
      const slugA = uniq("crud-tg-pa");
      const slugB = uniq("crud-tg-pb");
      await db.insert(schema.tracks).values({ id: trackId, name: "T" });
      await db
        .insert(schema.trackGroups)
        .values({ id: groupId, trackId, orderIndex: 0 });
      await db
        .insert(schema.problems)
        .values([{ slug: slugA }, { slug: slugB }]);
      await db.insert(schema.trackGroupProblems).values([
        { groupId, problemSlug: slugA, orderIndex: 1 },
        { groupId, problemSlug: slugB, orderIndex: 0 },
      ]);
      const membership = await db
        .select()
        .from(schema.trackGroupProblems)
        .where(eq(schema.trackGroupProblems.groupId, groupId));
      if (membership.length !== 2)
        return {
          ok: false,
          detail: `expected 2 members, got ${membership.length}`,
        };
      // Update one order
      await db
        .update(schema.trackGroupProblems)
        .set({ orderIndex: 99 })
        .where(
          and(
            eq(schema.trackGroupProblems.groupId, groupId),
            eq(schema.trackGroupProblems.problemSlug, slugA),
          ),
        );
      const [updated] = await db
        .select()
        .from(schema.trackGroupProblems)
        .where(
          and(
            eq(schema.trackGroupProblems.groupId, groupId),
            eq(schema.trackGroupProblems.problemSlug, slugA),
          ),
        );
      if (updated.orderIndex !== 99)
        return { ok: false, detail: `UPDATE failed: ${JSON.stringify(updated)}` };
      // Delete cascades from track
      await db.delete(schema.tracks).where(eq(schema.tracks.id, trackId));
      const after = await db
        .select()
        .from(schema.trackGroupProblems)
        .where(eq(schema.trackGroupProblems.groupId, groupId));
      return {
        ok: after.length === 0,
        detail:
          after.length === 0
            ? "composite PK + ordering + cascade OK"
            : `cascade left rows: ${JSON.stringify(after)}`,
      };
    },
  },
  {
    category: "CRUD",
    label: "settings_kv: insert / upsert / read / delete (JSON payload)",
    run: async ({ db, rawDb }) => {
      const key = uniq("crud-set");
      const settings = { dailyQuestionGoal: 5, studyMode: "freestyle" };
      await db
        .insert(schema.settingsKv)
        .values({ key, value: JSON.stringify(settings) });
      const [r1] = await db
        .select()
        .from(schema.settingsKv)
        .where(eq(schema.settingsKv.key, key));
      const parsed1 = JSON.parse(r1.value) as { dailyQuestionGoal: number };
      if (parsed1.dailyQuestionGoal !== 5)
        return { ok: false, detail: `INSERT failed: ${r1.value}` };
      // Upsert via raw SQL
      rawDb.exec({
        sql: "INSERT INTO settings_kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        bind: [key, JSON.stringify({ ...settings, dailyQuestionGoal: 10 })],
      });
      const [r2] = await db
        .select()
        .from(schema.settingsKv)
        .where(eq(schema.settingsKv.key, key));
      const parsed2 = JSON.parse(r2.value) as { dailyQuestionGoal: number };
      if (parsed2.dailyQuestionGoal !== 10)
        return { ok: false, detail: `UPSERT failed: ${r2.value}` };
      await db.delete(schema.settingsKv).where(eq(schema.settingsKv.key, key));
      const r3 = await db
        .select()
        .from(schema.settingsKv)
        .where(eq(schema.settingsKv.key, key));
      return {
        ok: r3.length === 0,
        detail: r3.length === 0 ? "INSERT + UPSERT + DELETE OK" : "DELETE failed",
      };
    },
  },

  // -------------------- Foreign keys --------------------
  {
    category: "Foreign keys",
    label: "problems → study_states CASCADE on delete problem",
    run: async ({ db }) => {
      const slug = uniq("fk-cascade-ss");
      await db.insert(schema.problems).values({ slug });
      await db.insert(schema.studyStates).values({ problemSlug: slug });
      await db.delete(schema.problems).where(eq(schema.problems.slug, slug));
      const remaining = await db
        .select()
        .from(schema.studyStates)
        .where(eq(schema.studyStates.problemSlug, slug));
      return {
        ok: remaining.length === 0,
        detail: remaining.length === 0 ? "study_state removed" : "cascade failed",
      };
    },
  },
  {
    category: "Foreign keys",
    label: "study_states → attempt_history CASCADE on delete problem",
    run: async ({ db }) => {
      const slug = uniq("fk-cascade-ah");
      await db.insert(schema.problems).values({ slug });
      await db.insert(schema.studyStates).values({ problemSlug: slug });
      await db.insert(schema.attemptHistory).values({
        problemSlug: slug,
        reviewedAt: "2026-05-11T00:00:00.000Z",
        rating: 1,
        mode: "FULL_SOLVE",
      });
      await db.delete(schema.problems).where(eq(schema.problems.slug, slug));
      const remaining = await db
        .select()
        .from(schema.attemptHistory)
        .where(eq(schema.attemptHistory.problemSlug, slug));
      return {
        ok: remaining.length === 0,
        detail: remaining.length === 0 ? "attempt_history removed" : "cascade failed",
      };
    },
  },
  {
    category: "Foreign keys",
    label: "tracks → track_groups CASCADE on delete track",
    run: async ({ db }) => {
      const trackId = uniq("fk-track");
      const groupId = uniq("fk-group");
      await db.insert(schema.tracks).values({ id: trackId, name: "x" });
      await db
        .insert(schema.trackGroups)
        .values({ id: groupId, trackId, orderIndex: 0 });
      await db.delete(schema.tracks).where(eq(schema.tracks.id, trackId));
      const remaining = await db
        .select()
        .from(schema.trackGroups)
        .where(eq(schema.trackGroups.id, groupId));
      return {
        ok: remaining.length === 0,
        detail: remaining.length === 0 ? "track_groups removed" : "cascade failed",
      };
    },
  },
  {
    category: "Foreign keys",
    label: "track_groups → track_group_problems CASCADE on delete group",
    run: async ({ db }) => {
      const trackId = uniq("fk-tg-track");
      const groupId = uniq("fk-tg-group");
      const slug = uniq("fk-tg-problem");
      await db.insert(schema.tracks).values({ id: trackId, name: "x" });
      await db
        .insert(schema.trackGroups)
        .values({ id: groupId, trackId, orderIndex: 0 });
      await db.insert(schema.problems).values({ slug });
      await db
        .insert(schema.trackGroupProblems)
        .values({ groupId, problemSlug: slug, orderIndex: 0 });
      await db.delete(schema.trackGroups).where(eq(schema.trackGroups.id, groupId));
      const remaining = await db
        .select()
        .from(schema.trackGroupProblems)
        .where(eq(schema.trackGroupProblems.groupId, groupId));
      return {
        ok: remaining.length === 0,
        detail: remaining.length === 0 ? "memberships removed" : "cascade failed",
      };
    },
  },
  {
    category: "Foreign keys",
    label: "problems → track_group_problems CASCADE on delete problem",
    run: async ({ db }) => {
      const trackId = uniq("fk-cascade-tgp-track");
      const groupId = uniq("fk-cascade-tgp-group");
      const slug = uniq("fk-cascade-tgp-problem");
      await db.insert(schema.tracks).values({ id: trackId, name: "x" });
      await db
        .insert(schema.trackGroups)
        .values({ id: groupId, trackId, orderIndex: 0 });
      await db.insert(schema.problems).values({ slug });
      await db
        .insert(schema.trackGroupProblems)
        .values({ groupId, problemSlug: slug, orderIndex: 0 });

      await db.delete(schema.problems).where(eq(schema.problems.slug, slug));

      const remainingMembership = await db
        .select()
        .from(schema.trackGroupProblems)
        .where(eq(schema.trackGroupProblems.problemSlug, slug));

      // Cleanup
      await db.delete(schema.tracks).where(eq(schema.tracks.id, trackId));

      return {
        ok: remainingMembership.length === 0,
        detail:
          remainingMembership.length === 0
            ? "memberships removed alongside the problem"
            : `${remainingMembership.length} membership row(s) survived`,
      };
    },
  },
  {
    category: "Foreign keys",
    label: "topics → track_groups SET NULL on delete topic",
    run: async ({ db }) => {
      const trackId = uniq("fk-setnull-track");
      const groupId = uniq("fk-setnull-group");
      const topicId = uniq("fk-setnull-topic");
      await db.insert(schema.topics).values({ id: topicId, name: "T" });
      await db.insert(schema.tracks).values({ id: trackId, name: "x" });
      await db
        .insert(schema.trackGroups)
        .values({ id: groupId, trackId, topicId, orderIndex: 0 });
      await db.delete(schema.topics).where(eq(schema.topics.id, topicId));
      const [group] = await db
        .select()
        .from(schema.trackGroups)
        .where(eq(schema.trackGroups.id, groupId));
      const ok = group.topicId === null;
      // Cleanup
      await db.delete(schema.tracks).where(eq(schema.tracks.id, trackId));
      return {
        ok,
        detail: ok ? "topic_id nulled" : `topic_id=${group.topicId}`,
      };
    },
  },

  // -------------------- JSON columns --------------------
  {
    category: "JSON columns",
    label: "problems.topicIds round-trips as parsed string[]",
    run: async ({ db }) => {
      const slug = uniq("json-topics");
      const ids = ["arrays", "graphs", "dp"];
      await db.insert(schema.problems).values({ slug, topicIds: ids });
      const [row] = await db
        .select()
        .from(schema.problems)
        .where(eq(schema.problems.slug, slug));
      await db.delete(schema.problems).where(eq(schema.problems.slug, slug));
      const ok =
        Array.isArray(row.topicIds) &&
        row.topicIds.length === 3 &&
        row.topicIds.join(",") === ids.join(",");
      return { ok, detail: JSON.stringify(row.topicIds) };
    },
  },
  {
    category: "JSON columns",
    label: "problems.companyIds round-trips as parsed string[]",
    run: async ({ db }) => {
      const slug = uniq("json-companies");
      const ids = ["google", "meta", "amazon"];
      await db.insert(schema.problems).values({ slug, companyIds: ids });
      const [row] = await db
        .select()
        .from(schema.problems)
        .where(eq(schema.problems.slug, slug));
      await db.delete(schema.problems).where(eq(schema.problems.slug, slug));
      const ok =
        Array.isArray(row.companyIds) && row.companyIds.length === 3;
      return { ok, detail: JSON.stringify(row.companyIds) };
    },
  },
  {
    category: "JSON columns",
    label: "problems.userEdits round-trips as parsed object",
    run: async ({ db }) => {
      const slug = uniq("json-edits");
      await db
        .insert(schema.problems)
        .values({ slug, userEdits: { title: true, difficulty: true } });
      const [row] = await db
        .select()
        .from(schema.problems)
        .where(eq(schema.problems.slug, slug));
      await db.delete(schema.problems).where(eq(schema.problems.slug, slug));
      const ok =
        row.userEdits !== null &&
        typeof row.userEdits === "object" &&
        row.userEdits.title === true &&
        row.userEdits.difficulty === true;
      return { ok, detail: JSON.stringify(row.userEdits) };
    },
  },
  {
    category: "JSON columns",
    label: "study_states.tags round-trips as parsed string[]",
    run: async ({ db }) => {
      const slug = uniq("json-tags");
      const tags = ["personal", "tricky", "revisit"];
      await db.insert(schema.problems).values({ slug });
      await db.insert(schema.studyStates).values({ problemSlug: slug, tags });
      const [row] = await db
        .select()
        .from(schema.studyStates)
        .where(eq(schema.studyStates.problemSlug, slug));
      await db.delete(schema.problems).where(eq(schema.problems.slug, slug));
      const ok = Array.isArray(row.tags) && row.tags.length === 3;
      return { ok, detail: JSON.stringify(row.tags) };
    },
  },
  {
    category: "JSON columns",
    label: "attempt_history.logSnapshot round-trips as parsed object (or null)",
    run: async ({ db }) => {
      const slug = uniq("json-log");
      await db.insert(schema.problems).values({ slug });
      await db.insert(schema.studyStates).values({ problemSlug: slug });
      await db.insert(schema.attemptHistory).values({
        problemSlug: slug,
        reviewedAt: "2026-05-11T00:00:00.000Z",
        rating: 2,
        mode: "RECALL",
        logSnapshot: {
          notes: "round-trip",
          timeComplexity: "O(n)",
        },
      });
      const [row] = await db
        .select()
        .from(schema.attemptHistory)
        .where(eq(schema.attemptHistory.problemSlug, slug));
      await db.delete(schema.problems).where(eq(schema.problems.slug, slug));
      const snap = row.logSnapshot;
      const ok =
        snap !== null &&
        typeof snap === "object" &&
        snap.notes === "round-trip" &&
        snap.timeComplexity === "O(n)";
      return { ok, detail: JSON.stringify(snap) };
    },
  },

  // -------------------- Indexes --------------------
  {
    category: "Indexes",
    label: "all 11 expected indexes exist in sqlite_master",
    run: ({ rawDb }) => {
      const expected = [
        "idx_problems_difficulty",
        "idx_problems_is_premium",
        "idx_study_states_due",
        "idx_study_states_suspended",
        "idx_attempt_history_slug_reviewed_at",
        "idx_tracks_enabled",
        "idx_tracks_order_index",
        "idx_track_groups_track_id_order",
        "idx_tgp_group_id_order",
        "idx_tgp_problem_slug",
      ];
      const rows = rawDb.exec({
        sql: "SELECT name FROM sqlite_master WHERE type = 'index' AND name NOT LIKE 'sqlite_%'",
        rowMode: "object",
        returnValue: "resultRows",
      }) as unknown as Array<{ name: string }>;
      const got = rows.map((r) => r.name).sort();
      const missing = expected.filter((e) => !got.includes(e));
      return {
        ok: missing.length === 0,
        detail:
          missing.length === 0
            ? `${got.length} indexes present: ${got.join(", ")}`
            : `missing: ${missing.join(", ")}`,
      };
    },
  },

  // -------------------- RQB --------------------
  {
    category: "RQB",
    label: "tracks → groups → problems nests correctly",
    run: async ({ db }) => {
      const trackId = uniq("rqb-track");
      const groupId = uniq("rqb-group");
      const topicId = uniq("rqb-topic");
      const slug = uniq("rqb-problem");
      await db.insert(schema.topics).values({ id: topicId, name: "Arr" });
      await db
        .insert(schema.tracks)
        .values({ id: trackId, name: "RQB Track", isCurated: true });
      await db
        .insert(schema.trackGroups)
        .values({ id: groupId, trackId, topicId, orderIndex: 0 });
      await db.insert(schema.problems).values({ slug });
      await db
        .insert(schema.trackGroupProblems)
        .values({ groupId, problemSlug: slug, orderIndex: 0 });
      const tracks = await db.query.tracks.findMany({
        where: eq(schema.tracks.id, trackId),
        with: { groups: { with: { problems: true } } },
      });
      // Cleanup (cascades from track)
      await db.delete(schema.tracks).where(eq(schema.tracks.id, trackId));
      await db.delete(schema.topics).where(eq(schema.topics.id, topicId));
      await db.delete(schema.problems).where(eq(schema.problems.slug, slug));
      const ok =
        tracks.length === 1 &&
        tracks[0].groups.length === 1 &&
        tracks[0].groups[0].problems.length === 1 &&
        tracks[0].groups[0].problems[0].problemSlug === slug;
      return { ok, detail: JSON.stringify(tracks) };
    },
  },
  // -------------------- Repos (Phase 4+) --------------------
  {
    category: "Repos",
    label: "topics repo: seedCatalogTopics seeds the curated catalog idempotently",
    run: async ({ db }) => {
      const seeds = listCatalogTopicSeeds();
      await seedCatalogTopics(db, seeds);
      await seedCatalogTopics(db, seeds); // second call must not error
      const topics = await listTopics(db);
      const curated = topics.filter((t) => !t.isCustom);
      const seedIds = new Set(seeds.map((s) => s.id));
      const missing = seeds.filter((s) => !topics.some((t) => t.id === s.id));
      return {
        ok: curated.length >= seeds.length && missing.length === 0,
        detail:
          missing.length === 0
            ? `${curated.length} curated topics present (expected ≥${seeds.length})`
            : `missing seeds: ${missing.map((m) => m.id).join(", ")}; total seedIds=${seedIds.size}`,
      };
    },
  },
  {
    category: "Repos",
    label: "topics repo: upsertTopic inserts new + renames without flipping isCustom",
    run: async ({ db }) => {
      const id = asTopicId(uniq("repo-topic"));
      const inserted = await upsertTopic(db, {
        id,
        name: "Initial",
        isCustom: true,
        description: "first",
      });
      if (!inserted.isCustom) {
        return { ok: false, detail: `inserted isCustom should be true` };
      }
      const renamed = await upsertTopic(db, {
        id,
        name: "Renamed",
        description: "second",
      });
      const afterReseed = await upsertTopic(db, {
        id,
        name: "Renamed",
        isCustom: false /* ignored on conflict path */,
      });
      // Cleanup
      await removeTopic(db, id);
      const ok =
        renamed.name === "Renamed" &&
        renamed.description === "second" &&
        renamed.isCustom === true &&
        afterReseed.isCustom === true;
      return {
        ok,
        detail: `inserted.isCustom=${inserted.isCustom} renamed.name="${renamed.name}" renamed.isCustom=${renamed.isCustom} afterReseed.isCustom=${afterReseed.isCustom}`,
      };
    },
  },
  {
    category: "Repos",
    label: "topics repo: removeTopic refuses curated, removes custom",
    run: async ({ db }) => {
      const customId = asTopicId(uniq("repo-custom"));
      const curatedId = asTopicId(uniq("repo-curated"));
      await upsertTopic(db, { id: customId, name: "Custom", isCustom: true });
      await upsertTopic(db, { id: curatedId, name: "Curated", isCustom: false });

      let curatedThrew = false;
      try {
        await removeTopic(db, curatedId);
      } catch {
        curatedThrew = true;
      }

      await removeTopic(db, customId);
      const customStill = await getTopic(db, customId);
      const curatedStill = await getTopic(db, curatedId);

      // Cleanup: drop the curated topic we created
      await db.delete(schema.topics).where(eq(schema.topics.id, curatedId));

      return {
        ok: curatedThrew && !customStill && !!curatedStill,
        detail: `curatedThrew=${curatedThrew} customStill=${!!customStill} curatedStill=${!!curatedStill}`,
      };
    },
  },
  {
    category: "Repos",
    label: "topics repo: listTopics returns alphabetised flat Topic objects",
    run: async ({ db }) => {
      const idA = asTopicId(uniq("zlist-z"));
      const idB = asTopicId(uniq("alist-a"));
      const idC = asTopicId(uniq("mlist-m"));
      await upsertTopic(db, { id: idA, name: "Zeta", isCustom: true });
      await upsertTopic(db, { id: idB, name: "Alpha", isCustom: true });
      await upsertTopic(db, { id: idC, name: "Mu", isCustom: true });
      const topics = await listTopics(db);
      const customSubset = topics.filter((t) =>
        [idA, idB, idC].includes(t.id as typeof idA),
      );
      const names = customSubset.map((t) => t.name);
      // Cleanup
      for (const id of [idA, idB, idC]) await removeTopic(db, id);
      const ok = names.join(",") === "Alpha,Mu,Zeta";
      return {
        ok,
        detail: ok ? "Alpha, Mu, Zeta (alphabetised)" : `got: ${names.join(", ")}`,
      };
    },
  },
  {
    category: "Repos",
    label: "companies repo: seedCatalogCompanies seeds curated catalog idempotently",
    run: async ({ db }) => {
      const seeds = listCatalogCompanySeeds();
      await seedCatalogCompanies(db, seeds);
      await seedCatalogCompanies(db, seeds);
      const companies = await listCompanies(db);
      const curated = companies.filter((c) => !c.isCustom);
      const missing = seeds.filter((s) => !companies.some((c) => c.id === s.id));
      return {
        ok: curated.length >= seeds.length && missing.length === 0,
        detail:
          missing.length === 0
            ? `${curated.length} curated companies present (expected ≥${seeds.length})`
            : `missing seeds: ${missing.map((m) => m.id).join(", ")}`,
      };
    },
  },
  {
    category: "Repos",
    label: "companies repo: upsertCompany preserves isCustom on conflict",
    run: async ({ db }) => {
      const id = asCompanyId(uniq("repo-company"));
      const inserted = await upsertCompany(db, {
        id,
        name: "Initial Co",
        isCustom: true,
      });
      const renamed = await upsertCompany(db, {
        id,
        name: "Renamed Co",
        description: "now described",
      });
      const reseeded = await upsertCompany(db, {
        id,
        name: "Renamed Co",
        isCustom: false /* ignored on conflict */,
      });
      await removeCompany(db, id);
      const ok =
        inserted.isCustom === true &&
        renamed.isCustom === true &&
        renamed.description === "now described" &&
        reseeded.isCustom === true;
      return {
        ok,
        detail: `inserted=${inserted.isCustom} renamed=${renamed.isCustom} reseeded=${reseeded.isCustom}`,
      };
    },
  },
  {
    category: "Repos",
    label: "companies repo: removeCompany refuses curated, removes custom",
    run: async ({ db }) => {
      const customId = asCompanyId(uniq("repo-co-custom"));
      const curatedId = asCompanyId(uniq("repo-co-curated"));
      await upsertCompany(db, { id: customId, name: "Custom Co", isCustom: true });
      await upsertCompany(db, { id: curatedId, name: "Curated Co", isCustom: false });

      let curatedThrew = false;
      try {
        await removeCompany(db, curatedId);
      } catch {
        curatedThrew = true;
      }

      await removeCompany(db, customId);
      const customStill = await getCompany(db, customId);
      const curatedStill = await getCompany(db, curatedId);

      // Cleanup
      await db.delete(schema.companies).where(eq(schema.companies.id, curatedId));

      return {
        ok: curatedThrew && !customStill && !!curatedStill,
        detail: `curatedThrew=${curatedThrew} customStill=${!!customStill} curatedStill=${!!curatedStill}`,
      };
    },
  },
  {
    category: "Repos",
    label: "settings repo: seedInitialSettings is idempotent, defaults visible",
    run: async ({ db }) => {
      // Clear any pre-existing row so we exercise the seed path cleanly.
      await db.delete(schema.settingsKv);
      const seeded = await seedInitialSettings(db);
      const seededAgain = await seedInitialSettings(db);
      const defaults = createInitialUserSettings();
      const ok =
        seeded.dailyQuestionGoal === defaults.dailyQuestionGoal &&
        seededAgain.dailyQuestionGoal === defaults.dailyQuestionGoal;
      return {
        ok,
        detail: `seeded.dailyQuestionGoal=${seeded.dailyQuestionGoal} (defaults=${defaults.dailyQuestionGoal})`,
      };
    },
  },
  {
    category: "Repos",
    label: "settings repo: saveUserSettings round-trips full shape (charter lesson #6)",
    run: async ({ db }) => {
      await db.delete(schema.settingsKv);
      const base = createInitialUserSettings();
      const customised = {
        ...base,
        dailyQuestionGoal: 11,
        studyMode: "studyPlan" as const,
      };
      const saved = await saveUserSettings(db, customised);
      const fetched = await getUserSettings(db);
      const ok =
        saved.dailyQuestionGoal === 11 &&
        saved.studyMode === "studyPlan" &&
        fetched?.dailyQuestionGoal === 11 &&
        fetched?.studyMode === "studyPlan";
      return {
        ok,
        detail: `saved=${saved.dailyQuestionGoal}/${saved.studyMode} fetched=${fetched?.dailyQuestionGoal}/${fetched?.studyMode}`,
      };
    },
  },
  {
    category: "Repos",
    label: "settings repo: upsert (no duplicate rows after multiple saves)",
    run: async ({ db, rawDb }) => {
      await db.delete(schema.settingsKv);
      await saveUserSettings(db, createInitialUserSettings());
      await saveUserSettings(db, {
        ...createInitialUserSettings(),
        dailyQuestionGoal: 3,
      });
      await saveUserSettings(db, {
        ...createInitialUserSettings(),
        dailyQuestionGoal: 7,
      });
      const rows = rawDb.exec({
        sql: "SELECT COUNT(*) AS c FROM settings_kv WHERE key = 'user_settings'",
        rowMode: "object",
        returnValue: "resultRows",
      }) as unknown as Array<{ c: number }>;
      const fetched = await getUserSettings(db);
      const ok =
        rows[0].c === 1 && fetched?.dailyQuestionGoal === 7;
      return {
        ok,
        detail: `rows=${rows[0].c} dailyQuestionGoal=${fetched?.dailyQuestionGoal}`,
      };
    },
  },

  // -------------------- Repos: problems (Phase 5) --------------------
  {
    category: "Repos",
    label: "problems repo: importProblem inserts new + preserves sticky user-edits",
    run: async ({ db }) => {
      const slug = asProblemSlug(uniq("repo-prob"));
      const inserted = await importProblem(db, {
        slug,
        title: "Initial Title",
        difficulty: "Easy",
      });
      if (inserted.title !== "Initial Title") {
        return { ok: false, detail: `insert title=${inserted.title}` };
      }
      // User edit pins the title via mark-user-edit.
      await editProblem(db, {
        slug,
        patch: { title: "Renamed by user" },
      });
      // Re-import attempts to overwrite — should be blocked for the
      // user-edited field but apply to the un-edited `difficulty`.
      const final = await importProblem(db, {
        slug,
        title: "Catalog Title",
        difficulty: "Hard",
      });
      // Cleanup
      await removeProblem(db, slug);
      const ok =
        final.title === "Renamed by user" && final.difficulty === "Hard";
      return {
        ok,
        detail: `final.title="${final.title}" final.difficulty=${final.difficulty}`,
      };
    },
  },
  {
    category: "Repos",
    label: "problems repo: editProblem flags only touched fields in userEdits",
    run: async ({ db }) => {
      const slug = asProblemSlug(uniq("repo-edit"));
      await importProblem(db, { slug, title: "T", difficulty: "Easy" });
      const edited = await editProblem(db, {
        slug,
        patch: { difficulty: "Hard" },
      });
      await removeProblem(db, slug);
      const flags = edited.userEdits ?? {};
      const ok =
        flags.difficulty === true &&
        flags.title === undefined &&
        flags.url === undefined;
      return {
        ok,
        detail: `userEdits=${JSON.stringify(flags)}`,
      };
    },
  },
  {
    category: "Repos",
    label: "problems repo: bulkImportProblems is idempotent (ON CONFLICT DO NOTHING)",
    run: async ({ db }) => {
      const baselineCount = (await listProblems(db)).length;
      const slugA = uniq("repo-bulk-a");
      const slugB = uniq("repo-bulk-b");
      const seed = [
        {
          id: slugA,
          leetcodeSlug: slugA,
          slug: slugA,
          title: "Bulk A",
          difficulty: "Easy" as const,
          isPremium: false,
          url: `https://leetcode.com/problems/${slugA}/`,
          topics: [],
          topicIds: [],
          companyIds: [],
          sourceSet: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          studyState: null,
          companies: [],
        },
        {
          id: slugB,
          leetcodeSlug: slugB,
          slug: slugB,
          title: "Bulk B",
          difficulty: "Medium" as const,
          isPremium: false,
          url: `https://leetcode.com/problems/${slugB}/`,
          topics: [],
          topicIds: [],
          companyIds: [],
          sourceSet: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          studyState: null,
          companies: [],
        },
      ];
      const firstRun = await bulkImportProblems(db, seed);
      const secondRun = await bulkImportProblems(db, seed);
      const after = (await listProblems(db)).length;
      // Cleanup
      await removeProblem(db, asProblemSlug(slugA));
      await removeProblem(db, asProblemSlug(slugB));
      const ok =
        firstRun === 2 && secondRun === 0 && after === baselineCount + 2;
      return {
        ok,
        detail: `firstRun=${firstRun} secondRun=${secondRun} netInserted=${after - baselineCount}`,
      };
    },
  },
  {
    category: "Repos",
    label: "problems repo: getProblem returns undefined for missing (not error)",
    run: async ({ db }) => {
      const ghost = await getProblem(db, asProblemSlug("definitely-not-a-real-slug-xyz"));
      return {
        ok: ghost === undefined,
        detail: `getProblem(ghost) returned ${ghost === undefined ? "undefined ✓" : JSON.stringify(ghost)}`,
      };
    },
  },

  // -------------------- Repos: studyStates (Phase 5) --------------------
  {
    category: "Repos",
    label: "studyStates repo: ensureStudyState materialises a default + is idempotent",
    run: async ({ db }) => {
      const slug = asProblemSlug(uniq("repo-state"));
      await importProblem(db, { slug });
      const first = await ensureStudyState(db, slug);
      const second = await ensureStudyState(db, slug);
      // Cleanup
      await removeProblem(db, slug);
      const ok =
        first.suspended === false &&
        first.attemptHistory.length === 0 &&
        first.createdAt === second.createdAt;
      return {
        ok,
        detail: `first.suspended=${first.suspended} attempts=${first.attemptHistory.length} createdAt matches=${first.createdAt === second.createdAt}`,
      };
    },
  },
  {
    category: "Repos",
    label: "studyStates repo: upsertStudyState round-trips the FSRS card",
    run: async ({ db }) => {
      const slug = asProblemSlug(uniq("repo-fsrs"));
      await importProblem(db, { slug });
      const fresh = await ensureStudyState(db, slug);
      const next = {
        ...fresh,
        suspended: true,
        lastRating: 3 as const,
        notes: "round-trip",
        fsrsCard: {
          due: "2026-06-01T00:00:00.000Z",
          stability: 4.5,
          difficulty: 2.1,
          elapsedDays: 1,
          scheduledDays: 7,
          learningSteps: 0,
          reps: 2,
          lapses: 0,
          state: "Review" as const,
          lastReview: "2026-05-25T00:00:00.000Z",
        },
      };
      const saved = await upsertStudyState(db, slug, next);
      // Cleanup
      await removeProblem(db, slug);
      const ok =
        saved.suspended === true &&
        saved.lastRating === 3 &&
        saved.notes === "round-trip" &&
        saved.fsrsCard?.stability === 4.5 &&
        saved.fsrsCard?.state === "Review";
      return {
        ok,
        detail: `suspended=${saved.suspended} lastRating=${saved.lastRating} fsrs.stability=${saved.fsrsCard?.stability}`,
      };
    },
  },
  {
    category: "Repos",
    label: "studyStates repo: appendAttempt + getStudyState joins attempts in order",
    run: async ({ db }) => {
      const slug = asProblemSlug(uniq("repo-attempts"));
      await importProblem(db, { slug });
      await ensureStudyState(db, slug);
      await appendAttempt(db, slug, {
        reviewedAt: "2026-05-10T00:00:00.000Z",
        rating: 1,
        mode: "FULL_SOLVE",
      });
      await appendAttempt(db, slug, {
        reviewedAt: "2026-05-12T00:00:00.000Z",
        rating: 3,
        mode: "RECALL",
        logSnapshot: { notes: "second pass" },
      });
      const state = await getStudyState(db, slug);
      // Cleanup
      await removeProblem(db, slug);
      const ok =
        state?.attemptHistory.length === 2 &&
        state.attemptHistory[0].rating === 1 &&
        state.attemptHistory[1].rating === 3 &&
        state.attemptHistory[1].logSnapshot?.notes === "second pass";
      return {
        ok,
        detail: `attempts=${state?.attemptHistory.length} order=${state?.attemptHistory.map((a) => a.rating).join(",")}`,
      };
    },
  },
  {
    category: "Repos",
    label: "studyStates repo: FK cascade — deleting problem nukes state + attempts",
    run: async ({ db }) => {
      const slug = asProblemSlug(uniq("repo-cascade"));
      await importProblem(db, { slug });
      await ensureStudyState(db, slug);
      await appendAttempt(db, slug, {
        reviewedAt: "2026-05-10T00:00:00.000Z",
        rating: 1,
        mode: "FULL_SOLVE",
      });
      await removeProblem(db, slug);
      const state = await getStudyState(db, slug);
      const attemptRows = await db
        .select()
        .from(schema.attemptHistory)
        .where(eq(schema.attemptHistory.problemSlug, slug));
      const ok = state === undefined && attemptRows.length === 0;
      return {
        ok,
        detail: `state=${state === undefined ? "gone ✓" : "still present"} attempts=${attemptRows.length}`,
      };
    },
  },

  // -------------------- Persistence (Phase 6) --------------------
  {
    category: "Persistence",
    label: "computeFingerprint is deterministic + 8-char hex",
    run: () => {
      const a = computeFingerprint("CREATE TABLE foo (id INTEGER);");
      const a2 = computeFingerprint("CREATE TABLE foo (id INTEGER);");
      const b = computeFingerprint("CREATE TABLE bar (id INTEGER);");
      const ok =
        a === a2 && a !== b && /^[0-9a-f]{8}$/.test(a) && /^[0-9a-f]{8}$/.test(b);
      return {
        ok,
        detail: `a=${a} a2=${a2} b=${b} (a==a2 expected; a!=b expected)`,
      };
    },
  },
  {
    category: "Persistence",
    label: "base64 round-trip preserves bytes exactly (including null bytes)",
    run: () => {
      const original = new Uint8Array([0, 1, 2, 3, 255, 254, 0, 128, 64]);
      const b64 = bytesToBase64(original);
      const back = base64ToBytes(b64);
      const ok =
        back.length === original.length &&
        original.every((b, i) => b === back[i]);
      return { ok, detail: `len=${original.length} b64="${b64}"` };
    },
  },
  {
    category: "Persistence",
    label: "serializeDb returns valid SQLite-format bytes (header check)",
    run: (handle) => {
      const bytes = serializeDb(handle);
      // SQLite file format starts with the 16-byte magic string
      // "SQLite format 3\0".
      const magic = "SQLite format 3 ";
      const head = Array.from(bytes.subarray(0, 16))
        .map((b) => String.fromCharCode(b))
        .join("");
      return {
        ok: head === magic && bytes.length > 0,
        detail: `bytes=${bytes.length}  head="${head.replace(/ /g, "\\0")}"`,
      };
    },
  },
  {
    category: "Persistence",
    label: "serialize → fresh DB → deserialize → data preserved (full round-trip)",
    run: async (handle) => {
      const { db } = handle;
      // 1. Stage data in the live DB.
      const customId = asTopicId(uniq("snapshot-custom"));
      await upsertTopic(db, {
        id: customId,
        name: "Snapshot Custom Topic",
        description: "round-trip me",
        isCustom: true,
      });

      // 2. Serialize.
      const bytes = serializeDb(handle);

      // 3. Spin up a fresh DB (no migration applied here — deserialize
      //    will install the full schema from the snapshot bytes).
      const fresh = await createSubDb();

      // 4. Deserialize into the fresh DB.
      deserializeDb(fresh, bytes);

      // 5. Query the fresh DB and verify the staged row survived.
      const restored = await getTopic(fresh.db, customId);

      // Cleanup the staged row in the live DB.
      await removeTopic(db, customId);

      const ok =
        !!restored &&
        restored.name === "Snapshot Custom Topic" &&
        restored.description === "round-trip me" &&
        restored.isCustom === true;
      return {
        ok,
        detail: ok
          ? `restored ${customId} cleanly from ${bytes.length}-byte snapshot`
          : `restored=${JSON.stringify(restored)}`,
      };
    },
  },
  {
    category: "Persistence",
    label: "deserialize replaces existing state (post-restore data is gone)",
    run: async (handle) => {
      const { db } = handle;
      // Stage row A in the live DB and serialize.
      const a = asTopicId(uniq("snap-a"));
      await upsertTopic(db, { id: a, name: "Row A", isCustom: true });
      const bytes = serializeDb(handle);

      // In a FRESH DB, stage row B; deserialize the snapshot over it;
      // row B should be gone, row A should be present.
      const fresh = await createSubDb({ migrationSql });
      const b = asTopicId(uniq("snap-b"));
      await upsertTopic(fresh.db, { id: b, name: "Row B", isCustom: true });
      deserializeDb(fresh, bytes);

      const restoredA = await getTopic(fresh.db, a);
      const restoredB = await getTopic(fresh.db, b);

      // Cleanup staged row A in the live DB.
      await removeTopic(db, a);

      const ok = !!restoredA && !restoredB;
      return {
        ok,
        detail: `restoredA=${!!restoredA} restoredB=${!!restoredB} (B should be gone, A should be present)`,
      };
    },
  },
  {
    category: "Persistence",
    label: "fingerprint of bundled migration matches itself across calls",
    run: () => {
      const a = computeFingerprint(migrationSql);
      const b = computeFingerprint(migrationSql);
      return {
        ok: a === b && a.length === 8,
        detail: `bundled migration fingerprint = ${a} (length=${migrationSql.length} bytes)`,
      };
    },
  },

  {
    category: "RQB",
    label: "studyStates → problem + attempts nests correctly",
    run: async ({ db }) => {
      const slug = uniq("rqb-state");
      await db.insert(schema.problems).values({ slug, title: "X" });
      await db.insert(schema.studyStates).values({ problemSlug: slug });
      await db.insert(schema.attemptHistory).values({
        problemSlug: slug,
        reviewedAt: "2026-05-11T00:00:00.000Z",
        rating: 2,
        mode: "FULL_SOLVE",
      });
      const states = await db.query.studyStates.findMany({
        where: eq(schema.studyStates.problemSlug, slug),
        with: { problem: true, attempts: true },
      });
      await db.delete(schema.problems).where(eq(schema.problems.slug, slug));
      const s = states[0];
      const ok =
        states.length === 1 &&
        s.problem !== null &&
        s.problem!.title === "X" &&
        s.attempts.length === 1 &&
        s.attempts[0].rating === 2;
      return { ok, detail: JSON.stringify(states) };
    },
  },

  // ---------- Tracks repo (Phase 5 tracks slice) ----------

  {
    category: "Repos",
    label: "tracks repo: seedCatalogTracks plants the curated catalog idempotently",
    run: async ({ db }) => {
      const seed = buildTrackCatalogSeed();
      // The group-membership rows FK to problems.slug — seed every slug the
      // catalog mentions so the bulk insert clears the FK check.
      const slugs = Array.from(
        new Set(seed.groupProblems.map((m) => m.problemSlug as string)),
      );
      for (const slug of slugs) {
        await db.insert(schema.problems).values({ slug }).onConflictDoNothing();
      }
      await seedCatalogTracks(db, seed);
      await seedCatalogTracks(db, seed); // second call must not throw or duplicate
      // dbDebug shares the wasm DB across "Run all" presses; only assert
      // on the seed ids themselves rather than the global track count
      // (other checks below create + delete non-curated tracks and
      // partial failures can leak rows between runs).
      const seedIdSet = new Set<string>(seed.tracks.map((t) => t.id));
      const listed = await listTracksRepo(db);
      const seeded = listed.filter((t) => seedIdSet.has(t.id));
      const everySeededCurated = seeded.every((t) => t.isCurated);
      const allSeedsPresent = seeded.length === seed.tracks.length;
      return {
        ok: allSeedsPresent && everySeededCurated,
        detail: `seeded=${seeded.length}/${seed.tracks.length}; curated=${everySeededCurated}`,
      };
    },
  },

  {
    category: "Repos",
    label: "tracks repo: deleteTrack cascades groups + group-problem memberships",
    run: async ({ db }) => {
      const slug = uniq("trk-cascade");
      await db.insert(schema.problems).values({ slug, title: "X" });
      const track = await createTrackRepo(db, { name: "Cascade Demo" });
      const group = await addGroupRepo(db, { trackId: track.id, name: "G" });
      await addProblemToGroupRepo(db, {
        groupId: group.id,
        problemSlug: asProblemSlug(slug),
      });
      await deleteTrackRepo(db, track.id);
      const groupsLeft = await db
        .select()
        .from(schema.trackGroups)
        .where(eq(schema.trackGroups.trackId, track.id));
      const membershipsLeft = await db
        .select()
        .from(schema.trackGroupProblems)
        .where(eq(schema.trackGroupProblems.groupId, group.id));
      await db.delete(schema.problems).where(eq(schema.problems.slug, slug));
      return {
        ok: groupsLeft.length === 0 && membershipsLeft.length === 0,
        detail: `groupsLeft=${groupsLeft.length} membershipsLeft=${membershipsLeft.length}`,
      };
    },
  },

  {
    category: "Repos",
    label: "tracks repo: deleteTrack refuses curated tracks",
    run: async ({ db }) => {
      const id = asTrackId(uniq("trk-curated"));
      await createTrackRepo(db, { id, name: "Curated", isCurated: true });
      let threw = false;
      try {
        await deleteTrackRepo(db, id);
      } catch {
        threw = true;
      }
      // Cleanup — bypass the repo guard.
      await db.delete(schema.tracks).where(eq(schema.tracks.id, id));
      return { ok: threw, detail: `threw=${threw}` };
    },
  },

  {
    category: "Repos",
    label: "tracks repo: listTracks composes RQB tree in track/group/problem order",
    run: async ({ db }) => {
      const slugA = uniq("trk-rqb-a");
      const slugB = uniq("trk-rqb-b");
      await db.insert(schema.problems).values({ slug: slugA, title: "A" });
      await db.insert(schema.problems).values({ slug: slugB, title: "B" });
      const track = await createTrackRepo(db, { name: "RQB Demo" });
      const group = await addGroupRepo(db, { trackId: track.id, name: "G1" });
      await addProblemToGroupRepo(db, {
        groupId: group.id,
        problemSlug: asProblemSlug(slugA),
      });
      await addProblemToGroupRepo(db, {
        groupId: group.id,
        problemSlug: asProblemSlug(slugB),
      });
      const list = await listTracksRepo(db);
      const mine = list.find((t) => t.id === track.id);
      const slugs = mine?.groups[0]?.problems.map((p) => p.slug) ?? [];
      await deleteTrackRepo(db, track.id);
      await db.delete(schema.problems).where(eq(schema.problems.slug, slugA));
      await db.delete(schema.problems).where(eq(schema.problems.slug, slugB));
      return {
        ok: slugs.length === 2 && slugs[0] === slugA && slugs[1] === slugB,
        detail: `slugs=${JSON.stringify(slugs)}`,
      };
    },
  },
];

// ---------------------------------------------------------------------------
// Runner + UI
// ---------------------------------------------------------------------------

const categoryOrder: Category[] = [
  "Defaults",
  "CRUD",
  "Foreign keys",
  "JSON columns",
  "Indexes",
  "RQB",
  "Repos",
  "Persistence",
];

async function runChecks(filter?: Category): Promise<void> {
  if (!handle) return;
  clearOutput();
  const selected = filter
    ? allChecks.filter((c) => c.category === filter)
    : allChecks;

  appendOutput(
    el("h3", {
      text: filter ? `Running: ${filter}` : "Running: All categories",
    }),
  );

  let passed = 0;
  let failed = 0;
  const totalsByCat: Partial<Record<Category, { pass: number; fail: number }>> = {};

  for (const cat of categoryOrder) {
    const inCat = selected.filter((c) => c.category === cat);
    if (inCat.length === 0) continue;
    appendOutput(el("h4", { text: cat }));
    for (const check of inCat) {
      let outcome: CheckOutcome;
      try {
        outcome = await check.run(handle);
      } catch (err) {
        outcome = { ok: false, detail: `THROW: ${String(err)}` };
      }
      const line = el("div", {
        cls: "log " + (outcome.ok ? "ok" : "fail"),
      });
      line.appendChild(el("strong", { text: outcome.ok ? "PASS  " : "FAIL  " }));
      line.appendChild(el("span", { text: check.label }));
      if (outcome.detail) {
        line.appendChild(
          el("div", { text: outcome.detail, cls: "muted small" }),
        );
      }
      appendOutput(line);
      if (outcome.ok) {
        passed += 1;
        const bucket = (totalsByCat[cat] ??= { pass: 0, fail: 0 });
        bucket.pass += 1;
        console.log(`[dbDebug] PASS ${check.label}`, outcome.detail ?? "");
      } else {
        failed += 1;
        const bucket = (totalsByCat[cat] ??= { pass: 0, fail: 0 });
        bucket.fail += 1;
        console.error(`[dbDebug] FAIL ${check.label}`, outcome.detail ?? "");
      }
    }
  }

  const summary = el("div", {
    cls: "summary " + (failed === 0 ? "ok" : "fail"),
  });
  summary.appendChild(
    el("strong", {
      text: `${passed}/${passed + failed} passed`,
    }),
  );
  const parts: string[] = [];
  for (const cat of categoryOrder) {
    const t = totalsByCat[cat];
    if (!t) continue;
    parts.push(`${cat}: ${t.pass}/${t.pass + t.fail}`);
  }
  summary.appendChild(el("div", { text: parts.join("  ·  "), cls: "muted small" }));
  appendOutput(summary);
}

async function seedSample(): Promise<void> {
  if (!handle) return;
  const { db } = handle;
  try {
    await db.insert(schema.topics).values([
      { id: "arrays", name: "Arrays" },
      { id: "graphs", name: "Graphs" },
      { id: "dp", name: "Dynamic Programming" },
    ]);
    await db.insert(schema.companies).values([
      { id: "google", name: "Google" },
      { id: "meta", name: "Meta" },
    ]);
    await db.insert(schema.problems).values([
      {
        slug: "two-sum",
        leetcodeId: "1",
        title: "Two Sum",
        difficulty: "Easy",
        url: "https://leetcode.com/problems/two-sum/",
        topicIds: ["arrays"],
        companyIds: ["google", "meta"],
      },
      {
        slug: "longest-substring",
        leetcodeId: "3",
        title: "Longest Substring Without Repeating Characters",
        difficulty: "Medium",
        url: "https://leetcode.com/problems/longest-substring-without-repeating-characters/",
        topicIds: ["arrays"],
      },
    ]);
    await db
      .insert(schema.tracks)
      .values({ id: "demo-track", name: "Demo Track", isCurated: false });
    await db.insert(schema.trackGroups).values({
      id: "demo-arrays",
      trackId: "demo-track",
      topicId: "arrays",
      orderIndex: 0,
    });
    await db.insert(schema.trackGroupProblems).values([
      { groupId: "demo-arrays", problemSlug: "two-sum", orderIndex: 0 },
      {
        groupId: "demo-arrays",
        problemSlug: "longest-substring",
        orderIndex: 1,
      },
    ]);
    appendOutput(el("div", { text: "Seeded sample data.", cls: "log ok" }));
  } catch (err) {
    appendOutput(
      el("div", { text: `Seed failed: ${String(err)}`, cls: "log fail" }),
    );
  }
}

async function resetDb(): Promise<void> {
  handle?.rawDb.close();
  setStatus("Resetting…", true);
  handle = await bootDb();
  setStatus("DB ready (fresh in-memory snapshot)", true);
  clearOutput();
  appendOutput(el("div", { text: "Reset.", cls: "log ok" }));
}

function runSql(sqlText: string): void {
  if (!handle) return;
  const trimmed = sqlText.trim();
  if (!trimmed) return;
  appendOutput(el("h4", { text: "Query" }));
  appendOutput(el("pre", { text: trimmed, cls: "sql" }));
  try {
    const rows = handle.rawDb.exec({
      sql: trimmed,
      rowMode: "object",
      returnValue: "resultRows",
    }) as unknown as Record<string, unknown>[];
    appendOutput(
      el("div", { text: `${rows.length} row(s)`, cls: "muted small" }),
    );
    appendOutput(renderRowsAsTable(rows));
  } catch (err) {
    appendOutput(el("pre", { text: String(err), cls: "log fail" }));
  }
}

function wireButtons(): void {
  const runBtn = document.getElementById("run-sql");
  const sqlBox = document.getElementById("sql-input") as HTMLTextAreaElement | null;
  if (runBtn && sqlBox) {
    runBtn.addEventListener("click", () => runSql(sqlBox.value));
    sqlBox.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        runSql(sqlBox.value);
      }
    });
  }
  document
    .getElementById("run-all")
    ?.addEventListener("click", () => void runChecks());
  for (const cat of categoryOrder) {
    const btn = document.getElementById(`run-${cat.replace(/\s/g, "-")}`);
    btn?.addEventListener("click", () => void runChecks(cat));
  }
  document
    .getElementById("seed")
    ?.addEventListener("click", () => void seedSample());
  document
    .getElementById("reset")
    ?.addEventListener("click", () => void resetDb());
  document
    .getElementById("clear")
    ?.addEventListener("click", () => clearOutput());
}

(async () => {
  try {
    setStatus("Initialising sqlite-wasm…", true);
    handle = await bootDb();
    setStatus(
      `DB ready (in-memory; migration applied; ${allChecks.length} checks available)`,
      true,
    );
    wireButtons();
  } catch (err) {
    console.error("[dbDebug] boot failure", err);
    setStatus(`Boot failed: ${String(err)}`, false);
  }
})();
