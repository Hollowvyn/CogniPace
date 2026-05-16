import { api } from "@app/api";

import type { TrackView } from "../../domain/model";
import type { TrackId } from "@shared/ids";


export const tracksRepository = {
  getTracks: () =>
    api.getTracks({}) as Promise<{ tracks: TrackView[]; activeTrackId: TrackId | null; activeTrack: TrackView | null }>,

  getActiveTrack: () =>
    api.getActiveTrack({}) as Promise<TrackView | null>,

  setActiveTrack: (trackId: TrackId | null) =>
    api.setActiveTrack({ trackId }),
};

export type TracksRepository = typeof tracksRepository;
