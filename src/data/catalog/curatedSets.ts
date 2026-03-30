import { getStudyStateSummary } from "./studyState";
import { AppData, CuratedProblemInput, Difficulty, StudyState } from "./types";
import { slugToTitle, slugToUrl, uniqueStrings } from "./utils";

interface TopicPathProblemInput {
  slug: string;
  displayTitle?: string;
  difficulty?: Difficulty;
  tags?: string[];
}

type TopicPathProblem = string | TopicPathProblemInput;

interface TopicPathSection {
  topic: string;
  slugs: TopicPathProblem[];
}

interface StudyPlanInput {
  id: string;
  name: string;
  description: string;
  sourceSet: string;
  sections: TopicPathSection[];
}

export interface StudyPlanSummary {
  id: string;
  name: string;
  description: string;
  sourceSet: string;
  topicCount: number;
  problemCount: number;
}

export interface CurriculumStep {
  planId: string;
  planName: string;
  sourceSet: string;
  topic: string;
  slug: string;
  title: string;
  url: string;
  difficulty?: Difficulty;
}

export interface ProblemCatalogEntry {
  slug: string;
  title: string;
  url: string;
  sourceSets: string[];
  topics: string[];
}

interface PlanRuntime {
  summary: StudyPlanSummary;
  steps: CurriculumStep[];
  problems: CuratedProblemInput[];
}

function courseProblem(
  slug: string,
  displayTitle: string,
  difficulty: Difficulty,
  tags?: string[]
): TopicPathProblemInput {
  return {
    slug,
    displayTitle,
    difficulty,
    tags,
  };
}

function normalizeTopicPathProblem(input: TopicPathProblem): Required<
  Pick<TopicPathProblemInput, "slug">
> & {
  displayTitle: string;
  title: string;
  difficulty?: Difficulty;
  tags: string[];
} {
  if (typeof input === "string") {
    const title = slugToTitle(input);
    return {
      slug: input,
      displayTitle: title,
      title,
      tags: [],
    };
  }

  const title = slugToTitle(input.slug);
  return {
    slug: input.slug,
    displayTitle: input.displayTitle?.trim() || title,
    title,
    difficulty: input.difficulty,
    tags: uniqueStrings(input.tags ?? []),
  };
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
      "container-with-most-water",
    ],
  },
  {
    topic: "Binary",
    slugs: [
      "sum-of-two-integers",
      "number-of-1-bits",
      "counting-bits",
      "missing-number",
      "reverse-bits",
    ],
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
      "jump-game",
    ],
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
      "number-of-connected-components-in-an-undirected-graph",
    ],
  },
  {
    topic: "Interval",
    slugs: [
      "insert-interval",
      "merge-intervals",
      "non-overlapping-intervals",
      "meeting-rooms",
      "meeting-rooms-ii",
    ],
  },
  {
    topic: "Linked List",
    slugs: [
      "reverse-linked-list",
      "linked-list-cycle",
      "merge-two-sorted-lists",
      "merge-k-sorted-lists",
      "remove-nth-node-from-end-of-list",
      "reorder-list",
    ],
  },
  {
    topic: "Matrix",
    slugs: [
      "set-matrix-zeroes",
      "spiral-matrix",
      "rotate-image",
      "word-search",
    ],
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
      "encode-and-decode-strings",
    ],
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
      "word-search-ii",
    ],
  },
  {
    topic: "Heap",
    slugs: [
      "merge-k-sorted-lists",
      "top-k-frequent-elements",
      "find-median-from-data-stream",
    ],
  },
];

