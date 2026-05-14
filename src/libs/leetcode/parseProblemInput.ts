import { isProblemPage, normalizeSlug } from "./slug";

/** Parses free-text input (a LeetCode URL or a bare slug) into a
 *  canonical `{ slug, url }` pair. Pure function — no DB, no network.
 *  Composes the slug primitives in this lib; lives here because it
 *  encodes LeetCode URL shape, not CogniPace domain. */
export function parseProblemInput(input: string): {
  slug: string;
  url: string;
} {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error("Enter a LeetCode URL or slug.");
  }

  // URL form
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

  // Bare slug form
  const slug = normalizeSlug(trimmed);
  if (!slug) {
    throw new Error("Invalid slug.");
  }
  return {
    slug,
    url: `https://leetcode.com/problems/${slug}/`,
  };
}
