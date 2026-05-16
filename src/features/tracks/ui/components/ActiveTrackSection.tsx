import { SurfaceCard } from "@design-system/atoms";
import { listEditedFields } from "@features/problems";
import { ProblemsTable, type ProblemRowData } from "@features/problems/ui/components/problemsTable";
import { getStudyStateSummary } from "@libs/fsrs/studyState";
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

import type { TrackGroup } from "../../domain/model";
import type { Problem, ProblemView } from "@features/problems";
import type { StudyState, StudyStateView } from "@features/study";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function problemViewFromProblem(problem: Problem): ProblemView {
  return {
    slug: problem.slug,
    title: problem.title,
    difficulty: problem.difficulty,
    isPremium: problem.isPremium ?? false,
    url: problem.url,
    leetcodeId: problem.leetcodeId,
    topics: problem.topics.map((topic) => ({ id: topic.id, name: topic.name })),
    companies: problem.companies.map((company) => ({
      id: company.id,
      name: company.name,
    })),
    editedFields: listEditedFields(problem),
  };
}

function studyStateViewFromStudyState(
  studyState: StudyState | null,
  now: Date,
): StudyStateView | null {
  if (!studyState) return null;
  const summary = getStudyStateSummary(studyState, now, 0.85);
  return {
    ...summary,
    interviewPattern: studyState.interviewPattern,
    timeComplexity: studyState.timeComplexity,
    spaceComplexity: studyState.spaceComplexity,
    languages: studyState.languages,
    notes: studyState.notes,
    tags: studyState.tags,
    bestTimeMs: studyState.bestTimeMs,
    lastSolveTimeMs: studyState.lastSolveTimeMs,
    lastRating: studyState.lastRating,
    confidence: studyState.confidence,
    recentAttempts: studyState.attemptHistory.slice(-5),
  };
}

function buildGroupRows(
  group: TrackGroup,
): ProblemRowData[] {
  const now = new Date();
  return group.problems.map((problem) => {
    return {
      view: problemViewFromProblem(problem),
      studyState: studyStateViewFromStudyState(problem.studyState, now),
      trackMemberships: [],
      suspended: problem.studyState?.suspended ? ("manual" as const) : undefined,
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
  const activeGroupId  = useTracksUiStore(selectActiveGroupId);

  const activeGroup =
    activeTrack?.groups.find(g => g.id === activeGroupId) ?? activeTrack?.groups[0];

  const rows = useMemo(
    () => (activeGroup ? buildGroupRows(activeGroup) : []),
    [activeGroup],
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
          {activeTrack.groups.map(group => {
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

      <ProblemsTable rows={rows} variant="tracks" />
    </Stack>
  );
}

// ─── ActiveTrackSection ───────────────────────────────────────────────────────

export function ActiveTrackSection() {
  const activeTrack         = useTracksUiStore(s => s.activeTrack);
  const tracks              = useTracksUiStore(s => s.tracks);
  const activeTrackId       = useTracksUiStore(s => s.activeTrackId);
  const otherEnabledTracks  = useMemo(
    () => tracks.filter(t => t.enabled && t.id !== activeTrackId),
    [tracks, activeTrackId],
  );

  if (!activeTrack) return null;

  const progress = getTrackProgress(activeTrack);

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

      {progress.totalQuestions > 0 ? (
        <Stack spacing={0.75} sx={{ mb: 2 }}>
          <LinearProgress variant="determinate" value={progress.completionPercent} sx={{ height: 6, borderRadius: 3 }} />
          <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
            {progress.completedQuestions} / {progress.totalQuestions} completed
            {progress.dueCount > 0 ? ` · ${progress.dueCount} due for review` : ""}
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