const leetcode75TopicPath: TopicPathSection[] = [
  {
    topic: "Array / String",
    slugs: [
      "merge-strings-alternately",
      "greatest-common-divisor-of-strings",
      "kids-with-the-greatest-number-of-candies",
      "can-place-flowers",
      "reverse-vowels-of-a-string",
      "reverse-words-in-a-string",
      "product-of-array-except-self",
      "increasing-triplet-subsequence",
      "string-compression",
    ],
  },
  {
    topic: "Two Pointers",
    slugs: [
      "move-zeroes",
      "is-subsequence",
      "container-with-most-water",
      "max-number-of-k-sum-pairs",
    ],
  },
  {
    topic: "Sliding Window",
    slugs: [
      "maximum-average-subarray-i",
      "maximum-number-of-vowels-in-a-substring-of-given-length",
      "max-consecutive-ones-iii",
      "longest-subarray-of-1s-after-deleting-one-element",
    ],
  },
  {
    topic: "Prefix Sum",
    slugs: ["find-the-highest-altitude", "find-pivot-index"],
  },
  {
    topic: "Hash Map / Set",
    slugs: [
      "find-the-difference-of-two-arrays",
      "unique-number-of-occurrences",
      "determine-if-two-strings-are-close",
      "equal-row-and-column-pairs",
    ],
  },
  {
    topic: "Stack",
    slugs: [
      "removing-stars-from-a-string",
      "asteroid-collision",
      "decode-string",
    ],
  },
  {
    topic: "Queue",
    slugs: ["number-of-recent-calls", "dota2-senate"],
  },
  {
    topic: "Linked List",
    slugs: [
      "delete-the-middle-node-of-a-linked-list",
      "odd-even-linked-list",
      "reverse-linked-list",
      "maximum-twin-sum-of-a-linked-list",
    ],
  },
  {
    topic: "Binary Tree - DFS",
    slugs: [
      "maximum-depth-of-binary-tree",
      "leaf-similar-trees",
      "count-good-nodes-in-binary-tree",
      "path-sum-iii",
      "longest-zigzag-path-in-a-binary-tree",
      "lowest-common-ancestor-of-a-binary-tree",
    ],
  },
  {
    topic: "Binary Tree - BFS",
    slugs: [
      "binary-tree-right-side-view",
      "maximum-level-sum-of-a-binary-tree",
    ],
  },
  {
    topic: "Binary Search Tree",
    slugs: ["search-in-a-binary-search-tree", "delete-node-in-a-bst"],
  },
  {
    topic: "Graphs - DFS",
    slugs: [
      "keys-and-rooms",
      "number-of-provinces",
      "reorder-routes-to-make-all-paths-lead-to-the-city-zero",
      "evaluate-division",
    ],
  },
  {
    topic: "Graphs - BFS",
    slugs: ["nearest-exit-from-entrance-in-maze", "rotting-oranges"],
  },
  {
    topic: "Heap / Priority Queue",
    slugs: [
      "kth-largest-element-in-an-array",
      "smallest-number-in-infinite-set",
      "maximum-subsequence-score",
      "total-cost-to-hire-k-workers",
    ],
  },
  {
    topic: "Binary Search",
    slugs: [
      "guess-number-higher-or-lower",
      "successful-pairs-of-spells-and-potions",
      "find-peak-element",
      "koko-eating-bananas",
    ],
  },
  {
    topic: "Backtracking",
    slugs: ["letter-combinations-of-a-phone-number", "combination-sum-iii"],
  },
  {
    topic: "DP - 1D",
    slugs: [
      "n-th-tribonacci-number",
      "min-cost-climbing-stairs",
      "house-robber",
      "domino-and-tromino-tiling",
    ],
  },
  {
    topic: "DP - Multidimensional",
    slugs: [
      "unique-paths",
      "longest-common-subsequence",
      "best-time-to-buy-and-sell-stock-with-transaction-fee",
      "edit-distance",
    ],
  },
  {
    topic: "Bit Manipulation",
    slugs: [
      "counting-bits",
      "single-number",
      "minimum-flips-to-make-a-or-b-equal-to-c",
    ],
  },
  {
    topic: "Trie",
    slugs: ["implement-trie-prefix-tree", "search-suggestions-system"],
  },
  {
    topic: "Intervals",
    slugs: [
      "non-overlapping-intervals",
      "minimum-number-of-arrows-to-burst-balloons",
    ],
  },
  {
    topic: "Monotonic Stack",
    slugs: ["daily-temperatures", "online-stock-span"],
  },
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
  "minimum-window-substring",
];

