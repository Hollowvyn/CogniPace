import { slugify } from "./slugify";

import type { Brand } from "./Brand";

/** Slug-style identifier for a Topic (curated or user-created). */
export type TopicId = Brand<string, "TopicId">;

/** Brand a slug-style string as a Topic id. */
export function asTopicId(value: string): TopicId {
  return slugify(value) as TopicId;
}
