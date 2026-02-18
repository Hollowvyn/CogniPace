import { AppData, CuratedProblemInput, StudyState } from "./types";
import { slugToTitle, slugToUrl, uniqueStrings } from "./utils";

interface TopicPathSection {
  topic: string;
  slugs: string[];
}

export interface CurriculumStep {
  topic: string;
  slug: string;
  title: string;
  url: string;
}

const blind75TopicPath: TopicPathSection[] = [
  {
    topic: "Array",
    slugs: [
      "two-sum",
      "best-time-to-buy-and-sell-stock",
      "contains-duplicate",
      "product-of-array-except-self",
      "maximum-subarray",
      "maximum-product-subarray",
      "find-minimum-in-rotated-sorted-array",
      "search-in-rotated-sorted-array",
      "3sum",
      "container-with-most-water"
    ]
  },
  {
    topic: "Binary",
    slugs: [
      "sum-of-two-integers",
      "number-of-1-bits",
      "counting-bits",
      "missing-number",
      "reverse-bits"
    ]
  },
  {
    topic: "Dynamic Programming",
    slugs: [
      "climbing-stairs",
      "coin-change",
      "longest-increasing-subsequence",
      "longest-common-subsequence",
      "word-break",
      "combination-sum-iv",
      "house-robber",
      "house-robber-ii",
      "decode-ways",
      "unique-paths",
      "jump-game"
    ]
  },
  {
    topic: "Graph",
    slugs: [
      "clone-graph",
      "course-schedule",
      "pacific-atlantic-water-flow",
      "number-of-islands",
      "longest-consecutive-sequence",
      "alien-dictionary",
      "graph-valid-tree",
      "number-of-connected-components-in-an-undirected-graph"
    ]
  },
  {
    topic: "Interval",
    slugs: [
      "insert-interval",
      "merge-intervals",
      "non-overlapping-intervals",
      "meeting-rooms",
      "meeting-rooms-ii"
    ]
  },
  {
    topic: "Linked List",
    slugs: [
      "reverse-linked-list",
      "linked-list-cycle",
      "merge-two-sorted-lists",
      "merge-k-sorted-lists",
      "remove-nth-node-from-end-of-list",
      "reorder-list"
    ]
  },
  {
    topic: "Matrix",
    slugs: [
      "set-matrix-zeroes",
      "spiral-matrix",
      "rotate-image",
      "word-search"
    ]
  },
  {
    topic: "String",
    slugs: [
      "longest-substring-without-repeating-characters",
      "longest-repeating-character-replacement",
      "minimum-window-substring",
      "valid-anagram",
      "group-anagrams",
      "valid-parentheses",
      "valid-palindrome",
      "longest-palindromic-substring",
      "palindromic-substrings",
      "encode-and-decode-strings"
    ]
  },
  {
    topic: "Tree",
    slugs: [
      "maximum-depth-of-binary-tree",
      "same-tree",
      "invert-binary-tree",
      "binary-tree-maximum-path-sum",
      "binary-tree-level-order-traversal",
      "serialize-and-deserialize-binary-tree",
      "subtree-of-another-tree",
      "construct-binary-tree-from-preorder-and-inorder-traversal",
      "validate-binary-search-tree",
      "kth-smallest-element-in-a-bst",
      "lowest-common-ancestor-of-a-binary-search-tree",
      "implement-trie-prefix-tree",
      "add-and-search-word-data-structure-design",
      "word-search-ii"
    ]
  },
  {
    topic: "Heap",
    slugs: [
      "merge-k-sorted-lists",
      "top-k-frequent-elements",
      "find-median-from-data-stream"
    ]
  }
];

const blind75Slugs = blind75TopicPath.flatMap((section) => section.slugs);