const neetCode150TopicPath: TopicPathSection[] = [
  {
    topic: "Arrays & Hashing",
    slugs: [
      "contains-duplicate",
      "valid-anagram",
      "two-sum",
      "longest-consecutive-sequence",
      "group-anagrams",
      "top-k-frequent-elements",
      "encode-and-decode-strings",
      "product-of-array-except-self",
      "valid-sudoku",
    ],
  },
  {
    topic: "Sequence",
    slugs: [
      "valid-palindrome",
      "two-sum-ii-input-array-is-sorted",
      "3sum",
      "container-with-most-water",
      "trapping-rain-water",
    ],
  },
  {
    topic: "Sliding Window",
    slugs: [
      "best-time-to-buy-and-sell-stock",
      "longest-substring-without-repeating-characters",
      "longest-repeating-character-replacement",
      "permutation-in-string",
      "minimum-window-substring",
      "sliding-window-maximum",
    ],
  },
  {
    topic: "Stack",
    slugs: [
      "valid-parentheses",
      "min-stack",
      "evaluate-reverse-polish-notation",
      "daily-temperatures",
      "car-fleet",
      "largest-rectangle-in-histogram",
    ],
  },
  {
    topic: "Binary Search",
    slugs: [
      "binary-search",
      "search-a-2d-matrix",
      "koko-eating-bananas",
      "find-minimum-in-rotated-sorted-array",
      "search-in-rotated-sorted-array",
      "median-of-two-sorted-arrays",
    ],
  },
  {
    topic: "Linked List",
    slugs: [
      "reverse-linked-list",
      "merge-two-sorted-lists",
      "linked-list-cycle",
      "reorder-list",
      "remove-nth-node-from-end-of-list",
      "copy-list-with-random-pointer",
      "add-two-numbers",
      "find-the-duplicate-number",
      "lru-cache",
      "reverse-nodes-in-k-group",
      "merge-k-sorted-lists",
    ],
  },
  {
    topic: "Trees",
    slugs: [
      "invert-binary-tree",
      "maximum-depth-of-binary-tree",
      "diameter-of-binary-tree",
      "balanced-binary-tree",
      "same-tree",
      "subtree-of-another-tree",
      "binary-tree-level-order-traversal",
      "binary-tree-right-side-view",
      "count-good-nodes-in-binary-tree",
      "lowest-common-ancestor-of-a-binary-search-tree",
      "validate-binary-search-tree",
      "kth-smallest-element-in-a-bst",
      "construct-binary-tree-from-preorder-and-inorder-traversal",
      "serialize-and-deserialize-binary-tree",
      "maximum-path-sum",
    ],
  },
  {
    topic: "Heap / Priority Queue",
    slugs: [
      "kth-largest-element-in-a-stream",
      "last-stone-weight",
      "k-closest-points-to-origin",
      "kth-largest-element-in-an-array",
      "task-scheduler",
      "design-twitter",
      "find-median-from-data-stream",
    ],
  },
  {
    topic: "Backtracking",
    slugs: [
      "subsets",
      "combination-sum",
      "combination-sum-ii",
      "permutations",
      "subsets-ii",
      "generate-parentheses",
      "word-search",
      "palindrome-partitioning",
      "letter-combinations-of-a-phone-number",
      "n-queens",
    ],
  },
  {
    topic: "Tries",
    slugs: [
      "implement-trie-prefix-tree",
      "design-add-and-search-words-data-structure",
      "word-search-ii",
    ],
  },
  {
    topic: "Graphs",
    slugs: [
      "number-of-islands",
      "max-area-of-island",
      "clone-graph",
      "walls-and-gates",
      "rotting-oranges",
      "pacific-atlantic-water-flow",
      "surrounded-regions",
      "course-schedule",
      "course-schedule-ii",
      "graph-valid-tree",
      "number-of-connected-components-in-an-undirected-graph",
      "redundant-connection",
      "word-ladder",
      "alien-dictionary",
      "network-delay-time",
      "reconstruct-itinerary",
      "min-cost-to-connect-all-points",
      "swim-in-rising-water",
      "cheapest-flights-within-k-stops",
    ],
  },
  {
    topic: "1-D Dynamic Programming",
    slugs: [
      "climbing-stairs",
      "min-cost-climbing-stairs",
      "house-robber",
      "house-robber-ii",
      "longest-palindromic-substring",
      "palindromic-substrings",
      "decode-ways",
      "coin-change",
      "maximum-product-subarray",
      "word-break",
      "longest-increasing-subsequence",
    ],
  },
  {
    topic: "2-D Dynamic Programming",
    slugs: [
      "partition-equal-subset-sum",
      "unique-paths",
      "longest-common-subsequence",
      "best-time-to-buy-and-sell-stock-with-transaction-fee",
      "edit-distance",
      "coin-change-ii",
      "target-sum",
      "integer-break",
    ],
  },
  {
    topic: "Greedy",
    slugs: [
      "maximum-subarray",
      "jump-game",
      "jump-game-ii",
      "gas-station",
      "hand-of-straights",
      "merge-triplets-to-form-target",
      "partition-labels",
    ],
  },
  {
    topic: "Intervals",
    slugs: [
      "insert-interval",
      "merge-intervals",
      "non-overlapping-intervals",
      "meeting-rooms",
      "meeting-rooms-ii",
      "minimum-number-of-arrows-to-burst-balloons",
    ],
  },
  {
    topic: "Math & Geometry",
    slugs: [
      "rotate-image",
      "spiral-matrix",
      "set-matrix-zeroes",
      "happy-number",
      "plus-one",
      "powx-n",
      "multiply-strings",
      "detect-squares",
    ],
  },
  {
    topic: "Bit Manipulation",
    slugs: [
      "single-number",
      "number-of-1-bits",
      "counting-bits",
      "reverse-bits",
      "missing-number",
      "sum-of-two-integers",
      "reverse-integer",
    ],
  },
];

