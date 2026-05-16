import { SurfaceCard } from "@design-system/atoms";
import { buildStudyStateView } from "@features/app-shell/domain/policy/hydrate";
import { ProblemsTable, type ProblemRowData } from "@features/problems/ui/components/problemsTable";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import { asTrackGroupId, asTrackId } from "@shared/ids";
import { useMemo } from "react";

import { selectActiveGroupId } from "../store/tracksSelectors";
import { useTracksUiStore } from "../store/tracksUiStore";

import type { TrackGroupView, TrackView } from "../../domain/model";
import type { Problem, ProblemView } from "@features/problems/domain/model";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function rollupCompletion(track: TrackView): { completed: number; total: number } {
  return track.groups.reduce(
    (acc, group) => ({
      completed: acc.completed + group.completedCount,
      total: acc.total + group.totalCount,
    }),
    { completed: 0, total: 0 },
  );
}

function hydrateGroupRows(
  group: TrackGroupView,
  libraryBySlug: Map<string, Problem>,
): ProblemRowData[] {
  const now = new Date();
  return group.problems.map((problemView: ProblemView) => {
    const richProblem = libraryBySlug.get(problemView.slug);
    return {
      view: problemView,
      studyState: buildStudyStateView({
        studyState: richProblem?.studyState ?? null,
        now,
        targetRetention: 0.85,
      }),
      trackMemberships: [],
      suspended: richProblem?.studyState?.suspended ? ("manual" as const) : undefined,
    };
  });
}

// ─── TabLabel ────────────────────────────────────────────────────────────────

function TabLabel({ name, completed, total }: { name: string; completed: number; total: number }) {
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

function TrackBody() {
  const activeTrack    = useTracksUiStore(s => s.activeTrack);
  const library        = useTracksUiStore(s => s.library);
  const activeGroupId  = useTracksUiStore(selectActiveGroupId);
  const libraryBySlug  = useMemo(
    () => new Map(library.map(p => [p.slug, p])),
    [library],
  );

  const activeGroup =
    activeTrack?.groups.find(g => g.id === activeGroupId) ?? activeTrack?.groups[0];

  const rows = useMemo(
    () => (activeGroup ? hydrateGroupRows(activeGroup, libraryBySlug) : []),
    [activeGroup, libraryBySlug],
  );

  if (!activeTrack) return null;

  const showTabs = activeTrack.groups.length > 1;

  return (
    <Stack spacing={2}>
      {showTabs ? (
        <Tabs
          value={activeGroup?.id ?? false}
          onChange={(_, next) => {
            if (typeof next === "string" && next) {
              useTracksUiStore.getState().dispatchIntent({ type: "SELECT_TRACK_GROUP", groupId: asTrackGroupId(next) });
            }
          }}
          variant="scrollable"
          scrollButtons="auto"
        >
          {activeTrack.groups.map(group => (
            <Tab
              key={group.id}
              value={group.id}
              label={
                <TabLabel
                  name={group.name}
                  completed={group.completedCount}
                  total={group.totalCount}
                />
              }
            />
          ))}
        </Tabs>
      ) : null}

      <ProblemsTable rows={rows} variant="tracks" />
    </Stack>
  );
}

// ─── ActiveTrackSection ───────────────────────────────────────────────────────

export function ActiveTrackSection() {
  const activeTrack         = useTracksUiStore(s => s.activeTrack);
  const activeTrackDueCount = useTracksUiStore(s => s.activeTrackDueCount);
  const tracks              = useTracksUiStore(s => s.tracks);
  const activeTrackId       = useTracksUiStore(s => s.activeTrackId);
  const otherEnabledTracks  = useMemo(
    () => tracks.filter(t => t.enabled && t.id !== activeTrackId),
    [tracks, activeTrackId],
  );

  if (!activeTrack) return null;

  const rollup  = rollupCompletion(activeTrack);
  const percent = rollup.total > 0 ? Math.round((rollup.completed / rollup.total) * 100) : 0;

  return (
    <SurfaceCard sx={{ p: 3 }}>
      <Stack spacing={0.5} sx={{ mb: 2 }}>
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

      {rollup.total > 0 ? (
        <Stack spacing={0.75} sx={{ mb: 2 }}>
          <LinearProgress variant="determinate" value={percent} sx={{ height: 6, borderRadius: 3 }} />
          <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
            {rollup.completed} / {rollup.total} completed
            {activeTrackDueCount > 0 ? ` · ${activeTrackDueCount} due for review` : ""}
          </Typography>
        </Stack>
      ) : null}

      {otherEnabledTracks.length > 0 ? (
        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          {otherEnabledTracks.slice(0, 3).map(track => (
            <Typography
              key={track.id}
              variant="caption"
              color="text.secondary"
              sx={{ cursor: "pointer", textDecoration: "underline" }}
              onClick={() => useTracksUiStore.getState().dispatchIntent({ type: "SWITCH_TRACK", trackId: asTrackId(track.id) })}
            >
              {track.name}
            </Typography>
          ))}
        </Stack>
      ) : null}

      <TrackBody />
    </SurfaceCard>
  );
}
