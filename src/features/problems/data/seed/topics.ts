/**
 * Canonical Topic registry seed. Curated topic ids are stable slug-style
 * strings; their `name` is the user-facing label. The seed list mirrors
 * LeetCode's commonly used taxonomy plus the variants used by curated
 * track seeds (Blind75, NeetCode, etc.).
 *
 * Topic synonyms (e.g., "Heap" / "Heaps" / "Heap / Priority Queue") all
 * resolve to a single canonical id at seed time so problems carry only
 * canonical references.
 */
import { asTopicId, type TopicId } from "@shared/ids";

import type { Topic } from "../../domain/model";

interface TopicSeed {
  id: TopicId;
  name: string;
  /** Alternate display strings encountered in the catalog. Resolved to `id`. */
  aliases?: string[];
  description?: string;
}

const SEED: TopicSeed[] = [
  { id: asTopicId("array"), name: "Array", aliases: ["Arrays", "Array / String", "Arrays & Hashing"] },
  { id: asTopicId("string"), name: "String", aliases: ["Strings"] },
  { id: asTopicId("hash-map"), name: "Hash Map", aliases: ["Hash Map / Set", "Hash Maps And Sets", "Hash Set"] },
  { id: asTopicId("two-pointers"), name: "Two Pointers", aliases: ["Fast And Slow Pointers"] },
  { id: asTopicId("sliding-window"), name: "Sliding Window" },
  { id: asTopicId("binary-search"), name: "Binary Search", aliases: ["Sort And Search"] },
  { id: asTopicId("linked-list"), name: "Linked List", aliases: ["Linked Lists"] },
  { id: asTopicId("stack"), name: "Stack", aliases: ["Stacks"] },
  { id: asTopicId("queue"), name: "Queue" },
  { id: asTopicId("monotonic-stack"), name: "Monotonic Stack" },
  { id: asTopicId("tree"), name: "Tree", aliases: ["Trees"] },
  { id: asTopicId("binary-tree"), name: "Binary Tree", aliases: ["Binary Tree - BFS", "Binary Tree - DFS"] },
  { id: asTopicId("binary-search-tree"), name: "Binary Search Tree" },
  { id: asTopicId("trie"), name: "Trie", aliases: ["Tries"] },
  { id: asTopicId("heap"), name: "Heap", aliases: ["Heaps", "Heap / Priority Queue", "Priority Queue"] },
  { id: asTopicId("graph"), name: "Graph", aliases: ["Graphs", "Graphs - BFS", "Graphs - DFS", "Advanced Graphs"] },
  { id: asTopicId("dynamic-programming"), name: "Dynamic Programming" },
  { id: asTopicId("1d-dp"), name: "1-D Dynamic Programming", aliases: ["DP - 1D"] },
  { id: asTopicId("2d-dp"), name: "2-D Dynamic Programming", aliases: ["DP - Multidimensional"] },
  { id: asTopicId("backtracking"), name: "Backtracking" },
  { id: asTopicId("greedy"), name: "Greedy" },
  { id: asTopicId("bit-manipulation"), name: "Bit Manipulation", aliases: ["Binary"] },
  { id: asTopicId("math"), name: "Math", aliases: ["Math & Geometry", "Math And Geometry"] },
  { id: asTopicId("intervals"), name: "Intervals", aliases: ["Interval"] },
  { id: asTopicId("matrix"), name: "Matrix" },
  { id: asTopicId("prefix-sum"), name: "Prefix Sum", aliases: ["Prefix Sums"] },
  { id: asTopicId("sequence"), name: "Sequence" },
];

/** Returns a fresh map of seeded Topics keyed by id. */
export function buildTopicSeed(now: string): Record<string, Topic> {
  return Object.fromEntries(
    SEED.map((seed) => [
      seed.id,
      {
        id: seed.id,
        name: seed.name,
        description: seed.description,
        isCustom: false,
        createdAt: now,
        updatedAt: now,
      } satisfies Topic,
    ]),
  );
}

/**
 * Resolves an arbitrary topic display string (from a curated catalog or a
 * page detection) to a canonical Topic id. Unknown strings return `null`
 * so callers can decide whether to auto-create a custom Topic.
 */
export function resolveSeedTopicId(displayName: string): TopicId | null {
  const trimmed = displayName.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  for (const seed of SEED) {
    if (seed.name.toLowerCase() === lower) return seed.id;
    if (seed.aliases?.some((alias) => alias.toLowerCase() === lower)) {
      return seed.id;
    }
  }
  return null;
}

/** Returns the curated topic ids in seed order (for stable listing). */
export function listSeedTopicIds(): readonly TopicId[] {
  return SEED.map((s) => s.id);
}

/** Returns the curated topic seeds in seed order. Shape matches what the
 * SQLite topics repository's `seedCatalogTopics` consumes. */
export function listCatalogTopicSeeds(): ReadonlyArray<{
  id: TopicId;
  name: string;
  description?: string;
}> {
  return SEED.map((s) => ({
    id: s.id,
    name: s.name,
    ...(s.description !== undefined ? { description: s.description } : {}),
  }));
}