const neetCode250TopicPath: TopicPathSection[] = [
  {
    topic: "Arrays & Hashing",
    slugs: [
      "concatenation-of-array",
      "contains-duplicate",
      "valid-anagram",
      "two-sum",
      "longest-common-prefix",
      "group-anagrams",
      "remove-element",
      "majority-element",
      "design-hashset",
      "design-hashmap",
      "sort-an-array",
      "sort-colors",
      "top-k-frequent-elements",
      "encode-and-decode-strings",
      "range-sum-query-2d-immutable",
      "product-of-array-except-self",
      "valid-sudoku",
      "longest-consecutive-sequence",
    ],
  },
  {
    topic: "Two Pointers",
    slugs: [
      "reverse-string",
      "valid-palindrome",
      "valid-palindrome-ii",
      "merge-strings-alternately",
      "merge-sorted-array",
      "remove-duplicates-from-sorted-array",
      "two-sum-ii-input-array-is-sorted",
      "3sum",
      "4sum",
      "rotate-array",
      "container-with-most-water",
      "boats-to-save-people",
      "trapping-rain-water",
    ],
  },
  {
    topic: "Sliding Window",
    slugs: [
      "contains-duplicate-ii",
      "best-time-to-buy-and-sell-stock",
      "longest-substring-without-repeating-characters",
      "longest-repeating-character-replacement",
      "permutation-in-string",
      "minimum-size-subarray-sum",
      "find-k-closest-elements",
      "minimum-window-substring",
      "sliding-window-maximum",
    ],
  },
  {
    topic: "Stack",
    slugs: [
      "baseball-game",
      "valid-parentheses",
      "implement-stack-using-queues",
      "implement-queue-using-stacks",
      "min-stack",
      "evaluate-reverse-polish-notation",
      "asteroid-collision",
      "daily-temperatures",
      "online-stock-span",
      "car-fleet",
      "simplify-path",
      "decode-string",
      "maximum-frequency-stack",
    ],
  },
  {
    topic: "Binary Search",
    slugs: [
      "binary-search",
      "search-insert-position",
      "guess-number-higher-or-lower",
      "sqrtx",
      "search-a-2d-matrix",
      "koko-eating-bananas",
      "capacity-to-ship-packages-within-d-days",
      "find-minimum-in-rotated-sorted-array",
      "search-in-rotated-sorted-array",
      "search-in-rotated-sorted-array-ii",
      "time-based-key-value-store",
      "split-array-largest-sum",
      "find-in-mountain-array",
      "median-of-two-sorted-arrays",
    ],
  },
  {
    topic: "Linked List",
    slugs: [
      "reverse-linked-list",
      "merge-two-sorted-lists",
      "linked-list-cycle",
      "reorder-list",
      "remove-nth-node-from-end-of-list",
      "copy-list-with-random-pointer",
      "add-two-numbers",
      "reverse-linked-list-ii",
      "design-circular-queue",
      "lru-cache",
      "lfu-cache",
      "merge-k-sorted-lists",
      "reverse-nodes-in-k-group",
      "palindrome-linked-list",
    ],
  },
  {
    topic: "Trees",
    slugs: [
      "binary-tree-inorder-traversal",
      "binary-tree-preorder-traversal",
      "binary-tree-postorder-traversal",
      "invert-binary-tree",
      "maximum-depth-of-binary-tree",
      "diameter-of-binary-tree",
      "balanced-binary-tree",
      "same-tree",
      "subtree-of-another-tree",
      "lowest-common-ancestor-of-a-binary-search-tree",
      "binary-tree-level-order-traversal",
      "binary-tree-right-side-view",
      "count-good-nodes-in-binary-tree",
      "validate-binary-search-tree",
      "kth-smallest-element-in-a-bst",
      "construct-binary-tree-from-preorder-and-inorder-traversal",
      "serialize-and-deserialize-binary-tree",
      "delete-node-in-a-bst",
      "insert-into-a-binary-search-tree",
      "construct-quad-tree",
    ],
  },
  {
    topic: "Heap / Priority Queue",
    slugs: [
      "kth-largest-element-in-a-stream",
      "last-stone-weight",
      "k-closest-points-to-origin",
      "kth-largest-element-in-an-array",
      "task-scheduler",
      "design-twitter",
      "single-threaded-cpu",
      "reorganize-string",
      "longest-happy-string",
      "car-pooling",
      "find-median-from-data-stream",
      "ipo",
    ],
  },
  {
    topic: "Backtracking",
    slugs: [
      "sum-of-all-subsets-xor-total",
      "subsets",
      "combination-sum",
      "combination-sum-ii",
      "combinations",
      "permutations",
      "subsets-ii",
      "permutations-ii",
      "generate-parentheses",
      "word-search",
      "palindrome-partitioning",
      "letter-combinations-of-a-phone-number",
      "matchsticks-to-square",
      "partition-to-k-equal-sum-subsets",
      "n-queens",
      "n-queens-ii",
      "word-break-ii",
    ],
  },
  {
    topic: "Tries",
    slugs: [
      "implement-trie-prefix-tree",
      "design-add-and-search-words-data-structure",
      "word-search-ii",
      "extra-characters-in-a-string",
    ],
  },
  {
    topic: "Graphs",
    slugs: [
      "island-perimeter",
      "verifying-an-alien-dictionary",
      "find-the-town-judge",
      "number-of-islands",
      "max-area-of-island",
      "clone-graph",
      "walls-and-gates",
      "rotting-oranges",
      "pacific-atlantic-water-flow",
      "surrounded-regions",
      "open-the-lock",
      "course-schedule",
      "course-schedule-ii",
      "graph-valid-tree",
      "course-schedule-iv",
      "number-of-connected-components-in-an-undirected-graph",
      "redundant-connection",
      "accounts-merge",
      "evaluate-division",
      "minimum-height-trees",
      "word-ladder",
      "network-delay-time",
      "reconstruct-itinerary",
      "min-cost-to-connect-all-points",
      "swim-in-rising-water",
      "alien-dictionary",
      "cheapest-flights-within-k-stops",
      "find-critical-and-pseudo-critical-edges",
      "build-a-matrix-with-conditions",
    ],
  },
  {
    topic: "Advanced Graphs",
    slugs: [
      "path-with-minimum-effort",
      "network-delay-time",
      "reconstruct-itinerary",
      "min-cost-to-connect-all-points",
      "swim-in-rising-water",
      "alien-dictionary",
      "cheapest-flights-within-k-stops",
      "find-critical-and-pseudo-critical-edges",
      "build-a-matrix-with-conditions",
      "greatest-common-divisor-traversal",
    ],
  },
  {
    topic: "1-D Dynamic Programming",
    slugs: [
      "climbing-stairs",
      "min-cost-climbing-stairs",
      "n-th-tribonacci-number",
      "house-robber",
      "house-robber-ii",
      "longest-palindromic-substring",
      "palindromic-substrings",
      "decode-ways",
      "coin-change",
      "maximum-product-subarray",
      "word-break",
      "longest-increasing-subsequence",
      "maximum-subarray",
      "jump-game",
      "jump-game-ii",
      "gas-station",
      "hand-of-straights",
    ],
  },
  {
    topic: "2-D Dynamic Programming",
    slugs: [
      "unique-paths",
      "unique-paths-ii",
      "minimum-path-sum",
      "longest-common-subsequence",
      "last-stone-weight-ii",
      "best-time-to-buy-and-sell-stock-with-cooldown",
      "coin-change-ii",
      "target-sum",
      "interleaving-string",
      "stone-game",
      "stone-game-ii",
      "longest-increasing-path-in-a-matrix",
      "distinct-subsequences",
      "edit-distance",
      "burst-balloons",
      "regular-expression-matching",
    ],
  },
  {
    topic: "Greedy",
    slugs: [
      "lemonade-change",
      "maximum-subarray",
      "maximum-sum-circular-subarray",
      "longest-turbulent-subarray",
      "jump-game-ii",
      "jump-game-vii",
      "gas-station",
      "hand-of-straights",
      "dota2-senate",
    ],
  },
  {
    topic: "Intervals",
    slugs: [
      "insert-interval",
      "merge-intervals",
      "non-overlapping-intervals",
      "meeting-rooms",
      "meeting-rooms-ii",
      "meeting-rooms-iii",
      "minimum-number-of-arrows-to-burst-balloons",
    ],
  },
  {
    topic: "Math & Geometry",
    slugs: [
      "excel-sheet-column-title",
      "greatest-common-divisor-of-strings",
      "insert-greatest-common-divisors-in-linked-list",
      "transpose-matrix",
      "rotate-image",
      "spiral-matrix",
      "set-matrix-zeroes",
      "happy-number",
      "plus-one",
      "roman-to-integer",
      "powx-n",
      "multiply-strings",
      "detect-squares",
    ],
  },
  {
    topic: "Bit Manipulation",
    slugs: [
      "single-number",
      "number-of-1-bits",
      "counting-bits",
      "add-binary",
      "reverse-bits",
      "missing-number",
      "sum-of-two-integers",
      "reverse-integer",
      "bitwise-and-of-numbers-range",
    ],
  },
];

