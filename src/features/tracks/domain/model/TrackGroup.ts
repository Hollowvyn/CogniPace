import type { TopicId, TrackGroupId, TrackId } from "@shared/ids";

export interface TrackGroup {
  readonly id: TrackGroupId;
  readonly trackId: TrackId;
  /** Optional FK → Topic registry when the group represents a curated topic. */
  topicId?: TopicId;
  /** Display label override; falls back to the topic name (when topicId is set)
   * or the parent track's name. */
  name?: string;
  description?: string;
  /** Sort order within the parent track. */
  orderIndex: number;
}
