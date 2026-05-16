import { api } from "@app/api";

import type { Track } from "../../domain/model";
import type { UserSettings } from "@features/settings";
import type { TrackId } from "@shared/ids";


export const tracksRepository = {
  getTracks: () =>
    api.getTracks({}) as Promise<{
      tracks: Track[];
      activeTrack: Track | null;
      settings: UserSettings;
    }>,

  getActiveTrack: () =>
    api.getActiveTrack({}) as Promise<Track | null>,

  setActiveTrack: (trackId: TrackId | null) =>
    api.setActiveTrack({ trackId }),
};

export type TracksRepository = typeof tracksRepository;
