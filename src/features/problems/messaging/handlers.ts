/** Service-worker handlers for problem-context, review, page actions, and catalog management. */
import {
  createInitialUserSettings,
  getUserSettings,
  saveUserSettings,
} from "@features/settings/server";
import { ReviewLogFields } from "@features/study";
import {
  appendAttempt,
  clearAttempts,
  ensureStudyState,
  getStudyState,
  replaceLastAttempt,
  upsertStudyState,
} from "@features/study/server";
import {
  applyReview,
  overrideLastReview,
  resetSchedule,
} from "@libs/fsrs/scheduler";
import {
  getStudyStateSummary,
  normalizeReviewLogFields,
} from "@libs/fsrs/studyState";
import { canonicalProblemUrlForOpen } from "@libs/runtime-rpc/url";
import { getDb } from "@platform/db/instance";
import { nowIso } from "@platform/time";
import {
  asCompanyId,
  asProblemSlug,
  asTopicId,
  asTrackId,
  type CompanyId,
  type TopicId,
} from "@shared/ids";

import { upsertCompany } from "../data/datasource/CompanyDataSource";
import {
  editProblem,
  getProblem,
  importProblem,
} from "../data/datasource/ProblemDataSource";
import { upsertTopic } from "../data/datasource/TopicDataSource";
import { normalizeDifficulty , parseProblemInput } from "../data/repository/ProblemRepository";
import { getCuratedSet } from "../data/seed/curatedSets";
import { isProblemPage, normalizeSlug } from "../domain/model";

import type { ProblemEditPatch } from "../domain/model";

// ---------- Helpers ----------

function readSenderUrl(
  sender?: chrome.runtime.MessageSender,
): string | undefined {
  if (typeof sender?.url === "string") return sender.url;
  if (typeof sender?.tab?.url === "string") return sender.tab.url;
  return undefined;
}

function buildReviewLogFields(
  payload: Partial<ReviewLogFields>,
  current: ReviewLogFields,
): ReviewLogFields {
  return normalizeReviewLogFields({
    interviewPattern: payload.interviewPattern ?? current.interviewPattern,
    timeComplexity: payload.timeComplexity ?? current.timeComplexity,
    spaceComplexity: payload.spaceComplexity ?? current.spaceComplexity,
    languages: payload.languages ?? current.languages,
    notes: payload.notes ?? current.notes,
  });
}

// ---------- Page / context handlers ----------

export async function openProblemPage(
  payload: { slug: string; trackId?: string; groupId?: string },
  sender?: chrome.runtime.MessageSender,
): Promise<{ opened: true }> {
  const slug = normalizeSlug(payload.slug);
  if (!slug) throw new Error("Invalid slug.");

  if (payload.trackId) {
    const { db } = await getDb();
    const current =
      (await getUserSettings(db)) ?? createInitialUserSettings();
    await saveUserSettings(db, {
      ...current,
      activeTrackId: asTrackId(payload.trackId),
    });
  }

  const url = canonicalProblemUrlForOpen(slug);
  const senderUrl = readSenderUrl(sender);
  const senderTabId = sender?.tab?.id;
  const shouldReuseSenderTab =
    typeof senderTabId === "number" &&
    !!senderUrl &&
    isProblemPage(senderUrl);

  if (shouldReuseSenderTab) {
    await chrome.tabs.update(senderTabId, { url });
  } else {
    await chrome.tabs.create({ url });
  }

  return { opened: true as const };
}

export async function upsertFromPage(payload: {
  slug: string;
  title?: string;
  difficulty?: string;
  isPremium?: boolean;
  url?: string;
  topics?: string[];
}): Promise<{ problem: unknown; studyState: unknown }> {
  const slug = normalizeSlug(payload.slug);
  if (!slug) throw new Error("Invalid slug.");
  const { db } = await getDb();
  const branded = asProblemSlug(slug);
  const difficulty = normalizeDifficulty(payload.difficulty);
  const problem = await importProblem(db, {
    slug,
    ...(payload.title !== undefined ? { title: payload.title } : {}),
    ...(difficulty !== undefined ? { difficulty } : {}),
    ...(payload.isPremium !== undefined
      ? { isPremium: payload.isPremium }
      : {}),
    ...(payload.url !== undefined ? { url: payload.url } : {}),
  });
  const studyState = await ensureStudyState(db, branded);
  return { problem, studyState };
}

