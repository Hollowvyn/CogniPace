/** Domain helpers for canonical LeetCode problem slug identity. */
export type ProblemSlug = string;

/**
 * Normalizes any supported slug or LeetCode URL into the canonical slug form.
 */
export function normalizeSlug(input: string): ProblemSlug {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\/leetcode\.com\/problems\//, "")
    .replace(/^https?:\/\/www\.leetcode\.com\/problems\//, "")
    .replace(/^problems\//, "")
    .replace(/\/.*/, "")
    .replace(/[^a-z0-9-]/g, "");
}

/** Converts a canonical slug into a presentable title. */
export function slugToTitle(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/** Converts a canonical slug into the public LeetCode problem URL. */
export function slugToUrl(slug: string): string {
  return `https://leetcode.com/problems/${slug}/`;
}

/** Returns true when the provided url points at a LeetCode problem page. */
export function isProblemPage(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      (parsed.protocol === "https:" || parsed.protocol === "http:") &&
      /(^|\.)leetcode\.com$/.test(parsed.hostname) &&
      /\/problems\/.+/.test(parsed.pathname)
    );
  } catch {
    return false;
  }
}
