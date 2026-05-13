/**
 * Tracks tab — the dashboard's curated/user track surface.
 *
 * Layout:
 *   ── Active Track hero ────────────────────────────────────
 *      header: name + Switch dropdown
 *      tabs:   one per TrackGroup (every tab clickable; ratio in label);
 *              single-group tracks render without the Tabs bar.
 *      body:   shared ProblemsTable in `tracks` variant
 *   ── Other tracks (collapsed disclosure) ──────────────────
 *      "Show ▾" reveals cards for inactive enabled tracks
 *      "+ New Track…" disabled with a "Coming next" tooltip
 *
 * Slim charter shape: every Track is grouped; "flat" is a Track with
 * a single group. Completion is informational (`Topic · 5/10` ratio in
 * the tab label) and every tab is clickable.
 */
import { SurfaceCard } from "@design-system/atoms";
import {
  ProblemsTable,
  type ProblemRowData,
 ProblemView } from "@features/problems";
import { EditProblemModal } from "@features/problems/ui/screens/library/EditProblemModal";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import LinearProgress from "@mui/material/LinearProgress";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import {
  asTrackGroupId,
  asTrackId,
  type ProblemSlug,
  type TrackGroupId,
  type TrackId,
} from "@shared/ids";
import React, { useMemo, useState } from "react";

import {
  resetProblemSchedule,
  suspendProblem,
} from "../../../../data/repositories/v7ActionRepository";

import type { ActiveFocus, TrackView } from "../../domain/model";
import type { AppShellPayload } from "@features/app-shell";

interface TracksViewProps {
  payload: AppShellPayload | null;
  onOpenProblem: (target: { slug: string }) => Promise<void>;
  onEnablePremium: () => Promise<void>;
  onSetActiveFocus: (focus: ActiveFocus) => Promise<void>;
  onRefresh?: () => Promise<void>;
}

/**
 * Lookup table for hydrating Track rows. Tracks tab gets `ProblemView` per
 * group from `track.groups[].problems` but no study state — that
 * comes from `payload.library` keyed by slug.
 */
interface SlugStudyData {
  studyState: ProblemRowData["studyState"];
  suspended?: ProblemRowData["suspended"];
}

export function TracksView(props: TracksViewProps) {
  const tracks = useMemo(() => props.payload?.tracks ?? [], [props.payload?.tracks]);
  const settings = props.payload?.settings;
  const library = useMemo(() => props.payload?.library ?? [], [props.payload?.library]);
  const activeFocus = settings?.activeFocus ?? null;

  // Single source of truth: the persisted activeFocus. Click handlers
  // dispatch a mutation; storage subscription propagates the new payload
  // and re-renders this view.
  const activeTrack = useMemo<TrackView | null>(() => {
    if (activeFocus?.kind !== "track") return null;
    return tracks.find((view) => view.id === activeFocus.id) ?? null;
  }, [activeFocus, tracks]);

  const [othersExpanded, setOthersExpanded] = useState(false);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);

  // Map slug → study state view + suspended flag for fast hydration in
  // the group/flat bodies.
  const slugDataMap = useMemo(() => {
    const map = new Map<string, SlugStudyData>();
    for (const row of library) {
      map.set(row.view.slug, {
        studyState: row.studyState,
        suspended: row.suspended,
      });
    }
    return map;
  }, [library]);

  // Determine the user's chosen group within the active Track, derived
  // from the persisted activeFocus.groupId. Single-group tracks always
  // pick the lone group.
  const activeGroupId = useMemo<TrackGroupId | null>(() => {
    if (!activeTrack || activeTrack.groups.length === 0) {
      return null;
    }
    if (
      activeFocus?.kind === "track" &&
      activeFocus.id === activeTrack.id
    ) {
      const saved = activeFocus.groupId;
      if (saved && activeTrack.groups.some((g) => g.id === saved)) {
        return saved as TrackGroupId;
      }
    }
    return asTrackGroupId(activeTrack.groups[0]?.id ?? "");
  }, [activeTrack, activeFocus]);

  const editingRow = useMemo(() => {
    if (!editingSlug) return null;
    return library.find((row) => row.view.slug === editingSlug) ?? null;
  }, [editingSlug, library]);

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

  const otherTracks = tracks.filter(
    (set) =>
      set.enabled &&
      (!activeTrack || set.id !== activeTrack.id),
  );

  const switchTrack = (id: TrackId) => {
    void props.onSetActiveFocus({ kind: "track", id });
  };
  const switchGroup = (groupId: TrackGroupId) => {
    if (!activeTrack) return;
    void props.onSetActiveFocus({
      kind: "track",
      id: asTrackId(activeTrack.id),
      groupId,
    });
  };

  const handleEdit = (slug: ProblemSlug) => {
    // Drop focus from the trigger row/menu before opening the modal so
    // MUI's aria-hidden on <main id="app-shell"> never lands while a
    // descendant retains focus (Chrome a11y audit complains otherwise).
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setEditingSlug(slug);
  };
  const handleSuspend = async (slug: ProblemSlug, suspend: boolean) => {
    await suspendProblem({ slug, suspend });
    await props.onRefresh?.();
  };
  const handleReset = async (slug: ProblemSlug) => {
    await resetProblemSchedule({ slug });
    await props.onRefresh?.();
  };

  return (
    <Stack spacing={3}>
      {activeTrack ? (
        <ActiveTrackSection
          track={activeTrack}
          options={tracks}
          activeGroupId={activeGroupId}
          slugDataMap={slugDataMap}
          dueCount={countDueInTrack(activeTrack, slugDataMap)}
          onSwitch={switchTrack}
          onSwitchGroup={switchGroup}
          onEditProblem={handleEdit}
          onSuspendProblem={handleSuspend}
          onResetSchedule={handleReset}
          onEnablePremium={() => void props.onEnablePremium()}
        />
      ) : (
        <SurfaceCard sx={{ p: 3 }}>
          <Typography variant="h6">No active track</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Pick a track below to focus your queue.
          </Typography>
        </SurfaceCard>
      )}

      <SurfaceCard sx={{ p: 3 }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ mb: othersExpanded ? 2 : 0 }}
        >
          <Typography variant="subtitle1">
            Other tracks · {otherTracks.length}
          </Typography>
          <Button
            size="small"
            onClick={() => setOthersExpanded((prev) => !prev)}
          >
            {othersExpanded ? "Hide" : "Show"}
          </Button>
        </Stack>

        {othersExpanded ? (
          <Stack spacing={1.5}>
            {otherTracks.map((track) => (
              <OtherTrackCard
                key={track.id}
                track={track}
                onSetActive={() => switchTrack(asTrackId(track.id))}
              />
            ))}

            <Tooltip title="Coming next" arrow>
              <span>
                <Button disabled variant="outlined" sx={{ mt: 1 }}>
                  + New Track…
                </Button>
              </span>
            </Tooltip>
          </Stack>
        ) : null}
      </SurfaceCard>

      <EditProblemModal
        open={editingSlug !== null}
        problem={editingRow?.view ?? null}
        topicChoices={props.payload?.topicChoices ?? []}
        companyChoices={props.payload?.companyChoices ?? []}
        onClose={() => setEditingSlug(null)}
        onSaved={async () => {
          await props.onRefresh?.();
        }}
      />
    </Stack>
  );
}

