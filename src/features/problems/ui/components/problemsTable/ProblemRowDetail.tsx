/**
 * Expanded-row detail panel for `ProblemsTable`.
 *
 * Two-column grid layout:
 *
 *   ┌─ Details ──────────────────────┐ ┌─ Analytics and history ─────┐
 *   │ Difficulty: [chip]              │ │ Stability:      0.2 days    │
 *   │ Status:   ☑ Premium  ☐ Suspend  │ │ Difficulty:     6.4 / 10    │
 *   │ Topics:   [chips with tooltip]  │ │ Retrievability: 100%        │
 *   │ Companies:[chips with tooltip]  │ │ Reps:           1           │
 *   │ Tracks:   Blind 75 · NeetCode…  │ │                             │
 *   │                                  │ │ Last 5 attempts             │
 *   │                                  │ │ May 9  May 7  Apr 22  …     │
 *   │                                  │ │ ↑ each date colored by      │
 *   │                                  │ │   rating; hover shows full  │
 *   └──────────────────────────────────┘ └─────────────────────────────┘
 *                Pattern (optional) / Notes (optional)
 *                                       [ Edit ] [ Suspend ] [ Reset ]
 *
 * Topic + Company chip rows cap at MAX_VISIBLE_CHIPS; overflow collapses
 * into a `+N more` chip whose tooltip lists the rest. The "Open in
 * LeetCode" CTA lives on the title in the collapsed row.
 */
import { ToneChip } from "@design-system/atoms/chip/ToneChip";
import { type Tone } from "@design-system/atoms/tone";
import { cognipaceTokens } from "@design-system/theme";
import { problemRepository } from "../../../data/repository/ProblemRepository";
import { settingsRepository } from "@features/settings";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import { alpha } from "@mui/material/styles";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { asProblemSlug } from "@shared/ids";
import React from "react";

import { useEditProblemStore } from "../../store/editProblemStore";
import {
  formatRetention,
  retrievalTone,
} from "../../presentation/studyState";

import type { ProblemsTableVariant } from "./ProblemsTable";
import type { ProblemRowData } from "./types";
import type {
  AttemptHistoryEntry,
  Rating,
  ReviewMode,
  StudyStateSummary,
} from "@features/study";


const MAX_VISIBLE_CHIPS = 6;

interface ProblemRowDetailProps {
  row: ProblemRowData;
  variant: ProblemsTableVariant;
}

interface SuspendAction {
  label: string;
  onClick: () => void;
}

/** Resolves the right Suspend/Resume action for a given row based on
 * its `suspended` reason. Manual: standard toggle. Premium-only: the
 * only way to surface the row is to disable the global premium gate.
 * Both: clearing the manual flag still leaves it premium-suspended,
 * but it's a meaningful step the user can take. */
function resolveSuspendAction(
  reason: ProblemRowData["suspended"],
  onSuspend: (suspend: boolean) => void,
  onEnablePremium: () => void,
): SuspendAction | null {
  if (!reason) {
    return { label: "Suspend", onClick: () => onSuspend(true) };
  }
  if (reason === "premium") {
    return { label: "Enable premium questions", onClick: onEnablePremium };
  }
  // manual or both — Resume clears the manual flag.
  return { label: "Resume", onClick: () => onSuspend(false) };
}

