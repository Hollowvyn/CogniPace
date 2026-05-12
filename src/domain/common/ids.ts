/**
 * Branded ID types and constructors. Branding prevents accidental cross-FK
 * mixing at compile time (e.g., passing a Problem.slug where a Topic.id is
 * expected typechecks today; with brands it does not).
 *
 * For curated entities, IDs are slug-style strings ("array", "google",
 * "blind75"). User-created entities use UUIDs. The brand is the same.
 */

type Brand<T, B> = T & { readonly __brand: B };

export type ProblemSlug = Brand<string, "ProblemSlug">;
export type TopicId = Brand<string, "TopicId">;
export type CompanyId = Brand<string, "CompanyId">;
export type TrackId = Brand<string, "TrackId">;
export type TrackGroupId = Brand<string, "TrackGroupId">;

/** Normalize and brand an arbitrary string as a Problem slug. */
export function asProblemSlug(value: string): ProblemSlug {
  return slugify(value) as ProblemSlug;
}

/** Brand a slug-style string as a Topic id. */
export function asTopicId(value: string): TopicId {
  return slugify(value) as TopicId;
}

/** Brand a slug-style string as a Company id. */
export function asCompanyId(value: string): CompanyId {
  return slugify(value) as CompanyId;
}

/** Brand a slug-style or UUID string as a Track id. */
export function asTrackId(value: string): TrackId {
  return value.trim() as TrackId;
}

/** Brand a UUID string as a TrackGroup id. */
export function asTrackGroupId(value: string): TrackGroupId {
  return value.trim() as TrackGroupId;
}

/** Generate a fresh UUID-based Track id (for user-created tracks). */
export function newTrackId(): TrackId {
  return crypto.randomUUID() as TrackId;
}

/** Generate a fresh UUID-based TrackGroup id. */
export function newTrackGroupId(): TrackGroupId {
  return crypto.randomUUID() as TrackGroupId;
}

/**
 * Lowercase, trim, replace whitespace + invalid characters with single
 * hyphens, collapse repeated hyphens. Used to normalize user input into
 * slug-style ids for Topics, Companies, and Problems.
 */
export function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
