/**
 * Lowercase, trim, replace whitespace + invalid characters with single
 * hyphens, and collapse repeated hyphens. Used to normalize user input
 * into slug-style ids for Topics, Companies, and Problems.
 */
export function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