const byteByteGo101TopicPath: TopicPathSection[] = [
  {
    topic: "Two Pointers",
    slugs: [
      courseProblem(
        "two-sum-ii-input-array-is-sorted",
        "Pair Sum - Sorted",
        "Easy"
      ),
      courseProblem("3sum", "Triplet Sum", "Medium"),
      courseProblem("valid-palindrome", "Is Palindrome Valid", "Easy"),
      courseProblem("container-with-most-water", "Largest Container", "Medium"),
      courseProblem("move-zeroes", "Shift Zeros to the End", "Easy"),
      courseProblem(
        "next-permutation",
        "Next Lexicographical Sequence",
        "Medium"
      ),
    ],
  },
  {
    topic: "Hash Maps And Sets",
    slugs: [
      courseProblem("two-sum", "Pair Sum - Unsorted", "Easy"),
      courseProblem("valid-sudoku", "Verify Sudoku Board", "Medium"),
      courseProblem("set-matrix-zeroes", "Zero Striping", "Medium"),
      courseProblem(
        "longest-consecutive-sequence",
        "Longest Chain of Consecutive Numbers",
        "Medium"
      ),
      courseProblem(
        "tuple-with-same-product",
        "Geometric Sequence Triplets",
        "Medium"
      ),
    ],
  },
  {
    topic: "Linked Lists",
    slugs: [
      courseProblem("reverse-linked-list", "Linked List Reversal", "Easy"),
      courseProblem(
        "remove-nth-node-from-end-of-list",
        "Remove the Kth Last Node From a Linked List",
        "Medium"
      ),
      courseProblem(
        "intersection-of-two-linked-lists",
        "Linked List Intersection",
        "Easy"
      ),
      courseProblem("lru-cache", "LRU Cache", "Hard"),
      courseProblem(
        "palindrome-linked-list",
        "Palindromic Linked List",
        "Easy"
      ),
      courseProblem(
        "flatten-a-multilevel-doubly-linked-list",
        "Flatten a Multi-Level Linked List",
        "Medium"
      ),
    ],
  },
  {
    topic: "Fast And Slow Pointers",
    slugs: [
      courseProblem("linked-list-cycle", "Linked List Loop", "Easy"),
      courseProblem(
        "middle-of-the-linked-list",
        "Linked List Midpoint",
        "Easy"
      ),
      courseProblem("happy-number", "Happy Number", "Medium"),
    ],
  },
  {
    topic: "Sliding Window",
    slugs: [
      courseProblem(
        "find-all-anagrams-in-a-string",
        "Substring Anagrams",
        "Medium"
      ),
      courseProblem(
        "longest-substring-without-repeating-characters",
        "Longest Substring With Unique Characters",
        "Medium"
      ),
      courseProblem(
        "longest-repeating-character-replacement",
        "Longest Uniform Substring After Replacements",
        "Hard"
      ),
    ],
  },
  {
    topic: "Binary Search",
    slugs: [
      courseProblem(
        "search-insert-position",
        "Find the Insertion Index",
        "Easy"
      ),
      courseProblem(
        "find-first-and-last-position-of-element-in-sorted-array",
        "First and Last Occurrences of a Number",
        "Medium"
      ),
      courseProblem("cutting-ribbons", "Cutting Wood", "Medium"),
      courseProblem(
        "search-in-rotated-sorted-array",
        "Find the Target in a Rotated Sorted Array",
        "Medium"
      ),
      courseProblem(
        "median-of-two-sorted-arrays",
        "Find the Median From Two Sorted Arrays",
        "Hard"
      ),
      courseProblem("search-a-2d-matrix", "Matrix Search", "Medium"),
      courseProblem("find-peak-element", "Local Maxima in Array", "Medium"),
      courseProblem(
        "random-pick-with-weight",
        "Weighted Random Selection",
        "Medium"
      ),
    ],
  },
  {
    topic: "Stacks",
    slugs: [
      courseProblem(
        "valid-parentheses",
        "Valid Parenthesis Expression",
        "Easy"
      ),
      courseProblem(
        "next-greater-element-i",
        "Next Largest Number to the Right",
        "Medium"
      ),
      courseProblem(
        "evaluate-reverse-polish-notation",
        "Evaluate Expression",
        "Hard"
      ),
      courseProblem(
        "remove-all-adjacent-duplicates-in-string",
        "Repeated Removal of Adjacent Duplicates",
        "Easy"
      ),
      courseProblem(
        "implement-queue-using-stacks",
        "Implement a Queue using Stacks",
        "Medium"
      ),
      courseProblem(
        "sliding-window-maximum",
        "Maximums of Sliding Window",
        "Hard"
      ),
    ],
  },
  {
    topic: "Heaps",
    slugs: [
      courseProblem(
        "top-k-frequent-words",
        "K Most Frequent Strings",
        "Medium"
      ),
      courseProblem(
        "merge-k-sorted-lists",
        "Combine Sorted Linked Lists",
        "Medium"
      ),
      courseProblem(
        "find-median-from-data-stream",
        "Median of an Integer Stream",
        "Hard"
      ),
      courseProblem(
        "sort-characters-by-frequency",
        "Sort a K-Sorted Array",
        "Medium"
      ),
    ],
  },
  {
    topic: "Intervals",
    slugs: [
      courseProblem("merge-intervals", "Merge Overlapping Intervals", "Medium"),
      courseProblem(
        "interval-list-intersections",
        "Identify All Interval Overlaps",
        "Medium"
      ),
      courseProblem(
        "meeting-rooms-ii",
        "Largest Overlap of Intervals",
        "Medium"
      ),
    ],
  },
  {
    topic: "Prefix Sums",
    slugs: [
      courseProblem("range-sum-query-immutable", "Sum Between Range", "Easy"),
      courseProblem("subarray-sum-equals-k", "K-Sum Subarrays", "Medium"),
      courseProblem(
        "product-of-array-except-self",
        "Product Array Without Current Element",
        "Medium"
      ),
    ],
  },
  {
    topic: "Trees",
    slugs: [
      courseProblem("invert-binary-tree", "Invert Binary Tree", "Easy"),
      courseProblem(
        "balanced-binary-tree",
        "Balanced Binary Tree Validation",
        "Easy"
      ),
      courseProblem(
        "binary-tree-right-side-view",
        "Rightmost Nodes of a Binary Tree",
        "Medium"
      ),
      courseProblem(
        "maximum-width-of-binary-tree",
        "Widest Binary Tree Level",
        "Medium"
      ),
      courseProblem(
        "validate-binary-search-tree",
        "Binary Search Tree Validation",
        "Medium"
      ),
      courseProblem(
        "lowest-common-ancestor-of-a-binary-tree",
        "Lowest Common Ancestor",
        "Medium"
      ),
      courseProblem(
        "construct-binary-tree-from-preorder-and-inorder-traversal",
        "Build Binary Tree From Preorder and Inorder Traversals",
        "Medium"
      ),
      courseProblem(
        "binary-tree-maximum-path-sum",
        "Maximum Sum of a Continuous Path in a Binary Tree",
        "Hard"
      ),
      courseProblem("symmetric-tree", "Binary Tree Symmetry", "Medium"),
      courseProblem(
        "binary-tree-vertical-order-traversal",
        "Binary Tree Columns",
        "Medium"
      ),
      courseProblem(
        "kth-smallest-element-in-a-bst",
        "Kth Smallest Number in a Binary Search Tree",
        "Medium"
      ),
      courseProblem(
        "serialize-and-deserialize-binary-tree",
        "Serialize and Deserialize a Binary Tree",
        "Medium"
      ),
    ],
  },
  {
    topic: "Tries",
    slugs: [
      courseProblem("implement-trie-prefix-tree", "Design a Trie", "Medium"),
      courseProblem(
        "design-add-and-search-words-data-structure",
        "Insert and Search Words with Wildcards",
        "Medium"
      ),
      courseProblem("word-search-ii", "Find All Words on a Board", "Hard"),
    ],
  },
  {
    topic: "Graphs",
    slugs: [
      courseProblem("clone-graph", "Graph Deep Copy", "Medium"),
      courseProblem("number-of-islands", "Count Islands", "Medium"),
      courseProblem("rotting-oranges", "Matrix Infection", "Medium"),
      courseProblem(
        "is-graph-bipartite",
        "Bipartite Graph Validation",
        "Medium"
      ),
      courseProblem(
        "longest-increasing-path-in-a-matrix",
        "Longest Increasing Path",
        "Medium"
      ),
      courseProblem("word-ladder", "Shortest Transformation Sequence", "Hard"),
      courseProblem("accounts-merge", "Merging Communities", "Hard"),
      courseProblem("course-schedule", "Prerequisites", "Medium"),
      courseProblem("network-delay-time", "Shortest Path", "Hard"),
      courseProblem(
        "number-of-connected-components-in-an-undirected-graph",
        "Connect the Dots",
        "Medium"
      ),
    ],
  },
  {
    topic: "Backtracking",
    slugs: [
      courseProblem("permutations", "Find All Permutations", "Medium"),
      courseProblem("subsets", "Find All Subsets", "Medium"),
      courseProblem("n-queens", "N Queens", "Hard"),
      courseProblem("combination-sum", "Combinations of a Sum", "Medium"),
      courseProblem(
        "letter-combinations-of-a-phone-number",
        "Phone Keypad Combinations",
        "Medium"
      ),
    ],
  },
  {
    topic: "Dynamic Programming",
    slugs: [
      courseProblem("climbing-stairs", "Climbing Stairs", "Easy"),
      courseProblem("coin-change", "Minimum Coin Combination", "Medium"),
      courseProblem("unique-paths", "Matrix Pathways", "Medium"),
      courseProblem("house-robber", "Neighborhood Burglary", "Medium"),
      courseProblem(
        "longest-common-subsequence",
        "Longest Common Subsequence",
        "Hard"
      ),
      courseProblem(
        "longest-palindromic-substring",
        "Longest Palindrome in a String",
        "Medium"
      ),
      courseProblem("maximum-subarray", "Maximum Subarray Sum", "Medium"),
      courseProblem("ones-and-zeroes", "0/1 Knapsack", "Hard"),
      courseProblem("maximal-square", "Largest Square in a Matrix", "Medium"),
    ],
  },
  {
    topic: "Greedy",
    slugs: [
      courseProblem("jump-game", "Jump to the End", "Medium"),
      courseProblem("gas-station", "Gas Stations", "Hard"),
      courseProblem("candy", "Candies", "Medium"),
    ],
  },
  {
    topic: "Sort And Search",
    slugs: [
      courseProblem("sort-list", "Sort Linked List", "Medium"),
      courseProblem("sort-an-array", "Sort Array", "Medium"),
      courseProblem(
        "kth-largest-element-in-an-array",
        "Kth Largest Integer",
        "Medium"
      ),
      courseProblem("sort-colors", "Dutch National Flag", "Medium"),
    ],
  },
  {
    topic: "Bit Manipulation",
    slugs: [
      courseProblem("number-of-1-bits", "Hamming Weights of Integers", "Easy"),
      courseProblem("single-number", "Lonely Integer", "Easy"),
      courseProblem("reverse-bits", "Swap Odd and Even Bits", "Medium"),
    ],
  },
  {
    topic: "Math And Geometry",
    slugs: [
      courseProblem("spiral-matrix", "Spiral Traversal", "Medium"),
      courseProblem("reverse-integer", "Reverse 32-Bit Integer", "Medium"),
      courseProblem("max-points-on-a-line", "Maximum Collinear Points", "Hard"),
      courseProblem(
        "find-the-winner-of-the-circular-game",
        "The Josephus Problem",
        "Medium"
      ),
      courseProblem("valid-triangle-number", "Triangle Numbers", "Medium"),
    ],
  },
];

