import { SurfaceCard } from "@design-system/atoms";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { asTrackId } from "@shared/ids";
import { useMemo, useState } from "react";

import { getTrackProgress } from "../../domain/model";
import { useTracksUiStore } from "../store/tracksUiStore";

import type { Track } from "../../domain/model";

// ─── OtherTrackCard ───────────────────────────────────────────────────────────

function OtherTrackCard({
  track,
}: {
  track: Track;
}) {
  const progress = getTrackProgress(track);

  return (
    <Box sx={theme => ({ p: 2, border: `1px solid ${theme.palette.divider}`, borderRadius: 1 })}>
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2}>
        <Stack sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="body1" fontWeight={500}>{track.name}</Typography>
          {track.description ? (
            <Typography variant="body2" color="text.secondary">{track.description}</Typography>
          ) : null}
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, fontVariantNumeric: "tabular-nums" }}>
            {progress.totalQuestions > 0
              ? `${progress.completedQuestions} of ${progress.totalQuestions} completed`
              : "Empty track"}
          </Typography>
        </Stack>
        <Button
          size="small"
          variant="outlined"
          onClick={() => useTracksUiStore.getState().dispatchIntent({ type: "SWITCH_TRACK", trackId: asTrackId(track.id) })}
        >
          Set Active
        </Button>
      </Stack>
      {progress.totalQuestions > 0 ? (
        <LinearProgress variant="determinate" value={progress.completionPercent} sx={{ mt: 1.5, height: 4, borderRadius: 2 }} />
      ) : null}
    </Box>
  );
}

// ─── OtherTracksSection ───────────────────────────────────────────────────────

export function OtherTracksSection() {
  const tracks        = useTracksUiStore(s => s.tracks);
  const activeTrack   = useTracksUiStore(s => s.activeTrack);
  const [expanded, setExpanded] = useState(false);
  const otherTracks   = useMemo(
    () => tracks.filter((t: Track) => t.enabled && t.id !== activeTrack?.id),
    [tracks, activeTrack?.id],
  );

  return (
    <SurfaceCard sx={{ p: 3 }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: expanded ? 2 : 0 }}
      >
        <Typography variant="subtitle1">Other tracks · {otherTracks.length}</Typography>
        <Button size="small" onClick={() => setExpanded(e => !e)}>
          {expanded ? "Hide" : "Show"}
        </Button>
      </Stack>

      {expanded ? (
        <Stack spacing={1.5}>
          {otherTracks.map(track => (
            <OtherTrackCard
              key={track.id}
              track={track}
            />
          ))}
          <Tooltip title="Coming next" arrow>
            <span>
              <Button disabled variant="outlined" sx={{ mt: 1 }}>+ New Track…</Button>
            </span>
          </Tooltip>
        </Stack>
      ) : null}
    </SurfaceCard>
  );
}