export async function getProblemContext(payload: {
  slug: string;
}): Promise<{ problem: unknown; studyState: unknown }> {
  const slug = normalizeSlug(payload.slug);
  if (!slug) return { problem: null, studyState: null };
  const { db } = await getDb();
  const branded = asProblemSlug(slug);
  const problem = await getProblem(db, branded);
  const studyState = await getStudyState(db, branded);
  return { problem: problem ?? null, studyState: studyState ?? null };
}

// ---------- Review handlers ----------

export async function saveReviewResult(payload: {
  slug: string;
  rating: 0 | 1 | 2 | 3;
  solveTimeMs?: number;
  mode?: "RECALL" | "FULL_SOLVE";
  interviewPattern?: string;
  timeComplexity?: string;
  spaceComplexity?: string;
  languages?: string;
  notes?: string;
  trackId?: string;
  groupId?: string;
}) {
  const normalized = normalizeSlug(payload.slug);
  if (!normalized) throw new Error("Invalid slug.");
  const now = nowIso();
  const { db } = await getDb();
  const branded = asProblemSlug(normalized);
  const problem = await importProblem(db, { slug: normalized });
  const current = await ensureStudyState(db, branded);
  const logSnapshot = buildReviewLogFields(payload, current);
  const settings =
    (await getUserSettings(db)) ?? createInitialUserSettings();
  const nextState = applyReview({
    state: current,
    difficulty: problem.difficulty,
    rating: payload.rating,
    solveTimeMs: payload.solveTimeMs,
    mode: payload.mode,
    logSnapshot,
    settings,
    now,
  });
  await upsertStudyState(db, branded, nextState);
  const newAttempt =
    nextState.attemptHistory[nextState.attemptHistory.length - 1];
  if (newAttempt) await appendAttempt(db, branded, newAttempt);
  if (payload.trackId) {
    await saveUserSettings(db, {
      ...settings,
      activeTrackId: asTrackId(payload.trackId),
    });
  }
  const studyStateSummary = getStudyStateSummary(nextState);
  return {
    studyState: nextState,
    nextReviewAt: studyStateSummary.nextReviewAt,
    phase: studyStateSummary.phase,
    lastRating: nextState.lastRating,
  };
}

export async function saveOverlayLogDraft(payload: {
  slug: string;
  interviewPattern?: string;
  timeComplexity?: string;
  spaceComplexity?: string;
  languages?: string;
  notes?: string;
}): Promise<{ studyState: unknown }> {
  const normalized = normalizeSlug(payload.slug);
  if (!normalized) throw new Error("Invalid slug.");
  const { db } = await getDb();
  const branded = asProblemSlug(normalized);
  await importProblem(db, { slug: normalized });
  const current = await ensureStudyState(db, branded);
  const nextLogFields = buildReviewLogFields(payload, current);
  const saved = await upsertStudyState(db, branded, {
    ...current,
    ...nextLogFields,
  });
  return { studyState: saved };
}

export async function overrideLastReviewResult(payload: {
  slug: string;
  rating: 0 | 1 | 2 | 3;
  solveTimeMs?: number;
  mode?: "RECALL" | "FULL_SOLVE";
  interviewPattern?: string;
  timeComplexity?: string;
  spaceComplexity?: string;
  languages?: string;
  notes?: string;
  trackId?: string;
  groupId?: string;
}) {
  const normalized = normalizeSlug(payload.slug);
  if (!normalized) throw new Error("Invalid slug.");
  const now = nowIso();
  const { db } = await getDb();
  const branded = asProblemSlug(normalized);
  await importProblem(db, { slug: normalized });
  const current = await ensureStudyState(db, branded);
  const logSnapshot = buildReviewLogFields(payload, current);
  const settings =
    (await getUserSettings(db)) ?? createInitialUserSettings();
  const nextState = overrideLastReview({
    state: current,
    rating: payload.rating,
    solveTimeMs: payload.solveTimeMs,
    mode: payload.mode,
    logSnapshot,
    settings,
    now,
  });
  await upsertStudyState(db, branded, nextState);
  const replacedAttempt =
    nextState.attemptHistory[nextState.attemptHistory.length - 1];
  if (replacedAttempt)
    await replaceLastAttempt(db, branded, replacedAttempt);
  if (payload.trackId) {
    await saveUserSettings(db, {
      ...settings,
      activeTrackId: asTrackId(payload.trackId),
    });
  }
  const studyStateSummary = getStudyStateSummary(nextState);
  return {
    studyState: nextState,
    nextReviewAt: studyStateSummary.nextReviewAt,
    phase: studyStateSummary.phase,
    lastRating: nextState.lastRating,
  };
}

