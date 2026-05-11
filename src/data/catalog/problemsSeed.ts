/**
 * Problem seed builder. Walks the curated catalog (Blind75, NeetCode150,
 * etc.) and the generated company catalog and produces a lightweight
 * Problem entity for every distinct slug. The first time the user opens
 * the dashboard they should already see every curated problem in the
 * library and tracks tables — without having to visit each LeetCode page
 * first to populate the row.
 *
 * Title / difficulty / url come from whichever source provides them
 * (catalog wins over slug-derived fallbacks). Real per-problem details
 * (premium flag, richer topic mapping) are filled in lazily when the
 * user opens the page.
 */
import {
  asCompanyId,
  asProblemSlug,
  type CompanyId,
  type ProblemSlug,
  type TopicId,
} from "../../domain/common/ids";
import { slugToTitle, slugToUrl } from "../../domain/problem/slug";

import {
  listCompanyCatalogEntries,
  listCompanyCatalogProblems,
} from "./generated/companiesCatalog";
import { resolveSeedTopicId } from "./topicsSeed";

import type { CatalogPlan } from "./studySetsSeed";
import type { Difficulty, Problem } from "../../domain/types";

interface ProblemAccumulator {
  title?: string;
  difficulty?: Difficulty;
  url?: string;
  leetcodeId?: string;
  topicIds: Set<TopicId>;
  companyIds: Set<CompanyId>;
}

function ensure(acc: Map<string, ProblemAccumulator>, slug: string): ProblemAccumulator {
  let entry = acc.get(slug);
  if (!entry) {
    entry = { topicIds: new Set<TopicId>(), companyIds: new Set<CompanyId>() };
    acc.set(slug, entry);
  }
  return entry;
}

/** Build lightweight Problem entities for every slug referenced by a
 * curated plan or the company catalog. Seeded once, identical across
 * plan re-imports. */
export function buildProblemSeed(
  plans: readonly CatalogPlan[],
  now: string,
): Record<string, Problem> {
  const acc = new Map<string, ProblemAccumulator>();

  // Pass 1: curated plans contribute display titles + topic mappings.
  for (const plan of plans) {
    for (const section of plan.sections) {
      const topicId = resolveSeedTopicId(section.topic);
      for (const raw of section.slugs) {
        const slugValue = typeof raw === "string" ? raw : raw.slug;
        const displayTitle = typeof raw === "string" ? undefined : raw.displayTitle;
        const difficulty = typeof raw === "string" ? undefined : raw.difficulty;

        const entry = ensure(acc, slugValue);
        if (!entry.title && displayTitle) entry.title = displayTitle;
        if (!entry.difficulty && difficulty) entry.difficulty = difficulty;
        if (topicId) entry.topicIds.add(topicId);
      }
    }
  }

  // Pass 2: company catalog contributes leetcodeId, real difficulty, url,
  // and reverse-indexed companyIds.
  for (const catalogProblem of listCompanyCatalogProblems()) {
    const entry = ensure(acc, catalogProblem.slug);
    if (!entry.title) entry.title = catalogProblem.title;
    if (!entry.difficulty) entry.difficulty = catalogProblem.difficulty;
    if (!entry.url) entry.url = catalogProblem.url;
    if (!entry.leetcodeId && catalogProblem.leetcodeId) {
      entry.leetcodeId = catalogProblem.leetcodeId;
    }
  }
  for (const company of listCompanyCatalogEntries()) {
    const companyId = asCompanyId(company.id);
    for (const tag of company.problems) {
      ensure(acc, tag.slug).companyIds.add(companyId);
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
      leetcodeId: data.leetcodeId,
      title: data.title ?? slugToTitle(slug),
      difficulty: data.difficulty ?? "Unknown",
      isPremium: false,
      url: data.url ?? slugToUrl(slug),
      topics: [],
      topicIds: Array.from(data.topicIds),
      companyIds: Array.from(data.companyIds),
      sourceSet: [],
      createdAt: now,
      updatedAt: now,
    };
  }
  return out;
}
