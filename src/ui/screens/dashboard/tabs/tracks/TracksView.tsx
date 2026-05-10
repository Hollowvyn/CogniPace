/**
 * Tracks tab — replaces the legacy CoursesView.
 *
 * Layout:
 *   ── Active StudySet hero ─────────────────────────────────
 *      header: name + Switch dropdown
 *      tabs:   one per SetGroup (every tab clickable; ratio in label)
 *      body:   shared ProblemsTable in `tracks` variant
 *   ── Other tracks (collapsed disclosure) ──────────────────
 *      "Show ▾" reveals cards for inactive enabled tracks
 *      "+ New Track…" disabled with a "Coming next" tooltip
 *
 * Prereq locks were dropped per Phase G — completion is informational
 * (`Topic · 5/10` ratio in the tab label) and every tab is clickable.
 */
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
import React, { useMemo, useState } from "react";

import {
  resetProblemSchedule,
  suspendProblem,
} from "../../../../../data/repositories/v7ActionRepository";
import {
  asSetGroupId,
  asStudySetId,
  type ProblemSlug,
  type SetGroupId,
  type StudySetId,
} from "../../../../../domain/common/ids";
import { SurfaceCard } from "../../../../components";
import {
  ProblemsTable,
  type ProblemRowData,
} from "../../../../components/problemsTable";
import { EditProblemModal } from "../library/EditProblemModal";

import type { ActiveFocus } from "../../../../../domain/active-focus/model";
import type {
  AppShellPayload,
  ProblemView,
  StudySetView,
} from "../../../../../domain/views";

interface TracksViewProps {
  payload: AppShellPayload | null;
  onOpenProblem: (target: { slug: string }) => Promise<void>;
  onEnablePremium: () => Promise<void>;
  onSetActiveFocus: (focus: ActiveFocus) => Promise<void>;
  onRefresh?: () => Promise<void>;
}

/**
 * Lookup table for hydrating Track rows. Tracks tab gets `ProblemView` per
 * group from `studySetView.groups[].problems` but no study state — that
 * comes from `payload.library` keyed by slug.
 */
interface SlugStudyData {
  studyState: ProblemRowData["studyState"];
  suspended?: ProblemRowData["suspended"];
}

