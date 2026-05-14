/**
 * `@libs/leetcode` — the single home for all LeetCode-specific
 * knowledge that the app consumes: slug/URL parsing, difficulty
 * value type + parser, and live DOM parsers for the LeetCode problem
 * page. Lives in libs so both features (problems, overlay-session)
 * and other libs (runtime-rpc validator) can use it without breaking
 * the libs→features boundary.
 *
 * Future LeetCode-domain integrations (GraphQL queries, GenAI page
 * extractors, etc.) land here too.
 */
export {
  normalizeSlug,
  slugToTitle,
  slugToUrl,
  leetcodeProblemUrl,
  isProblemPage,
} from "./slug";
export { parseDifficulty, type Difficulty } from "./difficulty";
export { parseProblemInput } from "./parseProblemInput";
export {
  getProblemSlugFromUrl,
  detectDifficulty,
  detectTitle,
  detectPremium,
  readProblemPageSnapshot,
  isStaleOverlayRequest,
  type OverlayProblemPageSnapshot,
} from "./dom/leetcode";