export function ProblemRowDetail({ row, variant }: ProblemRowDetailProps) {
  const openForProblem = useEditProblemStore(s => s.openForProblem);
  const { view, studyState, trackMemberships } = row;
  const slug = asProblemSlug(view.slug);
  const recentAttempts = studyState?.recentAttempts ?? [];
  const notes = studyState?.notes;
  const interviewPattern = studyState?.interviewPattern;
  const suspendAction = resolveSuspendAction(
    row.suspended,
    (suspend) => void problemRepository.suspendProblem(slug, suspend),
    () => void settingsRepository.setSkipPremium(false),
  );

  return (
    <Box
      sx={{
        backgroundColor: alpha(cognipaceTokens.background, 0.55),
        borderTop: `1px solid ${alpha(cognipaceTokens.outlineStrong, 0.18)}`,
        px: 2.5,
        py: 2,
      }}
    >
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={{ xs: 2, md: 4 }}
        alignItems="flex-start"
      >
        <Box sx={{ flex: 1, minWidth: 0, width: "100%" }}>
          <Stack spacing={1.25} divider={<RowDivider />}>
            <SectionHeading>Details</SectionHeading>

            <DetailRow label="Premium">
              <Typography
                variant="body2"
                sx={{ fontVariantNumeric: "tabular-nums" }}
                color={view.isPremium ? "warning.main" : "text.secondary"}
              >
                {view.isPremium ? "true" : "false"}
              </Typography>
            </DetailRow>

            <DetailRow label="Topics">
              <ChipOverflow
                items={view.topics.map((t) => ({ id: t.id, label: t.name }))}
                tone="info"
                emptyHint="None"
              />
            </DetailRow>

            <DetailRow label="Companies">
              <ChipOverflow
                items={view.companies.map((c) => ({ id: c.id, label: c.name }))}
                tone="accent"
                emptyHint="None"
              />
            </DetailRow>

            {variant === "library" ? (
              <DetailRow label="Tracks">
                {trackMemberships.length > 0 ? (
                  <Typography variant="body2" color="text.primary">
                    {trackMemberships
                      .map((track) => track.trackName)
                      .join(" · ")}
                  </Typography>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Independent
                  </Typography>
                )}
              </DetailRow>
            ) : null}
          </Stack>
        </Box>

        <Box sx={{ flex: 1, minWidth: 0, width: "100%" }}>
          <Stack spacing={1.25} divider={<RowDivider />}>
            <SectionHeading>Analytics and history</SectionHeading>

            <FsrsRows summary={studyState} />

            <DetailRow label="Last 5 attempts">
              <RecentAttemptsRow attempts={recentAttempts} />
            </DetailRow>
          </Stack>
        </Box>
      </Stack>

      {(interviewPattern || notes) && (
        <Stack spacing={1.25} divider={<RowDivider />} sx={{ mt: 2 }}>
          {interviewPattern ? (
            <DetailRow label="Pattern">
              <Typography variant="body2" color="text.secondary">
                {interviewPattern}
              </Typography>
            </DetailRow>
          ) : null}
          {notes ? (
            <DetailRow label="Notes">
              <Typography variant="body2" color="text.secondary">
                {notes}
              </Typography>
            </DetailRow>
          ) : null}
        </Stack>
      )}

      <Stack
        direction="row"
        spacing={1}
        justifyContent="flex-end"
        flexWrap="wrap"
        sx={{ mt: 2, rowGap: 1 }}
      >
        <Button size="small" onClick={() => openForProblem(view)}>
          Edit
        </Button>
        {suspendAction ? (
          <Button size="small" onClick={suspendAction.onClick}>
            {suspendAction.label}
          </Button>
        ) : null}
        <Button
          size="small"
          onClick={() => void problemRepository.resetProblemSchedule(slug)}
        >
          Reset schedule
        </Button>
      </Stack>
    </Box>
  );
}

/** A single label/value row. */
function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={{ xs: 0.25, sm: 2 }}
      alignItems={{ xs: "flex-start", sm: "center" }}
    >
      <Typography
        variant="overline"
        color="text.secondary"
        sx={{ minWidth: 130, lineHeight: 1.6 }}
      >
        {label}
      </Typography>
      <Box sx={{ flex: 1, minWidth: 0 }}>{children}</Box>
    </Stack>
  );
}

/** A muted divider between detail rows. */
function RowDivider() {
  return (
    <Box
      sx={{
        borderTop: `1px solid ${alpha(cognipaceTokens.outlineStrong, 0.08)}`,
      }}
    />
  );
}

/** Section heading slot inside the detail panel. */
function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      variant="subtitle1"
      color="text.primary"
      sx={{
        fontWeight: 600,
        lineHeight: 1.4,
      }}
    >
      {children}
    </Typography>
  );
}

/**
 * Renders a row of chips capped at MAX_VISIBLE_CHIPS. Overflow collapses
 * into a `+N more` chip whose tooltip lists the hidden labels.
 */
function ChipOverflow({
  items,
  tone,
  emptyHint,
}: {
  items: Array<{ id: string; label: string }>;
  tone: Tone;
  emptyHint: string;
}) {
  if (items.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        {emptyHint}
      </Typography>
    );
  }
  const visible = items.slice(0, MAX_VISIBLE_CHIPS);
  const overflow = items.slice(MAX_VISIBLE_CHIPS);
  return (
    <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ rowGap: 0.5 }}>
      {visible.map((item) => (
        <ToneChip key={item.id} label={item.label} tone={tone} />
      ))}
      {overflow.length > 0 ? (
        <Tooltip
          arrow
          title={
            <Stack spacing={0.25}>
              {overflow.map((item) => (
                <Typography
                  key={item.id}
                  variant="caption"
                  sx={{ color: "inherit" }}
                >
                  {item.label}
                </Typography>
              ))}
            </Stack>
          }
        >
          <span>
            <ToneChip label={`+${overflow.length} more`} tone="default" />
          </span>
        </Tooltip>
      ) : null}
    </Stack>
  );
}

