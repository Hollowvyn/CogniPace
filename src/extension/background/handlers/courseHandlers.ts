/** Background handlers for catalog set imports and direct problem intake. */
import { getCuratedSet } from "../../../data/catalog/curatedSets";
import { getDb } from "../../../data/db/instance";
import {
  importProblem,
  getProblem,
} from "../../../data/problems/repository";
import {
  mergeSettings,
} from "../../../data/repositories/appDataRepository";
import { parseProblemInput } from "../../../data/repositories/problemRepository";
import {
  getUserSettings,
  saveUserSettings,
} from "../../../data/settings/repository";
import { ensureStudyState } from "../../../data/studyStates/repository";
import { asProblemSlug } from "../../../domain/common/ids";
import { createInitialUserSettings } from "../../../domain/settings";
import { ok } from "../responses";

import type { Difficulty } from "../../../domain/types";

/** Phase 5: setsEnabled lives in SQLite — read-merge-write rather
 * than mutating data.settings inside mutateAppData. */
async function enableSetInSqlite(setName: string): Promise<void> {
  const { db } = await getDb();
  const current = (await getUserSettings(db)) ?? createInitialUserSettings();
  const next = mergeSettings(current, {
    setsEnabled: { ...current.setsEnabled, [setName]: true },
  });
  await saveUserSettings(db, next);
}

interface SetItem {
  slug: string;
  title?: string;
  difficulty?: Difficulty;
  isPremium?: boolean;
  url?: string;
  topics?: string[];
}

/**
 * Phase 5: route bulk problem imports through SQLite. Re-importing
 * preserves sticky user-edits per importProblem (mergeImported).
 * Returns counts: `added` = slugs that didn't exist before; `updated`
 * = slugs that did.
 */
async function importSetIntoDb(
  items: readonly SetItem[],
): Promise<{ added: number; updated: number }> {
  const { db } = await getDb();
  let added = 0;
  let updated = 0;
  for (const item of items) {
    const slug = asProblemSlug(item.slug);
    if (!slug) continue;
    const wasPresent = (await getProblem(db, slug)) !== undefined;
    await importProblem(db, {
      slug,
      ...(item.title !== undefined ? { title: item.title } : {}),
      ...(item.difficulty !== undefined ? { difficulty: item.difficulty } : {}),
      ...(item.isPremium !== undefined ? { isPremium: item.isPremium } : {}),
      ...(item.url !== undefined ? { url: item.url } : {}),
    });
    if (wasPresent) updated += 1;
    else added += 1;
  }
  return { added, updated };
}

/** Imports a built-in curated set into the local library. */
export async function importCurated(payload: { setName: string }) {
  const setProblems = getCuratedSet(payload.setName);
  if (setProblems.length === 0) {
    throw new Error(`Unknown curated set: ${payload.setName}`);
  }
  const importResult = await importSetIntoDb(setProblems);
  await enableSetInSqlite(payload.setName);

  return ok({
    setName: payload.setName,
    count: setProblems.length,
    added: importResult.added,
    updated: importResult.updated,
  });
}

/** Imports a custom user-defined set into the local library. */
export async function importCustom(payload: {
  setName?: string;
  items: Array<{
    slug: string;
    title?: string;
    difficulty?: "Easy" | "Medium" | "Hard" | "Unknown";
    isPremium?: boolean;
    tags?: string[];
  }>;
}) {
  if (!Array.isArray(payload.items) || payload.items.length === 0) {
    throw new Error("Custom set import requires at least one item.");
  }

  const normalizedName = payload.setName?.trim() || "Custom";
  const importResult = await importSetIntoDb(payload.items);
  await enableSetInSqlite(normalizedName);
  if (normalizedName !== "Custom") {
    await enableSetInSqlite("Custom");
  }

  return ok({
    setName: normalizedName,
    count: payload.items.length,
    added: importResult.added,
    updated: importResult.updated,
  });
}

/** Adds a problem directly into the library from a slug or URL. */
export async function addProblemByInput(payload: {
  input: string;
  sourceSet?: string;
  topics?: string[];
  markAsStarted?: boolean;
}) {
  const parsed = parseProblemInput(payload.input);
  const { db } = await getDb();
  const branded = asProblemSlug(parsed.slug);
  const problem = await importProblem(db, {
    slug: parsed.slug,
    url: parsed.url,
    topicIds: payload.topics,
  });
  const studyState = await ensureStudyState(db, branded);
  return ok({ slug: parsed.slug, problem, studyState });
}