interface CompletionRollup {
  completed: number;
  total: number;
}

function rollupCompletion(track: TrackView): CompletionRollup {
  return track.groups.reduce<CompletionRollup>(
    (acc, group) => ({
      completed: acc.completed + group.completedCount,
      total: acc.total + group.totalCount,
    }),
    { completed: 0, total: 0 },
  );
}

function countDueInTrack(
  track: TrackView,
  slugDataMap: Map<string, SlugStudyData>,
): number {
  const slugs = new Set<string>();
  for (const group of track.groups) {
    for (const problem of group.problems) slugs.add(problem.slug);
  }
  let count = 0;
  for (const slug of slugs) {
    if (slugDataMap.get(slug)?.studyState?.isDue) count += 1;
  }
  return count;
}

interface ActiveTrackSectionProps {
  track: TrackView;
  options: TrackView[];
  activeGroupId: TrackGroupId | null;
  slugDataMap: Map<string, SlugStudyData>;
  dueCount: number;
  onSwitch: (id: TrackId) => void;
  onSwitchGroup: (groupId: TrackGroupId) => void;
  onEditProblem: (slug: ProblemSlug) => void;
  onSuspendProblem: (slug: ProblemSlug, suspend: boolean) => void | Promise<void>;
  onResetSchedule: (slug: ProblemSlug) => void | Promise<void>;
  onEnablePremium: () => void;
}