function mergeCuratedLists(
  ...lists: CuratedProblemInput[][]
): CuratedProblemInput[] {
  const bySlug = new Map<string, CuratedProblemInput>();

  for (const list of lists) {
    for (const item of list) {
      const existing = bySlug.get(item.slug);
      if (existing) {
        existing.tags = uniqueStrings([
          ...(existing.tags ?? []),
          ...(item.tags ?? []),
        ]);
        continue;
      }

      bySlug.set(item.slug, {
        slug: item.slug,
        title: item.title ?? slugToTitle(item.slug),
        difficulty: item.difficulty,
        tags: uniqueStrings(item.tags ?? []),
      });
    }
  }

  return Array.from(bySlug.values());
}

function buildPlanRuntime(plan: StudyPlanInput): PlanRuntime {
  const bySlug = new Map<string, CuratedProblemInput>();
  const seenSteps = new Set<string>();
  const steps: CurriculumStep[] = [];

  for (const section of plan.sections) {
    for (const rawItem of section.slugs) {
      const item = normalizeTopicPathProblem(rawItem);
      const existing = bySlug.get(item.slug);
      if (existing) {
        existing.tags = uniqueStrings([
          ...(existing.tags ?? []),
          section.topic,
          ...item.tags,
        ]);
        existing.difficulty = existing.difficulty ?? item.difficulty;
      } else {
        bySlug.set(item.slug, {
          slug: item.slug,
          title: item.title,
          difficulty: item.difficulty,
          tags: uniqueStrings([section.topic, ...item.tags]),
        });
      }

      if (seenSteps.has(item.slug)) {
        continue;
      }

      seenSteps.add(item.slug);
      steps.push({
        planId: plan.id,
        planName: plan.name,
        sourceSet: plan.sourceSet,
        topic: section.topic,
        slug: item.slug,
        title: item.displayTitle,
        url: slugToUrl(item.slug),
        difficulty: item.difficulty,
      });
    }
  }

  const problems = Array.from(bySlug.values());

  return {
    summary: {
      id: plan.id,
      name: plan.name,
      description: plan.description,
      sourceSet: plan.sourceSet,
      topicCount: plan.sections.length,
      problemCount: problems.length,
    },
    steps,
    problems,
  };
}

