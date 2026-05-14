import type { TrackId } from "@shared/ids";

export interface Track {
  readonly id: TrackId;
  name: string;
  description?: string;
  /** Whether the queue draws problems from this track. */
  enabled: boolean;
  /** Curated tracks are protected from user delete/rename. */
  isCurated: boolean;
  /** Position in the user-facing track list; lower comes first. */
  orderIndex?: number;
  readonly createdAt: string;
  updatedAt: string;
}
