"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// tests/logic.test.ts
var import_strict = __toESM(require("node:assert/strict"));

// src/shared/types.ts
var STORAGE_SCHEMA_VERSION = 2;

// src/shared/constants.ts
var CURRENT_STORAGE_SCHEMA_VERSION = STORAGE_SCHEMA_VERSION;
var DEFAULT_COURSE_ID = "Blind75";
var BUILT_IN_SETS = ["Blind75", "ByteByteGo101", "NeetCode150", "NeetCode250", "Grind75", "LeetCode75"];
var DEFAULT_SETTINGS = {
  dailyNewLimit: 3,
  dailyReviewLimit: 15,
  reviewOrder: "dueFirst",
  studyMode: "studyPlan",
  activeCourseId: DEFAULT_COURSE_ID,
  setsEnabled: {
    Blind75: true,
    ByteByteGo101: true,
    NeetCode150: true,
    NeetCode250: true,
    Grind75: true,
    LeetCode75: true,
    LeetCode150: true,
    Custom: true
  },
  scheduleIntensity: "normal",
  requireSolveTime: false,
  autoDetectSolved: true,
  notifications: false,
  quietHours: {
    startHour: 22,
    endHour: 8
  },
  slowSolveDowngradeEnabled: false,
  slowSolveThresholdMs: 40 * 60 * 1e3
};
function createDefaultStudyState() {
  return {
    status: "NEW",
    reviewCount: 0,
    lapses: 0,
    ease: 2.5,
    intervalDays: 0,
    tags: [],
    attemptHistory: []
  };
}

// src/shared/utils.ts
function slugToTitle(slug) {
  return slug.split("-").filter(Boolean).map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}
function slugToUrl(slug) {
  return `https://leetcode.com/problems/${slug}/`;
}
function nowIso() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
function uniqueStrings(values) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

