import { asProblemSlug, slugify, type ProblemSlug } from "../common/ids";

/**
 * Normalises raw problem identifiers (page-detected slugs, user-typed
 * input, imported records) into the canonical branded slug.
 */
export function normalizeProblemSlug(value: string): ProblemSlug {
  return asProblemSlug(value);
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

/**
 * Returns the canonical LeetCode problem URL for a given slug.
 * Centralised so the URL format lives in one place.
 */
export function leetcodeProblemUrl(slug: string): string {
  return `https://leetcode.com/problems/${slugify(slug)}/`;
}
