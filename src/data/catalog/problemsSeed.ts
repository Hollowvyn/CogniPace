/**
 * Problem seed builder. Walks the curated catalog (Blind75, NeetCode150,
 * etc.) and produces a lightweight Problem entity for every distinct
 * slug. The first time the user opens the dashboard they should already
 * see every curated problem in the library and tracks tables — without
 * having to visit each LeetCode page first to populate the row.
 *
 * Title / difficulty come from the catalog when present; otherwise we
 * fall back to a slug-derived title and `Unknown` difficulty. Real
 * details (premium flag, leetcodeId, richer topic mapping) are filled
 * in lazily when the user opens the page.
 */
import {
  asProblemSlug,
  type ProblemSlug,
  type TopicId,
} from "@shared/ids";

import { slugToTitle, slugToUrl } from "../../domain/problem/slug";

import { resolveSeedTopicId } from "./topicsSeed";

import type { CatalogPlan } from "./curatedSets";
import type { Difficulty, Problem } from "../../domain/types";

interface ProblemAccumulator {
  title?: string;
  difficulty?: Difficulty;
  topicIds: Set<TopicId>;
}

/** Build lightweight Problem entities for every slug referenced by a
 * curated plan. Seeded once, identical across plan re-imports. */
export function buildProblemSeed(
  plans: readonly CatalogPlan[],
  now: string,
): Record<string, Problem> {
  const acc = new Map<string, ProblemAccumulator>();

  for (const plan of plans) {
    for (const section of plan.sections) {
      const topicId = resolveSeedTopicId(section.topic);
      for (const raw of section.slugs) {
        const slugValue = typeof raw === "string" ? raw : raw.slug;
        const displayTitle = typeof raw === "string" ? undefined : raw.displayTitle;
        const difficulty = typeof raw === "string" ? undefined : raw.difficulty;

        const existing =
          acc.get(slugValue) ?? { topicIds: new Set<TopicId>() };
        if (!existing.title && displayTitle) existing.title = displayTitle;
        if (!existing.difficulty && difficulty) existing.difficulty = difficulty;
        if (topicId) existing.topicIds.add(topicId);
        acc.set(slugValue, existing);
      }
    }
  }

  const out: Record<string, Problem> = {};
  for (const [slug, data] of acc) {
    const problemSlug: ProblemSlug = asProblemSlug(slug);
    out[slug] = {
      // v6 transitional fields — kept equal to `slug` until F.3 cleanup.
      id: slug,
      leetcodeSlug: slug,
      slug: problemSlug,
      title: data.title ?? slugToTitle(slug),
      difficulty: data.difficulty ?? "Unknown",
      isPremium: false,
      url: slugToUrl(slug),
      topics: [],
      topicIds: Array.from(data.topicIds),
      companyIds: [],
      sourceSet: [],
      createdAt: now,
      updatedAt: now,
    };
  }
  return out;
}
