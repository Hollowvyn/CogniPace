import { createDefaultStudyState } from "./constants";
import {
  AppData,
  CuratedProblemInput,
  Difficulty,
  Problem,
  StudyState,
} from "./types";
import {
  isProblemPage,
  normalizeSlug,
  nowIso,
  parseDifficulty,
  slugToTitle,
  slugToUrl,
  uniqueStrings,
} from "./utils";
import { resolveSeedTopicId } from "../catalog/topicsSeed";

/**
 * Maps legacy `topics: string[]` to v7 `topicIds: TopicId[]` by resolving
 * each label against the curated topic seed. Unknown labels are dropped
 * (they remain visible in `topics` for reference); custom-topic creation
 * happens via the v7 topicRepository, not this implicit path.
 */
function deriveTopicIdsFromLabels(labels: readonly string[]): string[] {
  const out: string[] = [];
  for (const label of labels) {
    const resolved = resolveSeedTopicId(label);
    if (resolved && !out.includes(resolved)) out.push(resolved);
  }
  return out;
}

export interface UpsertProblemInput {
  slug: string;
  title?: string;
  difficulty?: Difficulty;
  isPremium?: boolean;
  url?: string;
  topics?: string[];
  sourceSet?: string;
}

export function ensureProblem(
  data: AppData,
  input: UpsertProblemInput
): Problem {
  const slug = normalizeSlug(input.slug);
  if (!slug) {
    throw new Error("Invalid LeetCode slug.");
  }

  const existing = data.problemsBySlug[slug];
  const now = nowIso();

  if (!existing) {
    const labels = uniqueStrings(input.topics ?? []);
    const created: Problem = {
      id: slug,
      leetcodeSlug: slug,
      slug,
      title: input.title?.trim() || slugToTitle(slug),
      difficulty: input.difficulty ?? "Unknown",
      isPremium: input.isPremium,
      url: input.url?.trim() || slugToUrl(slug),
      topics: labels,
      topicIds: deriveTopicIdsFromLabels(labels),
      companyIds: [],
      sourceSet: input.sourceSet ? [input.sourceSet] : [],
      createdAt: now,
      updatedAt: now,
    };

    data.problemsBySlug[slug] = created;
    return created;
  }

  const mergedLabels = uniqueStrings([
    ...(existing.topics ?? []),
    ...(input.topics ?? []),
  ]);
  const mergedTopicIds = uniqueStrings([
    ...(existing.topicIds ?? []),
    ...deriveTopicIdsFromLabels(input.topics ?? []),
  ]);
  const merged: Problem = {
    ...existing,
    title: input.title?.trim() || existing.title,
    difficulty:
      input.difficulty && input.difficulty !== "Unknown"
        ? input.difficulty
        : existing.difficulty,
    isPremium:
      typeof input.isPremium === "boolean"
        ? input.isPremium
        : existing.isPremium,
    url: input.url?.trim() || existing.url,
    topics: mergedLabels,
    topicIds: mergedTopicIds,
    companyIds: existing.companyIds ?? [],
    sourceSet: uniqueStrings([
      ...(existing.sourceSet ?? []),
      ...(input.sourceSet ? [input.sourceSet] : []),
    ]),
    updatedAt: now,
  };

  data.problemsBySlug[slug] = merged;
  return merged;
}

export function ensureStudyState(data: AppData, slug: string): StudyState {
  const normalized = normalizeSlug(slug);
  const existing = data.studyStatesBySlug[normalized];
  if (existing) {
    return existing;
  }

  const created = createDefaultStudyState();
  data.studyStatesBySlug[normalized] = created;
  return created;
}

export function importProblemsIntoSet(
  data: AppData,
  setName: string,
  items: CuratedProblemInput[]
): { added: number; updated: number } {
  let added = 0;
  let updated = 0;

  for (const item of items) {
    const slug = normalizeSlug(item.slug);
    if (!slug) {
      continue;
    }

    const existed = !!data.problemsBySlug[slug];
    ensureProblem(data, {
      slug,
      title: item.title,
      difficulty: item.difficulty,
      isPremium: item.isPremium,
      topics: item.tags,
      sourceSet: setName,
    });

    ensureStudyState(data, slug);

    if (existed) {
      updated += 1;
    } else {
      added += 1;
    }
  }

  return { added, updated };
}

export function parseProblemInput(input: string): {
  slug: string;
  url?: string;
} {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error("Enter a LeetCode URL or slug.");
  }

  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) {
    try {
      if (!isProblemPage(trimmed)) {
        throw new Error("URL does not appear to be a LeetCode problem.");
      }

      const parsed = new URL(trimmed);
      const match = parsed.pathname.match(/\/problems\/([^/]+)\/?/i);
      if (!match?.[1]) {
        throw new Error("URL does not appear to be a LeetCode problem.");
      }

      const slug = normalizeSlug(match[1]);
      if (!slug) {
        throw new Error("Could not parse slug from URL.");
      }

      return { slug, url: `https://leetcode.com/problems/${slug}/` };
    } catch {
      throw new Error("URL does not appear to be a LeetCode problem.");
    }
  }

  const slug = normalizeSlug(trimmed);
  if (!slug) {
    throw new Error("Invalid slug.");
  }

  return {
    slug,
    url: `https://leetcode.com/problems/${slug}/`,
  };
}

export function normalizeDifficulty(input?: string): Difficulty {
  return parseDifficulty(input);
}