/** Four FSRS metrics rendered as standard label/value rows. */
function FsrsRows({ summary }: { summary: StudyStateSummary | null }) {
  const stability = summary?.stability;
  const difficulty = summary?.difficulty;
  const retrievability = summary?.retrievability;
  const reps = summary?.reviewCount ?? 0;
  const tone = retrievalTone(retrievability);
  const retrievabilityColor = toneToColor(tone);

  return (
    <>
      <DetailRow label="Stability">
        <Typography variant="body2" sx={{ fontVariantNumeric: "tabular-nums" }}>
          {stability !== undefined ? `${stability.toFixed(1)} days` : "—"}
        </Typography>
      </DetailRow>
      <DetailRow label="Difficulty">
        <Typography variant="body2" sx={{ fontVariantNumeric: "tabular-nums" }}>
          {difficulty !== undefined ? `${difficulty.toFixed(1)} / 10` : "—"}
        </Typography>
      </DetailRow>
      <DetailRow label="Retrievability">
        <Typography
          variant="body2"
          sx={{
            fontVariantNumeric: "tabular-nums",
            color: retrievabilityColor,
            fontWeight: retrievabilityColor ? 500 : undefined,
          }}
        >
          {formatRetention(retrievability)}
        </Typography>
      </DetailRow>
      <DetailRow label="Reps">
        <Typography variant="body2" sx={{ fontVariantNumeric: "tabular-nums" }}>
          {reps}
        </Typography>
      </DetailRow>
    </>
  );
}

function RecentAttemptsRow({
  attempts,
}: {
  attempts: ReadonlyArray<AttemptHistoryEntry>;
}) {
  if (attempts.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No attempts yet
      </Typography>
    );
  }
  // Newest first for readability.
  const ordered = [...attempts].reverse();
  return (
    <Stack direction="row" spacing={1.5} flexWrap="wrap" sx={{ rowGap: 0.5 }}>
      {ordered.map((entry) => (
        <AttemptDate key={entry.reviewedAt} entry={entry} />
      ))}
    </Stack>
  );
}

/**
 * One attempt rendered as just the date, colored by the rating's tone.
 * Tooltip on hover shows the full submission detail (rating label, solve
 * time, mode).
 */
function AttemptDate({ entry }: { entry: AttemptHistoryEntry }) {
  const date = formatShortDate(entry.reviewedAt);
  const ratingLabel = ratingToLabel(entry.rating);
  const tone = ratingToTone(entry.rating);
  const time = entry.solveTimeMs ? formatSolveTime(entry.solveTimeMs) : null;
  const mode = formatMode(entry.mode);
  const tooltip = [ratingLabel, time, mode].filter(Boolean).join(" · ");
  return (
    <Tooltip arrow title={tooltip || ratingLabel}>
      <Typography
        variant="body2"
        component="span"
        sx={{
          color: toneToColor(tone) ?? "text.primary",
          fontWeight: 500,
          fontVariantNumeric: "tabular-nums",
          cursor: "help",
        }}
      >
        {date}
      </Typography>
    </Tooltip>
  );
}

function ratingToLabel(rating: Rating): string {
  switch (rating) {
    case 0:
      return "Again";
    case 1:
      return "Hard";
    case 2:
      return "Good";
    case 3:
      return "Easy";
    default:
      return "—";
  }
}

function ratingToTone(rating: Rating): Tone {
  switch (rating) {
    case 0:
      return "danger";
    case 1:
      return "accent";
    case 2:
      return "success";
    case 3:
      return "info";
    default:
      return "default";
  }
}

function formatShortDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function formatSolveTime(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "—";
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function formatMode(mode: ReviewMode): string {
  return mode === "FULL_SOLVE" ? "Full solve" : "Recall";
}

function toneToColor(tone?: Tone): string | undefined {
  switch (tone) {
    case "success":
      return "success.main";
    case "danger":
      return "error.main";
    case "accent":
      return "warning.main";
    case "info":
      return "info.main";
    default:
      return undefined;
  }
}