// src/shared/curatedSets.ts
function courseProblem(slug, displayTitle, difficulty, tags) {
  return {
    slug,
    displayTitle,
    difficulty,
    tags
  };
}
function normalizeTopicPathProblem(input) {
  if (typeof input === "string") {
    const title2 = slugToTitle(input);
    return {
      slug: input,
      displayTitle: title2,
      title: title2,
      tags: []
    };
  }
  const title = slugToTitle(input.slug);
  return {
    slug: input.slug,
    displayTitle: input.displayTitle?.trim() || title,
    title,
    difficulty: input.difficulty,
    tags: uniqueStrings(input.tags ?? [])
  };
}
var blind75TopicPath = [
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
var leetcode75TopicPath = [
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
      "string-compression"
    ]
  },
  {
    topic: "Two Pointers",
    slugs: [
      "move-zeroes",
      "is-subsequence",
      "container-with-most-water",
      "max-number-of-k-sum-pairs"
    ]
  },
  {
    topic: "Sliding Window",
    slugs: [
      "maximum-average-subarray-i",
      "maximum-number-of-vowels-in-a-substring-of-given-length",
      "max-consecutive-ones-iii",
      "longest-subarray-of-1s-after-deleting-one-element"
    ]
  },
  {
    topic: "Prefix Sum",
    slugs: [
      "find-the-highest-altitude",
      "find-pivot-index"
    ]
  },
  {
    topic: "Hash Map / Set",
    slugs: [
      "find-the-difference-of-two-arrays",
      "unique-number-of-occurrences",
      "determine-if-two-strings-are-close",
      "equal-row-and-column-pairs"
    ]
  },
  {
    topic: "Stack",
    slugs: [
      "removing-stars-from-a-string",
      "asteroid-collision",
      "decode-string"
    ]
  },
  {
    topic: "Queue",
    slugs: [
      "number-of-recent-calls",
      "dota2-senate"
    ]
  },
  {
    topic: "Linked List",
    slugs: [
      "delete-the-middle-node-of-a-linked-list",
      "odd-even-linked-list",
      "reverse-linked-list",
      "maximum-twin-sum-of-a-linked-list"
    ]
  },
  {
    topic: "Binary Tree - DFS",
    slugs: [
      "maximum-depth-of-binary-tree",
      "leaf-similar-trees",
      "count-good-nodes-in-binary-tree",
      "path-sum-iii",
      "longest-zigzag-path-in-a-binary-tree",
      "lowest-common-ancestor-of-a-binary-tree"
    ]
  },
  {
    topic: "Binary Tree - BFS",
    slugs: [
      "binary-tree-right-side-view",
      "maximum-level-sum-of-a-binary-tree"
    ]
  },
  {
    topic: "Binary Search Tree",
    slugs: [
      "search-in-a-binary-search-tree",
      "delete-node-in-a-bst"
    ]
  },
  {
    topic: "Graphs - DFS",
    slugs: [
      "keys-and-rooms",
      "number-of-provinces",
      "reorder-routes-to-make-all-paths-lead-to-the-city-zero",
      "evaluate-division"
    ]
  },
  {
    topic: "Graphs - BFS",
    slugs: [
      "nearest-exit-from-entrance-in-maze",
      "rotting-oranges"
    ]
  },
  {
    topic: "Heap / Priority Queue",
    slugs: [
      "kth-largest-element-in-an-array",
      "smallest-number-in-infinite-set",
      "maximum-subsequence-score",
      "total-cost-to-hire-k-workers"
    ]
  },
  {
    topic: "Binary Search",
    slugs: [
      "guess-number-higher-or-lower",
      "successful-pairs-of-spells-and-potions",
      "find-peak-element",
      "koko-eating-bananas"
    ]
  },
  {
    topic: "Backtracking",
    slugs: [
      "letter-combinations-of-a-phone-number",
      "combination-sum-iii"
    ]
  },
  {
    topic: "DP - 1D",
    slugs: [
      "n-th-tribonacci-number",
      "min-cost-climbing-stairs",
      "house-robber",
      "domino-and-tromino-tiling"
    ]
  },
  {
    topic: "DP - Multidimensional",
    slugs: [
      "unique-paths",
      "longest-common-subsequence",
      "best-time-to-buy-and-sell-stock-with-transaction-fee",
      "edit-distance"
    ]
  },
  {
    topic: "Bit Manipulation",
    slugs: [
      "counting-bits",
      "single-number",
      "minimum-flips-to-make-a-or-b-equal-to-c"
    ]
  },
  {
    topic: "Trie",
    slugs: [
      "implement-trie-prefix-tree",
      "search-suggestions-system"
    ]
  },
  {
    topic: "Intervals",
    slugs: [
      "non-overlapping-intervals",
      "minimum-number-of-arrows-to-burst-balloons"
    ]
  },
  {
    topic: "Monotonic Stack",
    slugs: [
      "daily-temperatures",
      "online-stock-span"
    ]
  }
];
var grind75Slugs = [
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
var neetCode150TopicPath = [
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
      "valid-sudoku"
    ]
  },
  {
    topic: "Sequence",
    slugs: [
      "valid-palindrome",
      "two-sum-ii-input-array-is-sorted",
      "3sum",
      "container-with-most-water",
      "trapping-rain-water"
    ]
  },
  {
    topic: "Sliding Window",
    slugs: [
      "best-time-to-buy-and-sell-stock",
      "longest-substring-without-repeating-characters",
      "longest-repeating-character-replacement",
      "permutation-in-string",
      "minimum-window-substring",
      "sliding-window-maximum"
    ]
  },
  {
    topic: "Stack",
    slugs: [
      "valid-parentheses",
      "min-stack",
      "evaluate-reverse-polish-notation",
      "daily-temperatures",
      "car-fleet",
      "largest-rectangle-in-histogram"
    ]
  },
  {
    topic: "Binary Search",
    slugs: [
      "binary-search",
      "search-a-2d-matrix",
      "koko-eating-bananas",
      "find-minimum-in-rotated-sorted-array",
      "search-in-rotated-sorted-array",
      "median-of-two-sorted-arrays"
    ]
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
      "merge-k-sorted-lists"
    ]
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
      "maximum-path-sum"
    ]
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
      "find-median-from-data-stream"
    ]
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
      "n-queens"
    ]
  },
  {
    topic: "Tries",
    slugs: [
      "implement-trie-prefix-tree",
      "design-add-and-search-words-data-structure",
      "word-search-ii"
    ]
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
      "cheapest-flights-within-k-stops"
    ]
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
      "longest-increasing-subsequence"
    ]
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
      "integer-break"
    ]
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
      "partition-labels"
    ]
  },
  {
    topic: "Intervals",
    slugs: [
      "insert-interval",
      "merge-intervals",
      "non-overlapping-intervals",
      "meeting-rooms",
      "meeting-rooms-ii",
      "minimum-number-of-arrows-to-burst-balloons"
    ]
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
      "detect-squares"
    ]
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
      "reverse-integer"
    ]
  }
];
var neetCode250TopicPath = [
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
      "longest-consecutive-sequence"
    ]
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
      "trapping-rain-water"
    ]
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
      "sliding-window-maximum"
    ]
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
      "maximum-frequency-stack"
    ]
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
      "median-of-two-sorted-arrays"
    ]
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
      "palindrome-linked-list"
    ]
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
      "construct-quad-tree"
    ]
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
      "ipo"
    ]
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
      "word-break-ii"
    ]
  },
  {
    topic: "Tries",
    slugs: [
      "implement-trie-prefix-tree",
      "design-add-and-search-words-data-structure",
      "word-search-ii",
      "extra-characters-in-a-string"
    ]
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
      "build-a-matrix-with-conditions"
    ]
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
      "greatest-common-divisor-traversal"
    ]
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
      "hand-of-straights"
    ]
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
      "regular-expression-matching"
    ]
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
      "dota2-senate"
    ]
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
      "minimum-number-of-arrows-to-burst-balloons"
    ]
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
      "detect-squares"
    ]
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
      "bitwise-and-of-numbers-range"
    ]
  }
];
var byteByteGo101TopicPath = [
  {
    topic: "Two Pointers",
    slugs: [
      courseProblem("two-sum-ii-input-array-is-sorted", "Pair Sum - Sorted", "Easy"),
      courseProblem("3sum", "Triplet Sum", "Medium"),
      courseProblem("valid-palindrome", "Is Palindrome Valid", "Easy"),
      courseProblem("container-with-most-water", "Largest Container", "Medium"),
      courseProblem("move-zeroes", "Shift Zeros to the End", "Easy"),
      courseProblem("next-permutation", "Next Lexicographical Sequence", "Medium")
    ]
  },
  {
    topic: "Hash Maps And Sets",
    slugs: [
      courseProblem("two-sum", "Pair Sum - Unsorted", "Easy"),
      courseProblem("valid-sudoku", "Verify Sudoku Board", "Medium"),
      courseProblem("set-matrix-zeroes", "Zero Striping", "Medium"),
      courseProblem("longest-consecutive-sequence", "Longest Chain of Consecutive Numbers", "Medium"),
      courseProblem("tuple-with-same-product", "Geometric Sequence Triplets", "Medium")
    ]
  },
  {
    topic: "Linked Lists",
    slugs: [
      courseProblem("reverse-linked-list", "Linked List Reversal", "Easy"),
      courseProblem("remove-nth-node-from-end-of-list", "Remove the Kth Last Node From a Linked List", "Medium"),
      courseProblem("intersection-of-two-linked-lists", "Linked List Intersection", "Easy"),
      courseProblem("lru-cache", "LRU Cache", "Hard"),
      courseProblem("palindrome-linked-list", "Palindromic Linked List", "Easy"),
      courseProblem("flatten-a-multilevel-doubly-linked-list", "Flatten a Multi-Level Linked List", "Medium")
    ]
  },
  {
    topic: "Fast And Slow Pointers",
    slugs: [
      courseProblem("linked-list-cycle", "Linked List Loop", "Easy"),
      courseProblem("middle-of-the-linked-list", "Linked List Midpoint", "Easy"),
      courseProblem("happy-number", "Happy Number", "Medium")
    ]
  },
  {
    topic: "Sliding Window",
    slugs: [
      courseProblem("find-all-anagrams-in-a-string", "Substring Anagrams", "Medium"),
      courseProblem("longest-substring-without-repeating-characters", "Longest Substring With Unique Characters", "Medium"),
      courseProblem("longest-repeating-character-replacement", "Longest Uniform Substring After Replacements", "Hard")
    ]
  },
  {
    topic: "Binary Search",
    slugs: [
      courseProblem("search-insert-position", "Find the Insertion Index", "Easy"),
      courseProblem("find-first-and-last-position-of-element-in-sorted-array", "First and Last Occurrences of a Number", "Medium"),
      courseProblem("cutting-ribbons", "Cutting Wood", "Medium"),
      courseProblem("search-in-rotated-sorted-array", "Find the Target in a Rotated Sorted Array", "Medium"),
      courseProblem("median-of-two-sorted-arrays", "Find the Median From Two Sorted Arrays", "Hard"),
      courseProblem("search-a-2d-matrix", "Matrix Search", "Medium"),
      courseProblem("find-peak-element", "Local Maxima in Array", "Medium"),
      courseProblem("random-pick-with-weight", "Weighted Random Selection", "Medium")
    ]
  },
  {
    topic: "Stacks",
    slugs: [
      courseProblem("valid-parentheses", "Valid Parenthesis Expression", "Easy"),
      courseProblem("next-greater-element-i", "Next Largest Number to the Right", "Medium"),
      courseProblem("evaluate-reverse-polish-notation", "Evaluate Expression", "Hard"),
      courseProblem("remove-all-adjacent-duplicates-in-string", "Repeated Removal of Adjacent Duplicates", "Easy"),
      courseProblem("implement-queue-using-stacks", "Implement a Queue using Stacks", "Medium"),
      courseProblem("sliding-window-maximum", "Maximums of Sliding Window", "Hard")
    ]
  },
  {
    topic: "Heaps",
    slugs: [
      courseProblem("top-k-frequent-words", "K Most Frequent Strings", "Medium"),
      courseProblem("merge-k-sorted-lists", "Combine Sorted Linked Lists", "Medium"),
      courseProblem("find-median-from-data-stream", "Median of an Integer Stream", "Hard"),
      courseProblem("sort-characters-by-frequency", "Sort a K-Sorted Array", "Medium")
    ]
  },
  {
    topic: "Intervals",
    slugs: [
      courseProblem("merge-intervals", "Merge Overlapping Intervals", "Medium"),
      courseProblem("interval-list-intersections", "Identify All Interval Overlaps", "Medium"),
      courseProblem("meeting-rooms-ii", "Largest Overlap of Intervals", "Medium")
    ]
  },
  {
    topic: "Prefix Sums",
    slugs: [
      courseProblem("range-sum-query-immutable", "Sum Between Range", "Easy"),
      courseProblem("subarray-sum-equals-k", "K-Sum Subarrays", "Medium"),
      courseProblem("product-of-array-except-self", "Product Array Without Current Element", "Medium")
    ]
  },
  {
    topic: "Trees",
    slugs: [
      courseProblem("invert-binary-tree", "Invert Binary Tree", "Easy"),
      courseProblem("balanced-binary-tree", "Balanced Binary Tree Validation", "Easy"),
      courseProblem("binary-tree-right-side-view", "Rightmost Nodes of a Binary Tree", "Medium"),
      courseProblem("maximum-width-of-binary-tree", "Widest Binary Tree Level", "Medium"),
      courseProblem("validate-binary-search-tree", "Binary Search Tree Validation", "Medium"),
      courseProblem("lowest-common-ancestor-of-a-binary-tree", "Lowest Common Ancestor", "Medium"),
      courseProblem(
        "construct-binary-tree-from-preorder-and-inorder-traversal",
        "Build Binary Tree From Preorder and Inorder Traversals",
        "Medium"
      ),
      courseProblem("binary-tree-maximum-path-sum", "Maximum Sum of a Continuous Path in a Binary Tree", "Hard"),
      courseProblem("symmetric-tree", "Binary Tree Symmetry", "Medium"),
      courseProblem("binary-tree-vertical-order-traversal", "Binary Tree Columns", "Medium"),
      courseProblem("kth-smallest-element-in-a-bst", "Kth Smallest Number in a Binary Search Tree", "Medium"),
      courseProblem("serialize-and-deserialize-binary-tree", "Serialize and Deserialize a Binary Tree", "Medium")
    ]
  },
  {
    topic: "Tries",
    slugs: [
      courseProblem("implement-trie-prefix-tree", "Design a Trie", "Medium"),
      courseProblem("design-add-and-search-words-data-structure", "Insert and Search Words with Wildcards", "Medium"),
      courseProblem("word-search-ii", "Find All Words on a Board", "Hard")
    ]
  },
  {
    topic: "Graphs",
    slugs: [
      courseProblem("clone-graph", "Graph Deep Copy", "Medium"),
      courseProblem("number-of-islands", "Count Islands", "Medium"),
      courseProblem("rotting-oranges", "Matrix Infection", "Medium"),
      courseProblem("is-graph-bipartite", "Bipartite Graph Validation", "Medium"),
      courseProblem("longest-increasing-path-in-a-matrix", "Longest Increasing Path", "Medium"),
      courseProblem("word-ladder", "Shortest Transformation Sequence", "Hard"),
      courseProblem("accounts-merge", "Merging Communities", "Hard"),
      courseProblem("course-schedule", "Prerequisites", "Medium"),
      courseProblem("network-delay-time", "Shortest Path", "Hard"),
      courseProblem("number-of-connected-components-in-an-undirected-graph", "Connect the Dots", "Medium")
    ]
  },
  {
    topic: "Backtracking",
    slugs: [
      courseProblem("permutations", "Find All Permutations", "Medium"),
      courseProblem("subsets", "Find All Subsets", "Medium"),
      courseProblem("n-queens", "N Queens", "Hard"),
      courseProblem("combination-sum", "Combinations of a Sum", "Medium"),
      courseProblem("letter-combinations-of-a-phone-number", "Phone Keypad Combinations", "Medium")
    ]
  },
  {
    topic: "Dynamic Programming",
    slugs: [
      courseProblem("climbing-stairs", "Climbing Stairs", "Easy"),
      courseProblem("coin-change", "Minimum Coin Combination", "Medium"),
      courseProblem("unique-paths", "Matrix Pathways", "Medium"),
      courseProblem("house-robber", "Neighborhood Burglary", "Medium"),
      courseProblem("longest-common-subsequence", "Longest Common Subsequence", "Hard"),
      courseProblem("longest-palindromic-substring", "Longest Palindrome in a String", "Medium"),
      courseProblem("maximum-subarray", "Maximum Subarray Sum", "Medium"),
      courseProblem("ones-and-zeroes", "0/1 Knapsack", "Hard"),
      courseProblem("maximal-square", "Largest Square in a Matrix", "Medium")
    ]
  },
  {
    topic: "Greedy",
    slugs: [
      courseProblem("jump-game", "Jump to the End", "Medium"),
      courseProblem("gas-station", "Gas Stations", "Hard"),
      courseProblem("candy", "Candies", "Medium")
    ]
  },
  {
    topic: "Sort And Search",
    slugs: [
      courseProblem("sort-list", "Sort Linked List", "Medium"),
      courseProblem("sort-an-array", "Sort Array", "Medium"),
      courseProblem("kth-largest-element-in-an-array", "Kth Largest Integer", "Medium"),
      courseProblem("sort-colors", "Dutch National Flag", "Medium")
    ]
  },
  {
    topic: "Bit Manipulation",
    slugs: [
      courseProblem("number-of-1-bits", "Hamming Weights of Integers", "Easy"),
      courseProblem("single-number", "Lonely Integer", "Easy"),
      courseProblem("reverse-bits", "Swap Odd and Even Bits", "Medium")
    ]
  },
  {
    topic: "Math And Geometry",
    slugs: [
      courseProblem("spiral-matrix", "Spiral Traversal", "Medium"),
      courseProblem("reverse-integer", "Reverse 32-Bit Integer", "Medium"),
      courseProblem("max-points-on-a-line", "Maximum Collinear Points", "Hard"),
      courseProblem("find-the-winner-of-the-circular-game", "The Josephus Problem", "Medium"),
      courseProblem("valid-triangle-number", "Triangle Numbers", "Medium")
    ]
  }
];
function mergeCuratedLists(...lists) {
  const bySlug = /* @__PURE__ */ new Map();
  for (const list of lists) {
    for (const item of list) {
      const existing = bySlug.get(item.slug);
      if (existing) {
        existing.tags = uniqueStrings([...existing.tags ?? [], ...item.tags ?? []]);
        continue;
      }
      bySlug.set(item.slug, {
        slug: item.slug,
        title: item.title ?? slugToTitle(item.slug),
        difficulty: item.difficulty,
        tags: uniqueStrings(item.tags ?? [])
      });
    }
  }
  return Array.from(bySlug.values());
}
function buildPlanRuntime(plan) {
  const bySlug = /* @__PURE__ */ new Map();
  const seenSteps = /* @__PURE__ */ new Set();
  const steps = [];
  for (const section of plan.sections) {
    for (const rawItem of section.slugs) {
      const item = normalizeTopicPathProblem(rawItem);
      const existing = bySlug.get(item.slug);
      if (existing) {
        existing.tags = uniqueStrings([...existing.tags ?? [], section.topic, ...item.tags]);
        existing.difficulty = existing.difficulty ?? item.difficulty;
      } else {
        bySlug.set(item.slug, {
          slug: item.slug,
          title: item.title,
          difficulty: item.difficulty,
          tags: uniqueStrings([section.topic, ...item.tags])
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
        difficulty: item.difficulty
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
      problemCount: problems.length
    },
    steps,
    problems
  };
}
var STUDY_PLAN_INPUTS = [
  {
    id: "Blind75",
    name: "Blind 75",
    description: "Core interview patterns, topic by topic.",
    sourceSet: "Blind75",
    sections: blind75TopicPath
  },
  {
    id: "ByteByteGo101",
    name: "ByteByteGo Coding Patterns 101",
    description: "ByteByteGo's coding patterns path, organized by interview pattern.",
    sourceSet: "ByteByteGo101",
    sections: byteByteGo101TopicPath
  },
  {
    id: "LeetCode75",
    name: "LeetCode 75",
    description: "LeetCode 75 path grouped by official topics.",
    sourceSet: "LeetCode75",
    sections: leetcode75TopicPath
  },
  {
    id: "Grind75",
    name: "Grind 75",
    description: "Grind 75 sequence for timed interview prep.",
    sourceSet: "Grind75",
    sections: [{ topic: "Grind 75 Path", slugs: grind75Slugs }]
  },
  {
    id: "NeetCode150",
    name: "NeetCode 150",
    description: "NeetCode 150 curated problems.",
    sourceSet: "NeetCode150",
    sections: neetCode150TopicPath
  },
  {
    id: "NeetCode250",
    name: "NeetCode 250",
    description: "Complete beginner study plan from NeetCode.",
    sourceSet: "NeetCode250",
    sections: neetCode250TopicPath
  }
];
var PLAN_RUNTIME = new Map(
  STUDY_PLAN_INPUTS.map((plan) => {
    const runtime = buildPlanRuntime(plan);
    return [runtime.summary.id, runtime];
  })
);
var DEFAULT_PLAN_ID = STUDY_PLAN_INPUTS[0]?.id ?? "Blind75";
var curatedBySet = /* @__PURE__ */ new Map();
for (const runtime of PLAN_RUNTIME.values()) {
  const existing = curatedBySet.get(runtime.summary.sourceSet) ?? [];
  curatedBySet.set(runtime.summary.sourceSet, mergeCuratedLists(existing, runtime.problems));
}
var CURATED_SETS = Object.fromEntries(curatedBySet.entries());
var problemCatalog = /* @__PURE__ */ new Map();
for (const runtime of PLAN_RUNTIME.values()) {
  for (const problem of runtime.problems) {
    const existing = problemCatalog.get(problem.slug);
    if (!existing) {
      problemCatalog.set(problem.slug, {
        slug: problem.slug,
        title: problem.title ?? slugToTitle(problem.slug),
        url: slugToUrl(problem.slug),
        sourceSets: [runtime.summary.sourceSet],
        topics: uniqueStrings(problem.tags ?? [])
      });
      continue;
    }
    existing.sourceSets = uniqueStrings([...existing.sourceSets, runtime.summary.sourceSet]);
    existing.topics = uniqueStrings([...existing.topics, ...problem.tags ?? []]);
  }
}
function resolvePlan(planId) {
  const byId = planId ? PLAN_RUNTIME.get(planId) : void 0;
  if (byId) {
    return byId;
  }
  const fallback = PLAN_RUNTIME.get(DEFAULT_PLAN_ID);
  if (!fallback) {
    throw new Error("No study plans configured.");
  }
  return fallback;
}
function listStudyPlans() {
  return STUDY_PLAN_INPUTS.map((plan) => resolvePlan(plan.id).summary);
}
function getDefaultCurriculumSteps(planId) {
  return [...resolvePlan(planId).steps];
}

// src/shared/courses.ts
function slugifySegment(value) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
function chapterId(courseId, order, title) {
  return `${courseId}::${String(order + 1).padStart(2, "0")}::${slugifySegment(title)}`;
}
function createQuestionProgress(slug) {
  return { slug };
}
function createChapterProgress(chapter) {
  const questionProgressBySlug = {};
  for (const slug of chapter.questionSlugs) {
    questionProgressBySlug[slug] = createQuestionProgress(slug);
  }
  return {
    chapterId: chapter.id,
    currentQuestionSlug: chapter.questionSlugs[0],
    questionProgressBySlug
  };
}
function createCourseProgress(course, now) {
  const chapterProgressById = {};
  for (const chapterIdValue of course.chapterIds) {
    chapterProgressById[chapterIdValue] = createChapterProgress(course.chaptersById[chapterIdValue]);
  }
  return {
    courseId: course.id,
    activeChapterId: course.chapterIds[0] ?? "",
    startedAt: now,
    lastInteractedAt: now,
    chapterProgressById
  };
}
function buildCuratedCourseDefinition(summary, now) {
  const steps = getDefaultCurriculumSteps(summary.id);
  const chapterIds = [];
  const chaptersById = {};
  const questionRefsBySlug = {};
  const grouped = /* @__PURE__ */ new Map();
  for (const step of steps) {
    const current = grouped.get(step.topic) ?? [];
    current.push(step.slug);
    grouped.set(step.topic, current);
    questionRefsBySlug[step.slug] = {
      slug: step.slug,
      title: step.title,
      url: step.url,
      difficulty: step.difficulty,
      chapterId: "",
      chapterTitle: step.topic,
      order: current.length - 1
    };
  }
  Array.from(grouped.entries()).forEach(([title, questionSlugs], order) => {
    const id = chapterId(summary.id, order, title);
    chapterIds.push(id);
    chaptersById[id] = {
      id,
      title,
      order,
      questionSlugs
    };
    questionSlugs.forEach((slug, index) => {
      questionRefsBySlug[slug] = {
        ...questionRefsBySlug[slug],
        chapterId: id,
        chapterTitle: title,
        order: index
      };
    });
  });
  return {
    id: summary.id,
    name: summary.name,
    description: summary.description,
    sourceSet: summary.sourceSet,
    chapterIds,
    chaptersById,
    questionRefsBySlug,
    createdAt: now,
    updatedAt: now
  };
}
function buildCuratedSeed(now) {
  const coursesById = {};
  const courseOrder = [];
  for (const summary of listStudyPlans()) {
    const course = buildCuratedCourseDefinition(summary, now);
    coursesById[course.id] = course;
    courseOrder.push(course.id);
  }
  return { coursesById, courseOrder };
}
function mergeCourseDefinition(curated, existing, now) {
  if (!existing) {
    return curated;
  }
  const mergedChapterIds = [...curated.chapterIds];
  const mergedChaptersById = {};
  const mergedQuestionRefsBySlug = { ...curated.questionRefsBySlug };
  for (const chapterIdValue of curated.chapterIds) {
    const curatedChapter = curated.chaptersById[chapterIdValue];
    const existingChapter = existing.chaptersById[chapterIdValue];
    const questionSlugs = existingChapter ? uniqueStrings([...curatedChapter.questionSlugs, ...existingChapter.questionSlugs]) : curatedChapter.questionSlugs;
    mergedChaptersById[chapterIdValue] = {
      ...curatedChapter,
      questionSlugs
    };
  }
  for (const chapterIdValue of existing.chapterIds) {
    if (mergedChaptersById[chapterIdValue]) {
      continue;
    }
    mergedChapterIds.push(chapterIdValue);
    mergedChaptersById[chapterIdValue] = existing.chaptersById[chapterIdValue];
  }
  for (const [slug, ref] of Object.entries(existing.questionRefsBySlug)) {
    if (mergedQuestionRefsBySlug[slug]) {
      continue;
    }
    mergedQuestionRefsBySlug[slug] = ref;
  }
  return {
    ...curated,
    chapterIds: mergedChapterIds,
    chaptersById: mergedChaptersById,
    questionRefsBySlug: mergedQuestionRefsBySlug,
    createdAt: existing.createdAt || curated.createdAt,
    updatedAt: now
  };
}
function isStarted(state) {
  return Boolean(state && (state.reviewCount > 0 || state.status !== "NEW"));
}
function isDue(state) {
  return Boolean(
    state && state.nextReviewAt && state.status !== "SUSPENDED" && new Date(state.nextReviewAt).getTime() <= Date.now()
  );
}
function firstIncompleteChapterId(data, course) {
  for (const chapterIdValue of course.chapterIds) {
    const chapter = course.chaptersById[chapterIdValue];
    const complete = chapter.questionSlugs.every((slug) => isStarted(data.studyStatesBySlug[slug]));
    if (!complete) {
      return chapterIdValue;
    }
  }
  return course.chapterIds[course.chapterIds.length - 1] ?? null;
}
function findCurrentQuestionSlug(data, chapter) {
  const current = chapter.questionSlugs.find((slug) => !isStarted(data.studyStatesBySlug[slug]));
  return current ?? null;
}
function courseQuestionStatus(data, chapter, slug, chapterStatus) {
  const state = data.studyStatesBySlug[slug];
  const inLibrary = Boolean(data.problemsBySlug[slug]);
  const currentSlug = findCurrentQuestionSlug(data, chapter);
  if (isDue(state)) {
    return "DUE_NOW";
  }
  if (state?.status === "MASTERED") {
    return "MASTERED";
  }
  if (isStarted(state)) {
    return "REVIEWING";
  }
  if (chapterStatus === "UPCOMING") {
    return "LOCKED";
  }
  if (currentSlug === slug) {
    return inLibrary ? "READY" : "CURRENT";
  }
  return "LOCKED";
}
function ensureCourseData(data, now = nowIso()) {
  const curated = buildCuratedSeed(now);
  const mergedCoursesById = {};
  for (const courseIdValue of curated.courseOrder) {
    mergedCoursesById[courseIdValue] = mergeCourseDefinition(
      curated.coursesById[courseIdValue],
      data.coursesById[courseIdValue],
      now
    );
  }
  for (const [courseIdValue, course] of Object.entries(data.coursesById)) {
    if (mergedCoursesById[courseIdValue]) {
      continue;
    }
    mergedCoursesById[courseIdValue] = course;
  }
  data.coursesById = mergedCoursesById;
  data.courseOrder = uniqueStrings([...curated.courseOrder, ...data.courseOrder]);
  for (const courseIdValue of data.courseOrder) {
    const course = data.coursesById[courseIdValue];
    if (!course) {
      continue;
    }
    const existing = data.courseProgressById[courseIdValue] ?? createCourseProgress(course, now);
    for (const chapterIdValue of course.chapterIds) {
      const chapter = course.chaptersById[chapterIdValue];
      const chapterProgress = existing.chapterProgressById[chapterIdValue] ?? createChapterProgress(chapter);
      for (const slug of chapter.questionSlugs) {
        chapterProgress.questionProgressBySlug[slug] = chapterProgress.questionProgressBySlug[slug] ?? createQuestionProgress(slug);
      }
      existing.chapterProgressById[chapterIdValue] = chapterProgress;
    }
    data.courseProgressById[courseIdValue] = existing;
  }
  if (!data.settings.activeCourseId || !data.coursesById[data.settings.activeCourseId]) {
    data.settings.activeCourseId = data.courseOrder[0] ?? DEFAULT_COURSE_ID;
  }
  syncCourseProgress(data, now);
}
function syncCourseProgress(data, now = nowIso()) {
  for (const courseIdValue of data.courseOrder) {
    const course = data.coursesById[courseIdValue];
    if (!course) {
      continue;
    }
    const progress = data.courseProgressById[courseIdValue] ?? createCourseProgress(course, now);
    const firstIncomplete = firstIncompleteChapterId(data, course);
    for (const chapterIdValue of course.chapterIds) {
      const chapter = course.chaptersById[chapterIdValue];
      const chapterProgress = progress.chapterProgressById[chapterIdValue] ?? createChapterProgress(chapter);
      const currentQuestionSlug = findCurrentQuestionSlug(data, chapter);
      chapterProgress.currentQuestionSlug = currentQuestionSlug ?? chapter.questionSlugs[chapter.questionSlugs.length - 1];
      let chapterComplete = true;
      for (const slug of chapter.questionSlugs) {
        const questionProgress = chapterProgress.questionProgressBySlug[slug] ?? createQuestionProgress(slug);
        const state = data.studyStatesBySlug[slug];
        const problem = data.problemsBySlug[slug];
        if (problem && !questionProgress.addedToLibraryAt) {
          questionProgress.addedToLibraryAt = problem.createdAt || now;
        }
        if (state?.lastReviewedAt) {
          questionProgress.lastReviewedAt = state.lastReviewedAt;
        }
        if (isStarted(state)) {
          questionProgress.completedAt = questionProgress.completedAt ?? state?.lastReviewedAt ?? now;
        } else {
          chapterComplete = false;
          delete questionProgress.completedAt;
        }
        chapterProgress.questionProgressBySlug[slug] = questionProgress;
      }
      if (chapterComplete) {
        chapterProgress.completedAt = chapterProgress.completedAt ?? now;
      } else {
        delete chapterProgress.completedAt;
      }
      progress.chapterProgressById[chapterIdValue] = chapterProgress;
    }
    progress.activeChapterId = firstIncomplete ?? course.chapterIds[0] ?? progress.activeChapterId;
    progress.lastInteractedAt = progress.lastInteractedAt || now;
    progress.startedAt = progress.startedAt || now;
    data.courseProgressById[courseIdValue] = progress;
  }
}
function buildCourseCards(data) {
  const cards = [];
  for (const courseIdValue of data.courseOrder) {
    const course = data.coursesById[courseIdValue];
    if (!course) {
      continue;
    }
    let totalQuestions = 0;
    let completedQuestions = 0;
    let dueCount = 0;
    let completedChapters = 0;
    let nextQuestionTitle;
    let nextChapterTitle;
    for (const chapterIdValue of course.chapterIds) {
      const chapter = course.chaptersById[chapterIdValue];
      const chapterComplete = chapter.questionSlugs.every((slug) => isStarted(data.studyStatesBySlug[slug]));
      if (chapterComplete) {
        completedChapters += 1;
      }
      for (const slug of chapter.questionSlugs) {
        totalQuestions += 1;
        if (isStarted(data.studyStatesBySlug[slug])) {
          completedQuestions += 1;
        } else if (!nextQuestionTitle) {
          nextQuestionTitle = course.questionRefsBySlug[slug]?.title ?? slugToTitle(slug);
          nextChapterTitle = chapter.title;
        }
        if (isDue(data.studyStatesBySlug[slug])) {
          dueCount += 1;
        }
      }
    }
    cards.push({
      id: course.id,
      name: course.name,
      description: course.description,
      sourceSet: course.sourceSet,
      active: data.settings.activeCourseId === course.id,
      totalQuestions,
      completedQuestions,
      completionPercent: totalQuestions === 0 ? 0 : Math.round(completedQuestions / totalQuestions * 100),
      dueCount,
      totalChapters: course.chapterIds.length,
      completedChapters,
      nextQuestionTitle,
      nextChapterTitle
    });
  }
  return cards;
}
function buildActiveCourseView(data, courseId = data.settings.activeCourseId) {
  const course = data.coursesById[courseId];
  if (!course) {
    return null;
  }
  const card = buildCourseCards(data).find((entry) => entry.id === courseId);
  const firstIncomplete = firstIncompleteChapterId(data, course);
  const activeChapterIdValue = firstIncomplete ?? course.chapterIds[0] ?? null;
  const activeChapterTitle = activeChapterIdValue ? course.chaptersById[activeChapterIdValue]?.title ?? null : null;
  let nextQuestion = null;
  const chapters = course.chapterIds.map((chapterIdValue) => {
    const chapter = course.chaptersById[chapterIdValue];
    const completedQuestions = chapter.questionSlugs.filter((slug) => isStarted(data.studyStatesBySlug[slug])).length;
    const status = completedQuestions === chapter.questionSlugs.length ? "COMPLETE" : chapterIdValue === activeChapterIdValue ? "CURRENT" : "UPCOMING";
    const questions = chapter.questionSlugs.map((slug) => {
      const problem = data.problemsBySlug[slug];
      const ref = course.questionRefsBySlug[slug];
      const state = data.studyStatesBySlug[slug];
      const questionStatus = courseQuestionStatus(data, chapter, slug, status);
      const view = {
        slug,
        title: ref?.title || problem?.title || slugToTitle(slug),
        url: problem?.url || ref?.url || slugToUrl(slug),
        difficulty: problem?.difficulty || ref?.difficulty || "Unknown",
        chapterId: chapterIdValue,
        chapterTitle: chapter.title,
        status: questionStatus,
        nextReviewAt: state?.nextReviewAt,
        inLibrary: Boolean(problem),
        isCurrent: questionStatus === "CURRENT" || questionStatus === "READY"
      };
      if (!nextQuestion && view.isCurrent) {
        nextQuestion = view;
      }
      return view;
    });
    return {
      id: chapterIdValue,
      title: chapter.title,
      order: chapter.order,
      status,
      totalQuestions: chapter.questionSlugs.length,
      completedQuestions,
      questions
    };
  });
  return {
    ...card ?? {
      id: course.id,
      name: course.name,
      description: course.description,
      sourceSet: course.sourceSet,
      active: true,
      totalQuestions: 0,
      completedQuestions: 0,
      completionPercent: 0,
      dueCount: 0,
      totalChapters: course.chapterIds.length,
      completedChapters: 0
    },
    activeChapterId: activeChapterIdValue,
    activeChapterTitle,
    nextQuestion,
    chapters
  };
}

// src/shared/queue.ts
function cloneStateOrDefault(state) {
  return state ? { ...state } : createDefaultStudyState();
}
function isSetEnabled(problem, setsEnabled) {
  if (problem.sourceSet.length === 0) {
    return setsEnabled.Custom !== false;
  }
  return problem.sourceSet.some((set) => setsEnabled[set] !== false);
}
function sortByDueDateAsc(items) {
  return [...items].sort((a, b) => {
    const aTs = a.studyState.nextReviewAt ? new Date(a.studyState.nextReviewAt).getTime() : Number.MAX_SAFE_INTEGER;
    const bTs = b.studyState.nextReviewAt ? new Date(b.studyState.nextReviewAt).getTime() : Number.MAX_SAFE_INTEGER;
    return aTs - bTs;
  });
}
function sortWeakest(items) {
  return [...items].sort((a, b) => {
    if (b.studyState.lapses !== a.studyState.lapses) {
      return b.studyState.lapses - a.studyState.lapses;
    }
    if (a.studyState.ease !== b.studyState.ease) {
      return a.studyState.ease - b.studyState.ease;
    }
    const aTs = a.studyState.nextReviewAt ? new Date(a.studyState.nextReviewAt).getTime() : Number.MAX_SAFE_INTEGER;
    const bTs = b.studyState.nextReviewAt ? new Date(b.studyState.nextReviewAt).getTime() : Number.MAX_SAFE_INTEGER;
    return aTs - bTs;
  });
}
function interleaveByDifficulty(items) {
  const buckets = {
    Easy: [],
    Medium: [],
    Hard: [],
    Unknown: []
  };
  for (const item of sortByDueDateAsc(items)) {
    buckets[item.problem.difficulty].push(item);
  }
  const order = ["Easy", "Medium", "Hard", "Unknown"];
  const result = [];
  let added = true;
  while (added) {
    added = false;
    for (const key of order) {
      const next = buckets[key].shift();
      if (next) {
        result.push(next);
        added = true;
      }
    }
  }
  return result;
}
function orderItems(items, strategy) {
  if (strategy === "weakestFirst") {
    return sortWeakest(items);
  }
  if (strategy === "mixByDifficulty") {
    return interleaveByDifficulty(items);
  }
  return sortByDueDateAsc(items);
}
function buildTodayQueue(data, now = /* @__PURE__ */ new Date()) {
  const problems = Object.values(data.problemsBySlug).filter(
    (problem) => isSetEnabled(problem, data.settings.setsEnabled)
  );
  const due = [];
  const newCandidates = [];
  const reinforcementCandidates = [];
  for (const problem of problems) {
    const state = cloneStateOrDefault(data.studyStatesBySlug[problem.leetcodeSlug]);
    if (state.status === "SUSPENDED") {
      continue;
    }
    const dueAt = state.nextReviewAt ? new Date(state.nextReviewAt).getTime() : Number.POSITIVE_INFINITY;
    const isDue2 = state.reviewCount > 0 && dueAt <= now.getTime();
    if (isDue2) {
      due.push({
        slug: problem.leetcodeSlug,
        problem,
        studyState: state,
        due: true,
        category: "due"
      });
      continue;
    }
    if (state.reviewCount === 0 || state.status === "NEW") {
      newCandidates.push({
        slug: problem.leetcodeSlug,
        problem,
        studyState: state,
        due: false,
        category: "new"
      });
      continue;
    }
    reinforcementCandidates.push({
      slug: problem.leetcodeSlug,
      problem,
      studyState: state,
      due: false,
      category: "reinforcement"
    });
  }
  const dueOrdered = orderItems(due, data.settings.reviewOrder);
  const newOrdered = orderItems(newCandidates, data.settings.reviewOrder).slice(
    0,
    data.settings.dailyNewLimit
  );
  const reinforcementSlots = Math.max(0, data.settings.dailyReviewLimit - dueOrdered.length);
  const reinforcementOrdered = orderItems(reinforcementCandidates, data.settings.reviewOrder).slice(
    0,
    reinforcementSlots
  );
  return {
    generatedAt: now.toISOString(),
    dueCount: dueOrdered.length,
    newCount: newOrdered.length,
    reinforcementCount: reinforcementOrdered.length,
    items: [...dueOrdered, ...newOrdered, ...reinforcementOrdered]
  };
}

// src/shared/recommendations.ts
function buildRecommendedCandidates(queue, activeCourseNextSlug, nowMs = Date.now()) {
  const candidates = queue.items.filter((item, index) => item.category === "due" || item.category === "reinforcement" || index === 0).slice(0, 12).map((item) => {
    const dueAt = item.studyState.nextReviewAt ? new Date(item.studyState.nextReviewAt).getTime() : null;
    const overdueDays = dueAt !== null && dueAt < nowMs ? Math.floor((nowMs - dueAt) / (24 * 60 * 60 * 1e3)) : 0;
    const reason = item.category === "due" ? overdueDays >= 1 ? "Overdue" : "Due now" : "Review focus";
    return {
      slug: item.slug,
      title: item.problem.title || item.slug,
      url: item.problem.url,
      difficulty: item.problem.difficulty,
      reason,
      nextReviewAt: item.studyState.nextReviewAt,
      daysOverdue: overdueDays > 0 ? overdueDays : void 0,
      alsoCourseNext: activeCourseNextSlug === item.slug
    };
  });
  const seen = /* @__PURE__ */ new Set();
  return candidates.filter((candidate) => {
    if (seen.has(candidate.slug)) {
      return false;
    }
    seen.add(candidate.slug);
    return true;
  });
}

// src/shared/storage.ts
function normalizeSettings(input) {
  const nextActiveCourseId = input?.activeCourseId || input?.activeStudyPlanId || DEFAULT_COURSE_ID;
  const merged = {
    ...DEFAULT_SETTINGS,
    ...input ?? {},
    activeCourseId: nextActiveCourseId,
    quietHours: {
      ...DEFAULT_SETTINGS.quietHours,
      ...input?.quietHours ?? {}
    },
    setsEnabled: {
      ...DEFAULT_SETTINGS.setsEnabled,
      ...input?.setsEnabled ?? {}
    }
  };
  if (merged.studyMode !== "freestyle" && merged.studyMode !== "studyPlan") {
    merged.studyMode = DEFAULT_SETTINGS.studyMode;
  }
  if (typeof merged.activeCourseId !== "string" || !merged.activeCourseId.trim()) {
    merged.activeCourseId = DEFAULT_COURSE_ID;
  }
  for (const setName of BUILT_IN_SETS) {
    if (typeof merged.setsEnabled[setName] !== "boolean") {
      merged.setsEnabled[setName] = true;
    }
  }
  if (typeof merged.setsEnabled.LeetCode150 !== "boolean") {
    merged.setsEnabled.LeetCode150 = true;
  }
  if (typeof merged.setsEnabled.Custom !== "boolean") {
    merged.setsEnabled.Custom = true;
  }
  return merged;
}
function normalizeStoredAppData(stored) {
  const data = {
    schemaVersion: CURRENT_STORAGE_SCHEMA_VERSION,
    problemsBySlug: stored?.problemsBySlug ?? {},
    studyStatesBySlug: stored?.studyStatesBySlug ?? {},
    coursesById: stored?.coursesById ?? {},
    courseOrder: Array.isArray(stored?.courseOrder) ? stored.courseOrder : [],
    courseProgressById: stored?.courseProgressById ?? {},
    settings: normalizeSettings(stored?.settings)
  };
  ensureCourseData(data);
  return data;
}

// tests/logic.test.ts
function makeProblem(slug, title, difficulty = "Medium") {
  return {
    id: slug,
    leetcodeSlug: slug,
    title,
    difficulty,
    url: `https://leetcode.com/problems/${slug}/`,
    topics: [],
    sourceSet: ["Blind75"],
    createdAt: "2026-03-01T00:00:00.000Z",
    updatedAt: "2026-03-01T00:00:00.000Z"
  };
}
function makeReviewedState(nextReviewAt) {
  return {
    ...createDefaultStudyState(),
    status: "REVIEWING",
    reviewCount: 1,
    lastReviewedAt: "2026-03-10T00:00:00.000Z",
    nextReviewAt,
    intervalDays: 4,
    lastRating: 2,
    attemptHistory: [
      {
        reviewedAt: "2026-03-10T00:00:00.000Z",
        rating: 2,
        mode: "FULL_SOLVE"
      }
    ]
  };
}
function testLegacyStorageMigration() {
  const migrated = normalizeStoredAppData({
    problemsBySlug: {
      "two-sum": makeProblem("two-sum", "Two Sum", "Easy")
    },
    studyStatesBySlug: {
      "two-sum": makeReviewedState("2026-03-12T00:00:00.000Z")
    },
    settings: {
      activeStudyPlanId: "Blind75",
      dailyNewLimit: 5
    }
  });
  import_strict.default.equal(migrated.settings.activeCourseId, "Blind75");
  import_strict.default.ok(migrated.coursesById.Blind75);
  import_strict.default.ok(migrated.courseProgressById.Blind75);
  const activeChapterId = migrated.courseProgressById.Blind75.activeChapterId;
  const chapterProgress = migrated.courseProgressById.Blind75.chapterProgressById[activeChapterId];
  import_strict.default.ok(chapterProgress);
}
function testCourseProgressionSelection() {
  const data = normalizeStoredAppData({
    settings: {
      activeStudyPlanId: "Blind75"
    }
  });
  data.problemsBySlug["two-sum"] = makeProblem("two-sum", "Two Sum", "Easy");
  data.problemsBySlug["best-time-to-buy-and-sell-stock"] = makeProblem(
    "best-time-to-buy-and-sell-stock",
    "Best Time To Buy And Sell Stock",
    "Easy"
  );
  data.studyStatesBySlug["two-sum"] = makeReviewedState("2026-03-11T00:00:00.000Z");
  data.studyStatesBySlug["best-time-to-buy-and-sell-stock"] = makeReviewedState("2026-03-14T00:00:00.000Z");
  syncCourseProgress(data, "2026-03-15T00:00:00.000Z");
  const active = buildActiveCourseView(data, "Blind75");
  import_strict.default.ok(active);
  import_strict.default.equal(active?.nextQuestion?.slug, "contains-duplicate");
  import_strict.default.equal(active?.chapters[0].status, "CURRENT");
}
function testRecommendedAndCourseNextStaySeparate() {
  const data = normalizeStoredAppData({
    settings: {
      activeStudyPlanId: "Blind75"
    }
  });
  data.problemsBySlug["two-sum"] = makeProblem("two-sum", "Two Sum", "Easy");
  data.problemsBySlug["best-time-to-buy-and-sell-stock"] = makeProblem(
    "best-time-to-buy-and-sell-stock",
    "Best Time To Buy And Sell Stock",
    "Easy"
  );
  data.studyStatesBySlug["two-sum"] = makeReviewedState("2026-03-01T00:00:00.000Z");
  data.studyStatesBySlug["best-time-to-buy-and-sell-stock"] = makeReviewedState("2026-04-01T00:00:00.000Z");
  syncCourseProgress(data, "2026-03-15T00:00:00.000Z");
  const queue = buildTodayQueue(data, /* @__PURE__ */ new Date("2026-03-15T00:00:00.000Z"));
  const active = buildActiveCourseView(data, "Blind75");
  const recommended = buildRecommendedCandidates(queue, active?.nextQuestion?.slug, (/* @__PURE__ */ new Date("2026-03-15T00:00:00.000Z")).getTime());
  import_strict.default.ok(active?.nextQuestion);
  import_strict.default.equal(active?.nextQuestion?.slug, "contains-duplicate");
  import_strict.default.equal(recommended[0]?.slug, "two-sum");
  import_strict.default.equal(recommended[0]?.alsoCourseNext, false);
}
function testByteByteGoCourseSeed() {
  const data = normalizeStoredAppData();
  const summary = listStudyPlans().find((plan) => plan.id === "ByteByteGo101");
  const course = buildActiveCourseView(data, "ByteByteGo101");
  import_strict.default.ok(summary);
  import_strict.default.equal(summary?.problemCount, 101);
  import_strict.default.equal(summary?.topicCount, 19);
  import_strict.default.ok(course);
  import_strict.default.equal(course?.name, "ByteByteGo Coding Patterns 101");
  import_strict.default.equal(course?.totalQuestions, 101);
  import_strict.default.equal(course?.totalChapters, 19);
  import_strict.default.equal(course?.nextQuestion?.title, "Pair Sum - Sorted");
  import_strict.default.equal(course?.nextQuestion?.difficulty, "Easy");
  import_strict.default.equal(course?.nextQuestion?.slug, "two-sum-ii-input-array-is-sorted");
}
function run() {
  testLegacyStorageMigration();
  testCourseProgressionSelection();
  testRecommendedAndCourseNextStaySeparate();
  testByteByteGoCourseSeed();
  console.log("logic tests passed");
}
run();