const leetcode75Slugs = [
  "merge-strings-alternately",
  "greatest-common-divisor-of-strings",
  "kids-with-the-greatest-number-of-candies",
  "can-place-flowers",
  "reverse-vowels-of-a-string",
  "reverse-words-in-a-string",
  "product-of-array-except-self",
  "increasing-triplet-subsequence",
  "string-compression",
  "move-zeroes",
  "is-subsequence",
  "container-with-most-water",
  "max-number-of-k-sum-pairs",
  "maximum-average-subarray-i",
  "maximum-number-of-vowels-in-a-substring-of-given-length",
  "max-consecutive-ones-iii",
  "longest-subarray-of-1s-after-deleting-one-element",
  "find-the-highest-altitude",
  "find-pivot-index",
  "find-the-difference-of-two-arrays",
  "unique-number-of-occurrences",
  "determine-if-two-strings-are-close",
  "equal-row-and-column-pairs",
  "removing-stars-from-a-string",
  "asteroid-collision",
  "decode-string",
  "number-of-recent-calls",
  "dota2-senate",
  "delete-the-middle-node-of-a-linked-list",
  "odd-even-linked-list",
  "reverse-linked-list",
  "maximum-twin-sum-of-a-linked-list",
  "maximum-depth-of-binary-tree",
  "leaf-similar-trees",
  "count-good-nodes-in-binary-tree",
  "path-sum-iii",
  "longest-zigzag-path-in-a-binary-tree",
  "lowest-common-ancestor-of-a-binary-tree",
  "binary-tree-right-side-view",
  "maximum-level-sum-of-a-binary-tree",
  "search-in-a-binary-search-tree",
  "delete-node-in-a-bst",
  "keys-and-rooms",
  "number-of-provinces",
  "nearest-exit-from-entrance-in-maze",
  "rotting-oranges",
  "kth-largest-element-in-an-array",
  "smallest-number-in-infinite-set",
  "maximum-subsequence-score",
  "total-cost-to-hire-k-workers",
  "guess-number-higher-or-lower",
  "successful-pairs-of-spells-and-potions",
  "find-peak-element",
  "koko-eating-bananas",
  "letter-combinations-of-a-phone-number",
  "combination-sum-iii",
  "n-th-tribonacci-number",
  "min-cost-climbing-stairs",
  "house-robber",
  "domino-and-tromino-tiling",
  "unique-paths",
  "longest-common-subsequence",
  "best-time-to-buy-and-sell-stock-with-transaction-fee",
  "edit-distance",
  "counting-bits",
  "single-number",
  "minimum-flips-to-make-a-or-b-equal-to-c",
  "implement-trie-prefix-tree",
  "search-suggestions-system",
  "non-overlapping-intervals",
  "daily-temperatures",
  "combination-sum",
  "word-break",
  "task-scheduler",
  "minimum-window-substring"
];

const grind75Slugs = [
  "two-sum",
  "valid-parentheses",
  "merge-two-sorted-lists",
  "best-time-to-buy-and-sell-stock",
  "valid-palindrome",
  "invert-binary-tree",
  "valid-anagram",
  "binary-search",
  "flood-fill",
  "lowest-common-ancestor-of-a-binary-search-tree",
  "balanced-binary-tree",
  "linked-list-cycle",
  "implement-queue-using-stacks",
  "first-bad-version",
  "ransom-note",
  "climbing-stairs",
  "longest-palindrome",
  "reverse-linked-list",
  "majority-element",
  "add-binary",
  "diameter-of-binary-tree",
  "middle-of-the-linked-list",
  "maximum-depth-of-binary-tree",
  "contains-duplicate",
  "maximum-subarray",
  "insert-interval",
  "01-matrix",
  "k-closest-points-to-origin",
  "longest-substring-without-repeating-characters",
  "3sum",
  "binary-tree-level-order-traversal",
  "clone-graph",
  "evaluate-reverse-polish-notation",
  "course-schedule",
  "implement-trie-prefix-tree",
  "coin-change",
  "product-of-array-except-self",
  "min-stack",
  "validate-binary-search-tree",
  "number-of-islands",
  "rotting-oranges",
  "search-in-rotated-sorted-array",
  "combination-sum",
  "permutations",
  "merge-intervals",
  "lowest-common-ancestor-of-a-binary-tree",
  "time-based-key-value-store",
  "accounts-merge",
  "sort-colors",
  "word-break",
  "partition-equal-subset-sum",
  "string-to-integer-atoi",
  "spiral-matrix",
  "subsets",
  "binary-tree-right-side-view",
  "longest-increasing-subsequence",
  "unique-paths",
  "construct-binary-tree-from-preorder-and-inorder-traversal",
  "container-with-most-water",
  "letter-combinations-of-a-phone-number",
  "word-search",
  "find-all-anagrams-in-a-string",
  "task-scheduler",
  "largest-rectangle-in-histogram",
  "merge-k-sorted-lists",
  "minimum-height-trees",
  "find-median-from-data-stream",
  "trapping-rain-water",
  "find-minimum-in-rotated-sorted-array",
  "serialize-and-deserialize-binary-tree",
  "basic-calculator",
  "sliding-window-maximum",
  "n-queens",
  "find-k-pairs-with-smallest-sums",
  "lfu-cache",
  "minimum-window-substring"
];

