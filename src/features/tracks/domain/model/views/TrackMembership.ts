import type { TrackGroupId, TrackId } from "@shared/ids";

export interface TrackMembership {
  trackId: TrackId;
  trackName: string;
  groupId?: TrackGroupId;
  groupName?: string;
}
