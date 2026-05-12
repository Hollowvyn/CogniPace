import { slugify } from "./slugify";

import type { Brand } from "./Brand";

/** Slug-style identifier for a Problem (e.g., "two-sum"). */
export type ProblemSlug = Brand<string, "ProblemSlug">;

/** Normalize and brand an arbitrary string as a Problem slug. */
export function asProblemSlug(value: string): ProblemSlug {
  return slugify(value) as ProblemSlug;
}
