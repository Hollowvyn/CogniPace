/**
 * Problem aggregate repository — pure mutators on AppDataV7 drafts.
 *
 * Two distinct write paths:
 *   1. `importProblem` upserts from import sources (LeetCode page detect,
 *      curated catalog seed). Respects `userEdits` so manual fixes stick.
 *   2. `editProblem` is the user-driven edit path; sets `userEdits` flags.
 *
 * StudyState is NOT created here — see studyStateRepository (lazy).
 */
import {
  asCompanyId,
  asProblemSlug,
  asTopicId,
  type CompanyId,
  type ProblemSlug,
  type TopicId,
} from "../../../domain/common/ids";
import {
  leetcodeProblemUrl,
  normalizeProblemSlug,
  slugToTitle,
} from "../../../domain/problems/helpers";
import {
  applyEdit,
  mergeImported,
  type ProblemEditPatch,
} from "../../../domain/problems/operations";

import type { AppDataV7 } from "../../../domain/data/appDataV7";
import type { Problem } from "../../../domain/problems/model";
import type { Difficulty } from "../../../domain/types";

export interface ImportProblemArgs {
  slug: string;
  leetcodeId?: string;
  title?: string;
  difficulty?: Difficulty;
  isPremium?: boolean;
  url?: string;
  topicIds?: TopicId[] | string[];
  companyIds?: CompanyId[] | string[];
}

/**
 * Upsert a Problem record from an import source. Existing user-edited
 * fields are preserved (sticky). Missing fields fall back to derived
 * defaults (slug → title, slug → leetcode URL).
 */
export function importProblem(
  data: AppDataV7,
  args: ImportProblemArgs,
  now: string,
): AppDataV7 {
  const slug: ProblemSlug = normalizeProblemSlug(args.slug);
  if (!slug) return data;

  const incoming: ProblemEditPatch = buildPatch(args);

  const existing = data.problemsBySlug[slug];
  if (existing) {
    data.problemsBySlug[slug] = mergeImported(existing, incoming, now);
    return data;
  }

  const created: Problem = {
    slug,
    leetcodeId: args.leetcodeId,
    title: args.title ?? slugToTitle(slug),
    difficulty: args.difficulty ?? "Unknown",
    isPremium: args.isPremium ?? false,
    url: args.url ?? leetcodeProblemUrl(slug),
    topicIds: brandTopicIds(args.topicIds),
    companyIds: brandCompanyIds(args.companyIds),
    createdAt: now,
    updatedAt: now,
  };
  data.problemsBySlug[slug] = created;
  return data;
}

export interface EditProblemArgs {
  slug: string;
  patch: ProblemEditPatch;
  /** Default true; set false for system-driven edits. */
  markUserEdit?: boolean;
}

/**
 * Apply a user-driven edit to a Problem. Touched fields are flagged in
 * `userEdits` so subsequent imports preserve them. No-op when the slug
 * doesn't exist (use `importProblem` to create).
 */
export function editProblem(
  data: AppDataV7,
  args: EditProblemArgs,
  now: string,
): AppDataV7 {
  const slug: ProblemSlug = normalizeProblemSlug(args.slug);
  const existing = data.problemsBySlug[slug];
  if (!existing) return data;
  const markUserEdit = args.markUserEdit ?? true;
  data.problemsBySlug[slug] = applyEdit(existing, args.patch, now, markUserEdit);
  return data;
}

/** Read-only convenience. */
export function getProblem(
  data: AppDataV7,
  slug: ProblemSlug,
): Problem | undefined {
  return data.problemsBySlug[slug];
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

function brandTopicIds(input?: TopicId[] | string[]): TopicId[] {
  if (!input) return [];
  return input
    .map((value) => (typeof value === "string" ? asTopicId(value) : value))
    .filter((value) => value.length > 0);
}

function brandCompanyIds(input?: CompanyId[] | string[]): CompanyId[] {
  if (!input) return [];
  return input
    .map((value) => (typeof value === "string" ? asCompanyId(value) : value))
    .filter((value) => value.length > 0);
}

export { asProblemSlug };
