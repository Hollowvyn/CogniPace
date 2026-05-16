import { SurfaceCard } from "@design-system/atoms";
import { EditProblemModalConnected } from "@features/problems/ui/components/EditProblemModalConnected";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import React, { useEffect } from "react";

import { useTracksUiStore, useTracksAutoRefresh } from "../store/tracksUiStore";

import { ActiveTrackSection } from "./ActiveTrackSection";
import { OtherTracksSection } from "./OtherTracksSection";

export function TracksView() {
  const activeTrack = useTracksUiStore(s => s.activeTrack);
  const tracks      = useTracksUiStore(s => s.tracks) ?? [];
  const isLoading   = useTracksUiStore(s => s.isLoading);
  const error       = useTracksUiStore(s => s.error);
  const load        = useTracksUiStore(s => s.load);

  useEffect(() => { void load(); }, [load]);
  useTracksAutoRefresh();

  if (error) {
    return (
      <SurfaceCard sx={{ p: 3 }}>
        <Typography variant="h6" color="error">Failed to load tracks</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {error}
        </Typography>
      </SurfaceCard>
    );
  }

  if (isLoading && tracks.length === 0) {
    return <LinearProgress />;
  }

  if (tracks.length === 0) {
    return (
      <SurfaceCard sx={{ p: 3 }}>
        <Typography variant="h6">No tracks yet</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Start by activating a curated track or importing a custom one.
        </Typography>
      </SurfaceCard>
    );
  }

  return (
    <Stack spacing={3}>
      {activeTrack
        ? <ActiveTrackSection />
        : <NoActiveTrackCard />
      }
      <OtherTracksSection />
      <EditProblemModalConnected />
    </Stack>
  );
}

function NoActiveTrackCard() {
  return (
    <SurfaceCard sx={{ p: 3 }}>
      <Typography variant="h6">No active track</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        Pick a track below to focus your queue.
      </Typography>
    </SurfaceCard>
  );
}
