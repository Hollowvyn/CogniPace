/**
 * LeetCode slug helpers — canonical problem identifier normalization
 * and URL/title presentation. Pure functions over strings + the
 * `ProblemSlug` brand from `@shared/ids`. Lives in libs because both
 * libs/runtime-rpc (message validator) and libs/screen-parsing (DOM
 * parser) need them, and libs cannot import from features.
 */
import { asProblemSlug, slugify, type ProblemSlug } from "@shared/ids";

export function normalizeSlug(input: string): ProblemSlug {
  return asProblemSlug(
    input
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\/leetcode\.com\/problems\//, "")
      .replace(/^https?:\/\/www\.leetcode\.com\/problems\//, "")
      .replace(/^problems\//, "")
      .replace(/\/.*/, "")
      .replace(/[^a-z0-9-]/g, ""),
  );
}

/** Generates a human-readable title from a slug ("two-sum" → "Two Sum"). */
export function slugToTitle(slug: string): string {
  if (!slug) return "";
  return slugify(slug)
    .split("-")
    .filter((piece) => piece.length > 0)
    .map((piece) => piece.charAt(0).toUpperCase() + piece.slice(1))
    .join(" ");
}

/** Canonical LeetCode problem URL for a given slug. */
export function slugToUrl(slug: string): string {
  return `https://leetcode.com/problems/${slugify(slug)}/`;
}

/** Alias for slugToUrl — preserved for legacy callers. */
export const leetcodeProblemUrl = slugToUrl;

/** Alias for normalizeSlug — preserved for legacy callers. */
export const normalizeProblemSlug = normalizeSlug;

export function isProblemPage(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      /(^|\.)leetcode\.com$/.test(parsed.hostname) &&
      /\/problems\/.+/.test(parsed.pathname)
    );
  } catch {
    return false;
  }
}