const neetCodeExtra = [
  "valid-sudoku",
  "contains-duplicate-ii",
  "contains-duplicate-iii",
  "merge-sorted-array",
  "next-permutation",
  "search-a-2d-matrix",
  "search-a-2d-matrix-ii",
  "longest-consecutive-sequence",
  "encode-and-decode-strings",
  "find-the-duplicate-number",
  "sort-an-array",
  "car-fleet",
  "largest-rectangle-in-histogram",
  "trapping-rain-water",
  "remove-nth-node-from-end-of-list",
  "copy-list-with-random-pointer",
  "add-two-numbers",
  "lru-cache",
  "linked-list-cycle-ii",
  "intersection-of-two-linked-lists",
  "palindrome-linked-list",
  "plus-one",
  "powx-n",
  "sqrtx",
  "set-matrix-zeroes",
  "spiral-matrix-ii",
  "rotate-image",
  "happy-number",
  "plus-one-linked-list",
  "subsets-ii",
  "combination-sum-ii",
  "permutations-ii",
  "word-search-ii",
  "binary-tree-maximum-path-sum",
  "diameter-of-binary-tree",
  "same-tree",
  "subtree-of-another-tree",
  "binary-tree-inorder-traversal",
  "binary-tree-preorder-traversal",
  "binary-tree-postorder-traversal",
  "kth-smallest-element-in-a-bst",
  "convert-sorted-array-to-binary-search-tree",
  "max-area-of-island",
  "surrounded-regions",
  "clone-graph",
  "course-schedule-ii",
  "redundant-connection",
  "network-delay-time",
  "cheapest-flights-within-k-stops",
  "reconstruct-itinerary",
  "min-cost-to-connect-all-points",
  "swim-in-rising-water",
  "pacific-atlantic-water-flow",
  "graph-valid-tree",
  "number-of-connected-components-in-an-undirected-graph",
  "top-k-frequent-elements",
  "find-k-closest-elements",
  "kth-largest-element-in-a-stream",
  "task-scheduler",
  "hand-of-straights",
  "string-encode-and-decode",
  "longest-common-subsequence",
  "distinct-subsequences",
  "palindromic-substrings",
  "longest-palindromic-substring",
  "interleaving-string",
  "best-time-to-buy-and-sell-stock-with-cooldown",
  "burst-balloons",
  "regular-expression-matching",
  "wildcard-matching",
  "single-number-ii",
  "number-of-1-bits",
  "reverse-bits"
];

function fromSlugs(slugs: string[]): CuratedProblemInput[] {
  return uniqueStrings(slugs).map((slug) => ({
    slug,
    title: slugToTitle(slug)
  }));
}

function fromTopicPath(path: TopicPathSection[]): CuratedProblemInput[] {
  const bySlug = new Map<string, CuratedProblemInput>();

  for (const section of path) {
    for (const slug of section.slugs) {
      const existing = bySlug.get(slug);
      if (existing) {
        existing.tags = uniqueStrings([...(existing.tags ?? []), section.topic]);
        continue;
      }

      bySlug.set(slug, {
        slug,
        title: slugToTitle(slug),
        tags: [section.topic]
      });
    }
  }

  return Array.from(bySlug.values());
}

function buildCurriculumSteps(path: TopicPathSection[]): CurriculumStep[] {
  const seen = new Set<string>();
  const steps: CurriculumStep[] = [];

  for (const section of path) {
    for (const slug of section.slugs) {
      if (seen.has(slug)) {
        continue;
      }
      seen.add(slug);
      steps.push({
        topic: section.topic,
        slug,
        title: slugToTitle(slug),
        url: slugToUrl(slug)
      });
    }
  }

  return steps;
}

function hasStartedStep(state?: StudyState): boolean {
  if (!state) {
    return false;
  }

  return (
    state.reviewCount > 0 ||
    state.status === "LEARNING" ||
    state.status === "REVIEWING" ||
    state.status === "MASTERED" ||
    (state.attemptHistory?.length ?? 0) > 0
  );
}

const defaultCurriculumSteps = buildCurriculumSteps(blind75TopicPath);

export const CURATED_SETS: Record<string, CuratedProblemInput[]> = {
  Blind75: fromTopicPath(blind75TopicPath),
  LeetCode75: fromSlugs(leetcode75Slugs),
  Grind75: fromSlugs(grind75Slugs),
  NeetCode150: fromSlugs([...blind75Slugs, ...leetcode75Slugs, ...neetCodeExtra])
};

export function getCuratedSet(name: string): CuratedProblemInput[] {
  return CURATED_SETS[name] ?? [];
}

export function listCuratedSetNames(): string[] {
  return Object.keys(CURATED_SETS);
}

export function getDefaultCurriculumSteps(): CurriculumStep[] {
  return [...defaultCurriculumSteps];
}

export function getCurriculumRecommendations(
  data: AppData,
  maxItems = 3
): { topic: string | null; items: CurriculumStep[]; completed: boolean } {
  if (data.settings.setsEnabled.Blind75 === false) {
    return { topic: null, items: [], completed: false };
  }

  const limit = Math.max(1, Math.floor(maxItems));
  const firstPendingIndex = defaultCurriculumSteps.findIndex(
    (step) => !hasStartedStep(data.studyStatesBySlug[step.slug])
  );

  if (firstPendingIndex < 0) {
    return { topic: null, items: [], completed: true };
  }

  const topic = defaultCurriculumSteps[firstPendingIndex].topic;
  const items: CurriculumStep[] = [];

  for (let i = firstPendingIndex; i < defaultCurriculumSteps.length; i += 1) {
    const step = defaultCurriculumSteps[i];
    if (step.topic !== topic && items.length > 0) {
      break;
    }

    if (hasStartedStep(data.studyStatesBySlug[step.slug])) {
      continue;
    }

    items.push(step);
    if (items.length >= limit) {
      break;
    }
  }

  return { topic, items, completed: false };
}
