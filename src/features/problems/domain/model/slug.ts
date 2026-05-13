/** Slug helpers — re-exported from `@libs/leetcode`. The shared
 *  helpers live there so libs/runtime-rpc and libs/screen-parsing can
 *  consume them without breaking the libs→features boundary. */
export {
  normalizeSlug,
  slugToTitle,
  slugToUrl,
  leetcodeProblemUrl,
  normalizeProblemSlug,
  isProblemPage,
} from "@libs/leetcode";