function ActiveTrackSection(props: ActiveTrackSectionProps) {
  const {
    track,
    options,
    activeGroupId,
    dueCount,
    slugDataMap,
    onSwitch,
    onSwitchGroup,
    onEditProblem,
    onSuspendProblem,
    onResetSchedule,
    onEnablePremium,
  } = props;

  const switchOptions = options.filter(
    (option) => option.enabled && option.id !== track.id,
  );
  const rollup = rollupCompletion(track);
  const percent =
    rollup.total > 0 ? Math.round((rollup.completed / rollup.total) * 100) : 0;

  return (
    <SurfaceCard sx={{ p: 3 }}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", md: "flex-start" }}
        spacing={2}
        sx={{ mb: 2 }}
      >
        <Stack spacing={0.5} sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="overline" color="text.secondary">
            Active track
          </Typography>
          <Typography variant="h5" component="h2">
            {track.name}
          </Typography>
          {track.description ? (
            <Typography variant="body2" color="text.secondary">
              {track.description}
            </Typography>
          ) : null}
        </Stack>

        {switchOptions.length > 0 ? (
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel id="track-switch">Switch to</InputLabel>
            <Select
              labelId="track-switch"
              label="Switch to"
              value=""
              onChange={(event) => {
                const next = event.target.value as string;
                if (next) {
                  onSwitch(asTrackId(next));
                }
              }}
            >
              {switchOptions.map((option) => (
                <MenuItem key={option.id} value={option.id}>
                  {option.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        ) : null}
      </Stack>

      {rollup.total > 0 ? (
        <Stack spacing={0.75} sx={{ mb: 2 }}>
          <LinearProgress
            variant="determinate"
            value={percent}
            sx={{ height: 6, borderRadius: 3 }}
          />
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontVariantNumeric: "tabular-nums" }}
          >
            {rollup.completed} / {rollup.total} completed
            {dueCount > 0 ? ` · ${dueCount} due for review` : ""}
          </Typography>
        </Stack>
      ) : null}

      <TrackBody
        track={track}
        activeGroupId={activeGroupId}
        slugDataMap={slugDataMap}
        onSwitchGroup={onSwitchGroup}
        onEditProblem={onEditProblem}
        onSuspendProblem={onSuspendProblem}
        onResetSchedule={onResetSchedule}
        onEnablePremium={onEnablePremium}
      />
    </SurfaceCard>
  );
}

function hydrateRows(
  problems: ProblemView[],
  slugDataMap: Map<string, SlugStudyData>,
): ProblemRowData[] {
  return problems.map((view) => {
    const data = slugDataMap.get(view.slug);
    return {
      view,
      studyState: data?.studyState ?? null,
      trackMemberships: [],
      suspended: data?.suspended,
    };
  });
}

/** Renders the track's groups. Multi-group tracks show a scrollable Tabs
 * bar with one tab per group; single-group tracks omit the Tabs bar and
 * render the lone group's table directly. */
function TrackBody({
  track,
  activeGroupId,
  slugDataMap,
  onSwitchGroup,
  onEditProblem,
  onSuspendProblem,
  onResetSchedule,
  onEnablePremium,
}: {
  track: TrackView;
  activeGroupId: TrackGroupId | null;
  slugDataMap: Map<string, SlugStudyData>;
  onSwitchGroup: (groupId: TrackGroupId) => void;
  onEditProblem: (slug: ProblemSlug) => void;
  onSuspendProblem: (slug: ProblemSlug, suspend: boolean) => void | Promise<void>;
  onResetSchedule: (slug: ProblemSlug) => void | Promise<void>;
  onEnablePremium: () => void;
}) {
  const activeGroup =
    track.groups.find((g) => g.id === activeGroupId) ?? track.groups[0];

  const tabValue = activeGroup?.id ?? false;
  const showTabs = track.groups.length > 1;

  const rows = useMemo(
    () => (activeGroup ? hydrateRows(activeGroup.problems, slugDataMap) : []),
    [activeGroup, slugDataMap],
  );

  return (
    <Stack spacing={2}>
      {showTabs ? (
        <Tabs
          value={tabValue}
          onChange={(_, next) => {
            if (typeof next === "string" && next) {
              onSwitchGroup(asTrackGroupId(next));
            }
          }}
          variant="scrollable"
          scrollButtons="auto"
        >
          {track.groups.map((group) => (
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

      <ProblemsTable
        rows={rows}
        variant="tracks"
        selectable
        onEditProblem={onEditProblem}
        onSuspendProblem={onSuspendProblem}
        onResetSchedule={onResetSchedule}
        onEnablePremium={onEnablePremium}
      />
    </Stack>
  );
}

function OtherTrackCard({
  track,
  onSetActive,
}: {
  track: TrackView;
  onSetActive: () => void;
}) {
  const rollup = rollupCompletion(track);
  const percent =
    rollup.total > 0 ? Math.round((rollup.completed / rollup.total) * 100) : 0;
  return (
    <Box
      sx={(theme) => ({
        p: 2,
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 1,
      })}
    >
      <Stack
        direction="row"
        alignItems="flex-start"
        justifyContent="space-between"
        spacing={2}
      >
        <Stack sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="body1" fontWeight={500}>
            {track.name}
          </Typography>
          {track.description ? (
            <Typography variant="body2" color="text.secondary">
              {track.description}
            </Typography>
          ) : null}
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mt: 0.5, fontVariantNumeric: "tabular-nums" }}
          >
            {rollup.total > 0
              ? `${rollup.completed} of ${rollup.total} completed`
              : "Empty track"}
          </Typography>
        </Stack>
        <Button size="small" variant="outlined" onClick={onSetActive}>
          Set Active
        </Button>
      </Stack>
      {rollup.total > 0 ? (
        <LinearProgress
          variant="determinate"
          value={percent}
          sx={{ mt: 1.5, height: 4, borderRadius: 2 }}
        />
      ) : null}
    </Box>
  );
}

/** `Topic · 5/10` style label. Completed tabs render the ratio in success
 * tone, the active tab gets accent. */
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
  const ratioColor = isComplete ? "success.main" : "text.secondary";
  return (
    <Stack direction="row" spacing={0.75} alignItems="baseline">
      <span>{name}</span>
      {ratio ? (
        <Typography
          component="span"
          variant="caption"
          sx={{
            fontVariantNumeric: "tabular-nums",
            color: ratioColor,
            opacity: 0.85,
          }}
        >
          · {ratio}
        </Typography>
      ) : null}
    </Stack>
  );
}
