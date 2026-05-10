/**
 * Problem aggregate — the source-of-truth for *what a question is*.
 *
 * The slug is the LeetCode-canonical identifier and serves as the primary
 * key. Topics and companies are first-class entities referenced by id.
 * `userEdits` tracks fields the user has manually overridden so that
 * subsequent imports do not clobber them.
 */
import type { CompanyId, ProblemSlug, TopicId } from "../common/ids";
import type { Difficulty } from "../types";

/** Fields the UI is allowed to edit on a Problem. */
export type EditableProblemField =
  | "title"
  | "difficulty"
  | "url"
  | "topicIds"
  | "companyIds"
  | "isPremium"
  | "leetcodeId";

/**
 * Sticky-edit flags. When a flag is `true`, the corresponding field
 * survives subsequent imports (LeetCode never gets to overwrite it).
 */
export type ProblemEditFlags = {
  readonly [K in EditableProblemField]?: true;
};

export interface Problem {
  readonly slug: ProblemSlug;
  leetcodeId?: string;
  title: string;
  difficulty: Difficulty;
  isPremium: boolean;
  url: string;
  topicIds: TopicId[];
  companyIds: CompanyId[];
  userEdits?: ProblemEditFlags;
  readonly createdAt: string;
  updatedAt: string;
}
