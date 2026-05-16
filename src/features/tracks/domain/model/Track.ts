import type { TrackGroup } from "./TrackGroup";
import type { TrackId } from "@shared/ids";

export interface Track {
  readonly id: TrackId;
  name: string;
  description?: string;
  /** Whether the queue draws problems from this track. */
  enabled: boolean;
  /** Curated tracks are protected from user delete/rename. */
  isCurated: boolean;
  /** Ordered groups in this track. Storage order is translated into array order. */
  groups: ReadonlyArray<TrackGroup>;
  readonly createdAt: string;
  updatedAt: string;
}
