import type { TopicId } from "@shared/ids";

/** First-class taxonomy entity representing a problem category
 *  (Array, Dynamic Programming, etc.). Curated topics ship from the
 *  catalog with stable slug-style ids; user-defined topics use UUIDs
 *  and `isCustom: true`. */
export interface Topic {
  readonly id: TopicId;
  name: string;
  description?: string;
  isCustom: boolean;
  readonly createdAt: string;
  updatedAt: string;
}