const STUDY_PLAN_INPUTS: StudyPlanInput[] = [
  {
    id: "Blind75",
    name: "Blind 75",
    description: "Core interview patterns, topic by topic.",
    sourceSet: "Blind75",
    sections: blind75TopicPath,
  },
  {
    id: "ByteByteGo101",
    name: "ByteByteGo Coding Patterns 101",
    description:
      "ByteByteGo's coding patterns path, organized by interview pattern.",
    sourceSet: "ByteByteGo101",
    sections: byteByteGo101TopicPath,
  },
  {
    id: "LeetCode75",
    name: "LeetCode 75",
    description: "LeetCode 75 path grouped by official topics.",
    sourceSet: "LeetCode75",
    sections: leetcode75TopicPath,
  },
  {
    id: "Grind75",
    name: "Grind 75",
    description: "Grind 75 sequence for timed interview prep.",
    sourceSet: "Grind75",
    sections: [{ topic: "Grind 75 Path", slugs: grind75Slugs }],
  },
  {
    id: "NeetCode150",
    name: "NeetCode 150",
    description: "NeetCode 150 curated problems.",
    sourceSet: "NeetCode150",
    sections: neetCode150TopicPath,
  },
  {
    id: "NeetCode250",
    name: "NeetCode 250",
    description: "Complete beginner study plan from NeetCode.",
    sourceSet: "NeetCode250",
    sections: neetCode250TopicPath,
  },
];

