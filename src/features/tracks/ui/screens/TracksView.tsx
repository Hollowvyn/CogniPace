import { SurfaceCard } from "@design-system/atoms";
import Button from "@mui/material/Button";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useEffect } from "react";

import { ActiveTrackSection } from "../components/ActiveTrackSection";
import { OtherTracksSection } from "../components/OtherTracksSection";
import { useTracksAutoRefresh, useTracksUiStore } from "../store/tracksUiStore";

import type { Problem } from "@features/problems";
import type { ProblemTableCommands } from "@features/problems/ui/components/problemsTable";

export function TracksView(props: {
  onCreateProblem?: () => void;
  onEditProblem?: (problem: Problem) => void;
  problemCommands?: ProblemTableCommands;
}) {
  const activeTrack = useTracksUiStore((s) => s.activeTrack);
  const tracks = useTracksUiStore((s) => s.tracks) ?? [];
  const isLoading = useTracksUiStore((s) => s.isLoading);
  const error = useTracksUiStore((s) => s.error);
  const load = useTracksUiStore((s) => s.load);

  useEffect(() => {
    void load();
  }, [load]);
  useTracksAutoRefresh();

  if (error) {
    return (
      <SurfaceCard sx={{ p: 3 }}>
        <Typography variant="h6" color="error">
          Failed to load tracks
        </Typography>
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
      <SurfaceCard
        action={
          props.onCreateProblem ? (
            <Button
              size="small"
              variant="outlined"
              onClick={props.onCreateProblem}
            >
              Add problem
            </Button>
          ) : null
        }
        title="No tracks yet"
        sx={{ p: 3 }}
      >
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Start by activating a curated track or importing a custom one.
        </Typography>
      </SurfaceCard>
    );
  }

  return (
    <Stack spacing={3}>
      {activeTrack ? (
        <ActiveTrackSection
          onCreateProblem={props.onCreateProblem}
          onEditProblem={props.onEditProblem}
          problemCommands={props.problemCommands}
        />
      ) : (
        <NoActiveTrackCard onCreateProblem={props.onCreateProblem} />
      )}
      <OtherTracksSection />
    </Stack>
  );
}

function NoActiveTrackCard(props: { onCreateProblem?: () => void }) {
  return (
    <SurfaceCard
      action={
        props.onCreateProblem ? (
          <Button
            size="small"
            variant="outlined"
            onClick={props.onCreateProblem}
          >
            Add problem
          </Button>
        ) : null
      }
      title="No active track"
      sx={{ p: 3 }}
    >
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        Pick a track below to focus your queue.
      </Typography>
    </SurfaceCard>
  );
}
