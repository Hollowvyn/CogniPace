import { SurfaceCard } from "@design-system/atoms";
import { TrackProblemTable } from "@features/problems/ui/components/problemsTable";
import Button from "@mui/material/Button";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import { asTrackGroupId, asTrackId } from "@shared/ids";
import { useMemo } from "react";

import {
  getGroupCompletedCount,
  getGroupTotalCount,
  getTrackProgress,
} from "../../domain/model";
import { selectActiveGroupId } from "../store/tracksSelectors";
import { useTracksUiStore } from "../store/tracksUiStore";

import type { Problem } from "@features/problems";
import type { ProblemTableCommands } from "@features/problems/ui/components/problemsTable";

// ─── TabLabel ────────────────────────────────────────────────────────────────

function TabLabel({
  name,
  completed,
  total,
}: {
  name: string;
  completed: number;
  total: number;
}) {
  const isComplete = total > 0 && completed === total;
  const ratio = total > 0 ? `${completed}/${total}` : "";
  return (
    <Stack direction="row" spacing={0.75} alignItems="baseline">
      <span>{name}</span>
      {ratio ? (
        <Typography
          component="span"
          variant="caption"
          sx={{
            fontVariantNumeric: "tabular-nums",
            color: isComplete ? "success.main" : "text.secondary",
            opacity: 0.85,
          }}
        >
          · {ratio}
        </Typography>
      ) : null}
    </Stack>
  );
}

// ─── TrackBody ───────────────────────────────────────────────────────────────

function TrackBody(props: {
  onEditProblem?: (problem: Problem) => void;
  problemCommands?: ProblemTableCommands;
}) {
  const activeTrack = useTracksUiStore((s) => s.activeTrack);
  const activeGroupId = useTracksUiStore(selectActiveGroupId);
  const settings = useTracksUiStore((s) => s.settings);

  const activeGroup =
    activeTrack?.groups.find((g) => g.id === activeGroupId) ??
    activeTrack?.groups[0];

  if (!activeTrack) return null;

  const showTabs = activeTrack.groups.length > 1;

  return (
    <Stack spacing={2}>
      {showTabs ? (
        <Tabs
          value={activeGroup?.id ?? false}
          onChange={(_, next) => {
            if (typeof next === "string" && next) {
              useTracksUiStore.getState().dispatchIntent({
                type: "SELECT_TRACK_GROUP",
                groupId: asTrackGroupId(next),
              });
            }
          }}
          variant="scrollable"
          scrollButtons="auto"
        >
          {activeTrack.groups.map((group) => {
            const completedCount = getGroupCompletedCount(group);
            const totalCount = getGroupTotalCount(group);
            return (
              <Tab
                key={group.id}
                value={group.id}
                label={
                  <TabLabel
                    name={group.name ?? "Untitled Group"}
                    completed={completedCount}
                    total={totalCount}
                  />
                }
              />
            );
          })}
        </Tabs>
      ) : null}

      <TrackProblemTable
        commands={props.problemCommands}
        onEditProblem={props.onEditProblem}
        problems={activeGroup?.problems ?? []}
        settings={settings}
      />
    </Stack>
  );
}

// ─── ActiveTrackSection ───────────────────────────────────────────────────────

export function ActiveTrackSection(props: {
  onCreateProblem?: () => void;
  onEditProblem?: (problem: Problem) => void;
  problemCommands?: ProblemTableCommands;
}) {
  const activeTrack = useTracksUiStore((s) => s.activeTrack);
  const tracks = useTracksUiStore((s) => s.tracks);
  const otherEnabledTracks = useMemo(
    () => tracks.filter((t) => t.enabled && t.id !== activeTrack?.id),
    [tracks, activeTrack?.id]
  );

  if (!activeTrack) return null;

  const progress = getTrackProgress(activeTrack);

  return (
    <SurfaceCard sx={{ p: 3 }}>
      <Stack
        alignItems="flex-start"
        direction="row"
        justifyContent="space-between"
        spacing={1.5}
        sx={{ mb: 2 }}
      >
        <Stack spacing={0.5}>
          <Typography variant="overline" color="text.secondary">
            Active track
          </Typography>
          <Typography variant="h5" component="h2">
            {activeTrack.name}
          </Typography>
          {activeTrack.description ? (
            <Typography variant="body2" color="text.secondary">
              {activeTrack.description}
            </Typography>
          ) : null}
        </Stack>
        {props.onCreateProblem ? (
          <Button
            size="small"
            variant="outlined"
            onClick={props.onCreateProblem}
          >
            Add problem
          </Button>
        ) : null}
      </Stack>

      {progress.totalQuestions > 0 ? (
        <Stack spacing={0.75} sx={{ mb: 2 }}>
          <LinearProgress
            variant="determinate"
            value={progress.completionPercent}
            sx={{ height: 6, borderRadius: 3 }}
          />
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontVariantNumeric: "tabular-nums" }}
          >
            {progress.completedQuestions} / {progress.totalQuestions} completed
            {progress.dueCount > 0
              ? ` · ${progress.dueCount} due for review`
              : ""}
          </Typography>
        </Stack>
      ) : null}

      {otherEnabledTracks.length > 0 ? (
        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          {otherEnabledTracks.slice(0, 3).map((track) => (
            <Typography
              key={track.id}
              variant="caption"
              color="text.secondary"
              sx={{ cursor: "pointer", textDecoration: "underline" }}
              onClick={() =>
                useTracksUiStore.getState().dispatchIntent({
                  type: "SWITCH_TRACK",
                  trackId: asTrackId(track.id),
                })
              }
            >
              {track.name}
            </Typography>
          ))}
        </Stack>
      ) : null}

      <TrackBody
        onEditProblem={props.onEditProblem}
        problemCommands={props.problemCommands}
      />
    </SurfaceCard>
  );
}
