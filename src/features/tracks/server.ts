export type {
  Track,
  TrackGroup,
  TrackMembership,
  TrackProgress,
} from "./domain/model";
export {
  getActiveTrackGroup,
  getGroupCompletedCount,
  getGroupTotalCount,
  getNextTrackProblem,
  getTrackProgress,
} from "./domain/model";

export {
  createTrackHandler,
  updateTrackHandler,
  deleteTrackHandler,
  setActiveTrackHandler,
  type CreateTrackPayload,
  type UpdateTrackPayload,
  type DeleteTrackPayload,
} from "./messaging/handlers";

export { buildTrackCatalogSeed } from "./data/seed";

export {
  getActiveTrackId,
  saveActiveTrackId,
} from "./data/datasource/TrackDataSource";

export {
  toTrack,
  toTrackGroup,
  listTracks,
  getTrack,
  getTrackHeader,
  getTrackGroup,
  createTrack,
  updateTrack,
  deleteTrack,
  setTrackOrder,
  addGroup,
  updateGroup,
  removeGroup,
  reorderGroups,
  addProblemToGroup,
  removeProblemFromGroup,
  reorderGroupProblems,
  listMembershipsForSlug,
  seedCatalogTracks,
} from "./data/datasource/TrackDataSource";
