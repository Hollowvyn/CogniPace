import type { Difficulty } from "./Difficulty";
import type { EditableProblemField } from "./EditableProblemField";
import type { ProblemEditFlags } from "./ProblemEditFlags";
import type { ProblemEditPatch } from "./ProblemEditPatch";

/** v7 Problem — the actively-used shape. Keeps the v6 fields (`id`,
 *  `leetcodeSlug`, `topics`, `sourceSet`, `userEdits`) for legacy import
 *  compat alongside v7 (`topicIds`, `companyIds`). `slug` is the
 *  canonical identifier. */
export interface Problem {
  /** @deprecated Use `slug`. Retained equal to `slug` for v6 callers. */
  id: string;
  /** @deprecated Use `slug`. Retained equal to `slug` for v6 callers. */
  leetcodeSlug: string;
  slug: string;
  leetcodeId?: string;
  title: string;
  difficulty: Difficulty;
  isPremium?: boolean;
  url: string;
  /** @deprecated v6 string topics. Use `topicIds`. */
  topics: string[];
  topicIds: string[];
  companyIds: string[];
  /** @deprecated v6 set-membership string. Track memberships live in
   *  `track_group_problems` and are read via the tracks repo. */
  sourceSet: string[];
  userEdits?: ProblemEditFlags;
  createdAt: string;
  updatedAt: string;
}

const EDITABLE_FIELDS: readonly EditableProblemField[] = [
  "title",
  "difficulty",
  "url",
  "topicIds",
  "companyIds",
  "isPremium",
  "leetcodeId",
];

/** Returns a new Problem with the patch applied. When `markUserEdit` is
 *  true, fields touched by the patch are flagged in `userEdits` so future
 *  imports preserve them. */
export function applyEdit(
  problem: Problem,
  patch: ProblemEditPatch,
  now: string,
  markUserEdit: boolean,
): Problem {
  const next: Problem = { ...problem, updatedAt: now };
  const flagBuilder: { [K in EditableProblemField]?: true } = {
    ...(problem.userEdits ?? {}),
  };
  let touched = false;

  for (const field of EDITABLE_FIELDS) {
    if (!(field in patch)) continue;
    if (patch[field] === undefined) continue;
    assignField(next, field, patch);
    touched = true;
    if (markUserEdit) {
      flagBuilder[field] = true;
    }
  }

  if (touched && markUserEdit) {
    next.userEdits = flagBuilder as ProblemEditFlags;
  }

  return next;
}

/** Merges a freshly-imported Problem record into an existing one while
 *  respecting any user edits already recorded. The existing record's
 *  `userEdits`-flagged fields win; everything else takes the import. */
export function mergeImported(
  existing: Problem,
  imported: ProblemEditPatch,
  now: string,
): Problem {
  const flags = existing.userEdits ?? {};
  const next: Problem = { ...existing, updatedAt: now };

  for (const field of EDITABLE_FIELDS) {
    if (!(field in imported)) continue;
    if (imported[field] === undefined) continue;
    if (flags[field]) continue;
    assignField(next, field, imported);
  }

  return next;
}

function assignField(
  target: Problem,
  field: EditableProblemField,
  patch: ProblemEditPatch,
): void {
  switch (field) {
    case "title":
      if (patch.title !== undefined) target.title = patch.title;
      return;
    case "difficulty":
      if (patch.difficulty !== undefined) target.difficulty = patch.difficulty;
      return;
    case "url":
      if (patch.url !== undefined) target.url = patch.url;
      return;
    case "topicIds":
      if (patch.topicIds !== undefined) target.topicIds = [...patch.topicIds];
      return;
    case "companyIds":
      if (patch.companyIds !== undefined) {
        target.companyIds = [...patch.companyIds];
      }
      return;
    case "isPremium":
      if (patch.isPremium !== undefined) target.isPremium = patch.isPremium;
      return;
    case "leetcodeId":
      if (patch.leetcodeId !== undefined) target.leetcodeId = patch.leetcodeId;
      return;
  }
}

/** Returns the list of fields the user has manually edited. */
export function listEditedFields(problem: Problem): EditableProblemField[] {
  if (!problem.userEdits) return [];
  return EDITABLE_FIELDS.filter((field) => problem.userEdits?.[field]);
}
