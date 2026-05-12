/**
 * Branded ID types and their constructors. Branding prevents accidental
 * cross-FK mixing at compile time (e.g., passing a Problem.slug where a
 * Topic.id is expected typechecks today; with brands it does not).
 *
 * For curated entities, IDs are slug-style strings ("array", "google",
 * "blind75"). User-created entities use UUIDs. The brand is the same.
 *
 * One type per file; import from `@shared/ids` (this barrel).
 */
export type { Brand } from "./Brand";

export { slugify } from "./slugify";

export type { ProblemSlug } from "./ProblemSlug";
export { asProblemSlug } from "./ProblemSlug";

export type { TopicId } from "./TopicId";
export { asTopicId } from "./TopicId";

export type { CompanyId } from "./CompanyId";
export { asCompanyId } from "./CompanyId";

export type { TrackId } from "./TrackId";
export { asTrackId, newTrackId } from "./TrackId";

export type { TrackGroupId } from "./TrackGroupId";
export { asTrackGroupId, newTrackGroupId } from "./TrackGroupId";