export function rateProblem(payload: {
  slug: string;
  rating: 0 | 1 | 2 | 3;
  solveTimeMs?: number;
  mode?: "RECALL" | "FULL_SOLVE";
  notesSnapshot?: string;
}) {
  return saveReviewResult({
    slug: payload.slug,
    rating: payload.rating,
    solveTimeMs: payload.solveTimeMs,
    mode: payload.mode,
    notes: payload.notesSnapshot,
  });
}

// ---------- Study-state mutation handlers ----------

export async function updateNotes(payload: {
  slug: string;
  notes: string;
}): Promise<{ studyState: unknown }> {
  const normalized = normalizeSlug(payload.slug);
  if (!normalized) throw new Error("Invalid slug.");
  const { db } = await getDb();
  const branded = asProblemSlug(normalized);
  await importProblem(db, { slug: normalized });
  const current = await ensureStudyState(db, branded);
  const saved = await upsertStudyState(db, branded, {
    ...current,
    notes: payload.notes,
  });
  return { studyState: saved };
}

export async function updateTags(payload: {
  slug: string;
  tags: string[];
}): Promise<{ studyState: unknown }> {
  const normalized = normalizeSlug(payload.slug);
  if (!normalized) throw new Error("Invalid slug.");
  const { db } = await getDb();
  const branded = asProblemSlug(normalized);
  await importProblem(db, { slug: normalized });
  const current = await ensureStudyState(db, branded);
  const saved = await upsertStudyState(db, branded, {
    ...current,
    tags: payload.tags.map((tag) => tag.trim()).filter(Boolean),
  });
  return { studyState: saved };
}

export async function suspendProblem(payload: {
  slug: string;
  suspend: boolean;
}): Promise<{ studyState: unknown }> {
  const normalized = normalizeSlug(payload.slug);
  if (!normalized) throw new Error("Invalid slug.");
  const { db } = await getDb();
  const branded = asProblemSlug(normalized);
  await importProblem(db, { slug: normalized });
  const current = await ensureStudyState(db, branded);
  const saved = await upsertStudyState(db, branded, {
    ...current,
    suspended: payload.suspend,
  });
  return { studyState: saved };
}

export async function resetProblem(payload: {
  slug: string;
  keepNotes?: boolean;
}): Promise<{ studyState: unknown }> {
  const normalized = normalizeSlug(payload.slug);
  if (!normalized) throw new Error("Invalid slug.");
  const { db } = await getDb();
  const branded = asProblemSlug(normalized);
  await importProblem(db, { slug: normalized });
  const existing = await getStudyState(db, branded);
  const reset = resetSchedule(existing, payload.keepNotes ?? true);
  await clearAttempts(db, branded);
  const saved = await upsertStudyState(db, branded, reset);
  return { studyState: saved };
}

// ---------- Problem edit / classification handlers (from v7) ----------

export interface EditProblemPayload {
  slug: string;
  patch: ProblemEditPatch & { topicIds?: string[]; companyIds?: string[] };
  markUserEdit?: boolean;
}

export async function editProblemHandler(
  payload: EditProblemPayload,
): Promise<{ slug: string }> {
  const slug = asProblemSlug(payload.slug);
  const patch: ProblemEditPatch = {
    ...payload.patch,
    topicIds: payload.patch.topicIds?.map((id) => asTopicId(id)) as
      | TopicId[]
      | undefined,
    companyIds: payload.patch.companyIds?.map((id) =>
      asCompanyId(id),
    ) as CompanyId[] | undefined,
  };
  const { db } = await getDb();
  const existing = await getProblem(db, slug);
  if (!existing) {
    throw new Error(
      "Open this problem on LeetCode first — it hasn't been initialised yet, so there's nothing to edit. Visit the page and then come back.",
    );
  }
  await editProblem(db, {
    slug,
    patch,
    markUserEdit: payload.markUserEdit ?? true,
  });
  return { slug };
}

export interface CreateCustomTopicPayload {
  name: string;
  description?: string;
}

export async function createCustomTopicHandler(
  payload: CreateCustomTopicPayload,
): Promise<{ id: string }> {
  const { db } = await getDb();
  const topic = await upsertTopic(db, {
    name: payload.name,
    description: payload.description,
    isCustom: true,
  });
  return { id: topic.id };
}

