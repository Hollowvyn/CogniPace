import type { Difficulty } from "./Difficulty";

/**
 * v7 Problem — `topicIds`/`companyIds` reference the new entity registries.
 * `id` and `leetcodeSlug` are kept (deprecated) so existing v6 callers
 * keep typechecking; new code uses `slug` only.
 *
 * @see "../problems/model" for the canonical type definition.
 */
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
  /** v7 — FK references to Topic registry. */
  topicIds: string[];
  /** v7 — FK references to Company registry. */
  companyIds: string[];
  /** @deprecated v6 set-membership string. Track memberships now live in
   * `track_group_problems` and are read via the tracks repo. */
  sourceSet: string[];
  userEdits?: { [key: string]: true | undefined };
  createdAt: string;
  updatedAt: string;
}
