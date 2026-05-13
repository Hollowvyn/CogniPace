/** Slug helpers — re-exported from `@libs/leetcode`. The shared
 *  helpers live there so the runtime-rpc validator and the LeetCode
 *  DOM parser can consume them without breaking the libs→features
 *  boundary. */
export {
  normalizeSlug,
  slugToTitle,
  slugToUrl,
  leetcodeProblemUrl,
  normalizeProblemSlug,
  isProblemPage,
} from "@libs/leetcode";