export interface CreateCustomCompanyPayload {
  name: string;
  description?: string;
}

export async function createCustomCompanyHandler(
  payload: CreateCustomCompanyPayload,
): Promise<{ id: string }> {
  const { db } = await getDb();
  const company = await upsertCompany(db, {
    name: payload.name,
    description: payload.description,
    isCustom: true,
  });
  return { id: company.id };
}

export interface AssignTopicPayload {
  slug: string;
  topicId: string;
  assigned?: boolean;
}

export async function assignTopicHandler(
  payload: AssignTopicPayload,
): Promise<{ slug: string }> {
  const slug = asProblemSlug(payload.slug);
  const topicId = asTopicId(payload.topicId);
  const assigned = payload.assigned ?? true;
  const { db } = await getDb();
  const existing = await getProblem(db, slug);
  if (!existing) {
    throw new Error(
      "Open this problem on LeetCode first — it hasn't been initialised yet, so there's nothing to assign a topic to.",
    );
  }
  const current = existing.topicIds as TopicId[];
  const has = current.includes(topicId);
  if (assigned && has) return { slug };
  if (!assigned && !has) return { slug };
  const nextIds = assigned
    ? [...current, topicId]
    : current.filter((id) => id !== topicId);
  await editProblem(db, {
    slug,
    patch: { topicIds: nextIds },
    markUserEdit: true,
  });
  return { slug };
}

export interface AssignCompanyPayload {
  slug: string;
  companyId: string;
  assigned?: boolean;
}

export async function assignCompanyHandler(
  payload: AssignCompanyPayload,
): Promise<{ slug: string }> {
  const slug = asProblemSlug(payload.slug);
  const companyId = asCompanyId(payload.companyId);
  const assigned = payload.assigned ?? true;
  const { db } = await getDb();
  const existing = await getProblem(db, slug);
  if (!existing) {
    throw new Error(
      "Open this problem on LeetCode first — it hasn't been initialised yet, so there's nothing to assign a company to.",
    );
  }
  const current = existing.companyIds as CompanyId[];
  const has = current.includes(companyId);
  if (assigned && has) return { slug };
  if (!assigned && !has) return { slug };
  const nextIds = assigned
    ? [...current, companyId]
    : current.filter((id) => id !== companyId);
  await editProblem(db, {
    slug,
    patch: { companyIds: nextIds },
    markUserEdit: true,
  });
  return { slug };
}

// ---------- Catalog import handlers (from courseHandlers) ----------

interface CatalogItem {
  slug: string;
  title?: string;
  difficulty?: "Easy" | "Medium" | "Hard" | "Unknown";
  isPremium?: boolean;
  url?: string;
  topics?: string[];
}

async function importSetIntoDb(
  items: readonly CatalogItem[],
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

export async function importCuratedTrackHandler(payload: {
  trackName: string;
}): Promise<{ trackName: string; count: number; added: number; updated: number }> {
  const setProblems = getCuratedSet(payload.trackName);
  if (setProblems.length === 0) {
    throw new Error(`Unknown curated track: ${payload.trackName}`);
  }
  const importResult = await importSetIntoDb(setProblems);
  return {
    trackName: payload.trackName,
    count: setProblems.length,
    added: importResult.added,
    updated: importResult.updated,
  };
}

export async function importCustomTrackHandler(payload: {
  trackName?: string;
  items: CatalogItem[];
}): Promise<{ trackName: string; count: number; added: number; updated: number }> {
  if (!Array.isArray(payload.items) || payload.items.length === 0) {
    throw new Error("Custom track import requires at least one item.");
  }
  const normalizedName = payload.trackName?.trim() || "Custom";
  const importResult = await importSetIntoDb(payload.items);
  return {
    trackName: normalizedName,
    count: payload.items.length,
    added: importResult.added,
    updated: importResult.updated,
  };
}

export async function addProblemByInputHandler(payload: {
  input: string;
  sourceSet?: string;
  topics?: string[];
  markAsStarted?: boolean;
}): Promise<{ slug: string; problem: unknown; studyState: unknown }> {
  const parsed = parseProblemInput(payload.input);
  const { db } = await getDb();
  const branded = asProblemSlug(parsed.slug);
  const problem = await importProblem(db, {
    slug: parsed.slug,
    url: parsed.url,
    topicIds: payload.topics,
  });
  const studyState = await ensureStudyState(db, branded);
  return { slug: parsed.slug, problem, studyState };
}