export function TracksView(props: TracksViewProps) {
  const studySetViews = useMemo(() => props.payload?.studySetViews ?? [], [props.payload?.studySetViews]);
  const settings = props.payload?.settings;
  const library = useMemo(() => props.payload?.library ?? [], [props.payload?.library]);
  const activeFocus = settings?.activeFocus ?? null;

  // Single source of truth: the persisted activeFocus. Click handlers
  // dispatch a mutation; storage subscription propagates the new payload
  // and re-renders this view.
  const activeStudySetView = useMemo<StudySetView | null>(() => {
    if (activeFocus?.kind !== "studySet") return null;
    return studySetViews.find((view) => view.id === activeFocus.id) ?? null;
  }, [activeFocus, studySetViews]);

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

  // Determine the user's chosen group within the active StudySet, derived
  // from the persisted activeFocus.groupId.
  const activeGroupId = useMemo<SetGroupId | null>(() => {
    if (!activeStudySetView || activeStudySetView.kind !== "grouped") {
      return null;
    }
    if (
      activeFocus?.kind === "studySet" &&
      activeFocus.id === activeStudySetView.id
    ) {
      const saved = activeFocus.groupId;
      if (saved && activeStudySetView.groups.some((g) => g.id === saved)) {
        return saved as SetGroupId;
      }
    }
    return asSetGroupId(activeStudySetView.groups[0]?.id ?? "");
  }, [activeStudySetView, activeFocus]);

  const editingRow = useMemo(() => {
    if (!editingSlug) return null;
    return library.find((row) => row.view.slug === editingSlug) ?? null;
  }, [editingSlug, library]);

  if (studySetViews.length === 0) {
    return (
      <SurfaceCard sx={{ p: 3 }}>
        <Typography variant="h6">No tracks yet</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Start by activating a curated track or importing a custom one.
        </Typography>
      </SurfaceCard>
    );
  }

  const otherStudySets = studySetViews.filter(
    (set) =>
      set.enabled &&
      (!activeStudySetView || set.id !== activeStudySetView.id),
  );

  const switchTrack = (id: StudySetId) => {
    void props.onSetActiveFocus({ kind: "studySet", id });
  };
  const switchGroup = (groupId: SetGroupId) => {
    if (!activeStudySetView) return;
    void props.onSetActiveFocus({
      kind: "studySet",
      id: asStudySetId(activeStudySetView.id),
      groupId,
    });
  };

  const handleEdit = (slug: ProblemSlug) => setEditingSlug(slug);
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
      {activeStudySetView ? (
        <ActiveStudySetSection
          studySet={activeStudySetView}
          options={studySetViews}
          activeGroupId={activeGroupId}
          slugDataMap={slugDataMap}
          dueCount={countDueInSet(activeStudySetView, slugDataMap)}
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
            Other tracks · {otherStudySets.length}
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
            {otherStudySets.map((set) => (
              <OtherTrackCard
                key={set.id}
                studySet={set}
                onSetActive={() => switchTrack(asStudySetId(set.id))}
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

function rollupCompletion(set: StudySetView): CompletionRollup {
  if (set.kind !== "grouped") {
    return { completed: 0, total: set.problems.length };
  }
  return set.groups.reduce<CompletionRollup>(
    (acc, group) => ({
      completed: acc.completed + group.completedCount,
      total: acc.total + group.totalCount,
    }),
    { completed: 0, total: 0 },
  );
}

function countDueInSet(
  set: StudySetView,
  slugDataMap: Map<string, SlugStudyData>,
): number {
  const slugs = new Set<string>();
  if (set.kind === "grouped") {
    for (const group of set.groups) {
      for (const problem of group.problems) slugs.add(problem.slug);
    }
  } else {
    for (const problem of set.problems) slugs.add(problem.slug);
  }
  let count = 0;
  for (const slug of slugs) {
    if (slugDataMap.get(slug)?.studyState?.isDue) count += 1;
  }
  return count;
}

interface ActiveStudySetSectionProps {
  studySet: StudySetView;
  options: StudySetView[];
  activeGroupId: SetGroupId | null;
  slugDataMap: Map<string, SlugStudyData>;
  dueCount: number;
  onSwitch: (id: StudySetId) => void;
  onSwitchGroup: (groupId: SetGroupId) => void;
  onEditProblem: (slug: ProblemSlug) => void;
  onSuspendProblem: (slug: ProblemSlug, suspend: boolean) => void | Promise<void>;
  onResetSchedule: (slug: ProblemSlug) => void | Promise<void>;
  onEnablePremium: () => void;
}

function ActiveStudySetSection(props: ActiveStudySetSectionProps) {
  const {
    studySet,
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
    (option) => option.enabled && option.id !== studySet.id,
  );
  const rollup = rollupCompletion(studySet);
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
            {studySet.name}
          </Typography>
          {studySet.description ? (
            <Typography variant="body2" color="text.secondary">
              {studySet.description}
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
                  onSwitch(asStudySetId(next));
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

      {studySet.kind === "grouped" ? (
        <GroupedStudySetBody
          studySet={studySet}
          activeGroupId={activeGroupId}
          slugDataMap={slugDataMap}
          onSwitchGroup={onSwitchGroup}
          onEditProblem={onEditProblem}
          onSuspendProblem={onSuspendProblem}
          onResetSchedule={onResetSchedule}
          onEnablePremium={onEnablePremium}
        />
      ) : (
        <FlatStudySetBody
          studySet={studySet}
          slugDataMap={slugDataMap}
          onEditProblem={onEditProblem}
          onSuspendProblem={onSuspendProblem}
          onResetSchedule={onResetSchedule}
          onEnablePremium={onEnablePremium}
        />
      )}
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

function GroupedStudySetBody({
  studySet,
  activeGroupId,
  slugDataMap,
  onSwitchGroup,
  onEditProblem,
  onSuspendProblem,
  onResetSchedule,
  onEnablePremium,
}: {
  studySet: Extract<StudySetView, { kind: "grouped" }>;
  activeGroupId: SetGroupId | null;
  slugDataMap: Map<string, SlugStudyData>;
  onSwitchGroup: (groupId: SetGroupId) => void;
  onEditProblem: (slug: ProblemSlug) => void;
  onSuspendProblem: (slug: ProblemSlug, suspend: boolean) => void | Promise<void>;
  onResetSchedule: (slug: ProblemSlug) => void | Promise<void>;
  onEnablePremium: () => void;
}) {
  const activeGroup =
    studySet.groups.find((g) => g.id === activeGroupId) ?? studySet.groups[0];

  const tabValue = activeGroup?.id ?? false;

  const rows = useMemo(
    () => (activeGroup ? hydrateRows(activeGroup.problems, slugDataMap) : []),
    [activeGroup, slugDataMap],
  );

  return (
    <Stack spacing={2}>
      <Tabs
        value={tabValue}
        onChange={(_, next) => {
          if (typeof next === "string" && next) {
            onSwitchGroup(asSetGroupId(next));
          }
        }}
        variant="scrollable"
        scrollButtons="auto"
      >
        {studySet.groups.map((group) => (
          <Tab
            key={group.id}
            value={group.id}
            label={<TabLabel name={group.name} completed={group.completedCount} total={group.totalCount} />}
          />
        ))}
      </Tabs>

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

function FlatStudySetBody({
  studySet,
  slugDataMap,
  onEditProblem,
  onSuspendProblem,
  onResetSchedule,
  onEnablePremium,
}: {
  studySet: Extract<StudySetView, { kind: "flat" } | { kind: "derived" }>;
  slugDataMap: Map<string, SlugStudyData>;
  onEditProblem: (slug: ProblemSlug) => void;
  onSuspendProblem: (slug: ProblemSlug, suspend: boolean) => void | Promise<void>;
  onResetSchedule: (slug: ProblemSlug) => void | Promise<void>;
  onEnablePremium: () => void;
}) {
  const rows = useMemo(
    () => hydrateRows(studySet.problems, slugDataMap),
    [studySet.problems, slugDataMap],
  );

  return (
    <Stack spacing={2}>
      {studySet.kind === "derived" ? (
        <Typography variant="body2" color="text.secondary">
          {studySet.filterDescription || "Derived from filter"}
        </Typography>
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
  studySet,
  onSetActive,
}: {
  studySet: StudySetView;
  onSetActive: () => void;
}) {
  const rollup = rollupCompletion(studySet);
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
            {studySet.name}
          </Typography>
          {studySet.description ? (
            <Typography variant="body2" color="text.secondary">
              {studySet.description}
            </Typography>
          ) : null}
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mt: 0.5, fontVariantNumeric: "tabular-nums" }}
          >
            {rollup.total > 0
              ? `${rollup.completed} of ${rollup.total} completed`
              : "Filter-based track"}
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