const PLAN_RUNTIME = new Map<string, PlanRuntime>(
  STUDY_PLAN_INPUTS.map((plan) => {
    const runtime = buildPlanRuntime(plan);
    return [runtime.summary.id, runtime];
  })
);

const DEFAULT_PLAN_ID = STUDY_PLAN_INPUTS[0]?.id ?? "Blind75";

const curatedBySet = new Map<string, CuratedProblemInput[]>();
for (const runtime of PLAN_RUNTIME.values()) {
  const existing = curatedBySet.get(runtime.summary.sourceSet) ?? [];
  curatedBySet.set(
    runtime.summary.sourceSet,
    mergeCuratedLists(existing, runtime.problems)
  );
}

export const CURATED_SETS: Record<string, CuratedProblemInput[]> =
  Object.fromEntries(curatedBySet.entries());

const problemCatalog = new Map<string, ProblemCatalogEntry>();
for (const runtime of PLAN_RUNTIME.values()) {
  for (const problem of runtime.problems) {
    const existing = problemCatalog.get(problem.slug);
    if (!existing) {
      problemCatalog.set(problem.slug, {
        slug: problem.slug,
        title: problem.title ?? slugToTitle(problem.slug),
        url: slugToUrl(problem.slug),
        sourceSets: [runtime.summary.sourceSet],
        topics: uniqueStrings(problem.tags ?? []),
      });
      continue;
    }

    existing.sourceSets = uniqueStrings([
      ...existing.sourceSets,
      runtime.summary.sourceSet,
    ]);
    existing.topics = uniqueStrings([
      ...existing.topics,
      ...(problem.tags ?? []),
    ]);
  }
}

function hasStartedStep(state?: StudyState): boolean {
  return getStudyStateSummary(state).isStarted;
}

function resolvePlan(planId?: string): PlanRuntime {
  const byId = planId ? PLAN_RUNTIME.get(planId) : undefined;
  if (byId) {
    return byId;
  }

  const fallback = PLAN_RUNTIME.get(DEFAULT_PLAN_ID);
  if (!fallback) {
    throw new Error("No study plans configured.");
  }
  return fallback;
}

export function getCuratedSet(name: string): CuratedProblemInput[] {
  return CURATED_SETS[name] ?? [];
}

export function listCuratedSetNames(): string[] {
  return Array.from(curatedBySet.keys());
}

export function listStudyPlans(): StudyPlanSummary[] {
  return STUDY_PLAN_INPUTS.map((plan) => resolvePlan(plan.id).summary);
}

export function getProblemCatalog(): ProblemCatalogEntry[] {
  return Array.from(problemCatalog.values()).sort((a, b) =>
    a.title.localeCompare(b.title)
  );
}

export function getDefaultCurriculumSteps(planId?: string): CurriculumStep[] {
  return [...resolvePlan(planId).steps];
}

export function getCurriculumRecommendations(
  data: AppData,
  planId?: string,
  maxItems = 1
): {
  planId: string;
  planName: string;
  sourceSet: string;
  topic: string | null;
  items: CurriculumStep[];
  completed: boolean;
} {
  const runtime = resolvePlan(planId);
  const { summary, steps } = runtime;

  if (data.settings.setsEnabled[summary.sourceSet] === false) {
    return {
      planId: summary.id,
      planName: summary.name,
      sourceSet: summary.sourceSet,
      topic: null,
      items: [],
      completed: false,
    };
  }

  const limit = Math.max(1, Math.floor(maxItems));
  const firstPendingIndex = steps.findIndex(
    (step) => !hasStartedStep(data.studyStatesBySlug[step.slug])
  );

  if (firstPendingIndex < 0) {
    return {
      planId: summary.id,
      planName: summary.name,
      sourceSet: summary.sourceSet,
      topic: null,
      items: [],
      completed: true,
    };
  }

  const topic = steps[firstPendingIndex].topic;
  const items: CurriculumStep[] = [];

  for (let i = firstPendingIndex; i < steps.length; i += 1) {
    const step = steps[i];
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

  return {
    planId: summary.id,
    planName: summary.name,
    sourceSet: summary.sourceSet,
    topic,
    items,
    completed: false,
  };
}
