import { api } from "@app/api";

import type { Track } from "../../domain/model";
import type { TrackId } from "@shared/ids";


export const tracksRepository = {
  getTracks: () =>
    api.getTracks({}) as Promise<{ tracks: Track[]; activeTrackId: TrackId | null; activeTrack: Track | null }>,

  getActiveTrack: () =>
    api.getActiveTrack({}) as Promise<Track | null>,

  setActiveTrack: (trackId: TrackId | null) =>
    api.setActiveTrack({ trackId }),
};

export type TracksRepository = typeof tracksRepository;
