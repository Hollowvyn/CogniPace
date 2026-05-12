/**
 * Topic aggregate — first-class entity representing a problem category
 * (Array, Dynamic Programming, Graph, etc.). Replaces the loose `string[]`
 * topics field that lived on Problem in v6.
 *
 * Curated topics ship from `src/data/catalog/topicsSeed.ts` with stable
 * slug-style ids ("array", "dynamic-programming"). Users may add custom
 * topics tagged `isCustom: true`; those use UUIDs and are immediately
 * usable for assignment.
 */
import type { TopicId } from "@shared/ids";

export interface Topic {
  readonly id: TopicId;
  name: string;
  description?: string;
  isCustom: boolean;
  readonly createdAt: string;
  updatedAt: string;
}
