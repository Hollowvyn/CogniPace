import { DifficultyChip, ToneChip } from "@design-system/atoms";
import { SurfaceTableContainer } from "@design-system/atoms/table/SurfaceTableContainer";
import CheckCircleRounded from "@mui/icons-material/CheckCircleRounded";
import ErrorRounded from "@mui/icons-material/ErrorRounded";
import KeyboardArrowDown from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowRight from "@mui/icons-material/KeyboardArrowRight";
import WarningRounded from "@mui/icons-material/WarningRounded";
import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import Collapse from "@mui/material/Collapse";
import FormControl from "@mui/material/FormControl";
import IconButton from "@mui/material/IconButton";
import InputLabel from "@mui/material/InputLabel";
import Link from "@mui/material/Link";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TablePagination from "@mui/material/TablePagination";
import TableRow from "@mui/material/TableRow";
import TableSortLabel from "@mui/material/TableSortLabel";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { asProblemSlug } from "@shared/ids";
import React, { Fragment, useCallback, useMemo } from "react";

import {
  formatDisplayDate,
  formatRetention,
  formatStudyPhase,
  retrievalTone,
} from "../../presentation/studyState";

import { ProblemRowDetail } from "./ProblemRowDetail";
import {
  filterAndSortProblems,
  getProblemStudySummary,
  getProblemSuspendedReason,
  listTrackOptions,
  pageProblems,
} from "./problemTableSelectors";
import {
  ROWS_PER_PAGE_OPTIONS,
  type ProblemsTableFilters,
  type RowsPerPage,
  type SortDirection,
  type SortKey,
} from "./types";
import { useProblemTableStoreSelector } from "./useProblemTableStore";

import type { ProblemTableStore } from "./problemTableStore";
import type { Difficulty, Problem } from "../../../domain/model";
import type { StudyPhase } from "@features/study";
import type { ProblemSlug } from "@shared/ids";

interface ProblemsTableProps {
  store: ProblemTableStore;
  showTrackFilter?: boolean;
  showTrackDetails?: boolean;
  showRetentionColumn?: boolean;
  showSelection?: boolean;
  padToPageSize?: boolean;
  emptyMessage?: string;
  onEditProblem?: (problem: Problem) => void;
}

const DIFFICULTY_OPTIONS: ReadonlyArray<Difficulty | "all"> = [
  "all",
  "Easy",
  "Medium",
  "Hard",
  "Unknown",
];

const PHASE_OPTIONS: ReadonlyArray<StudyPhase | "all" | "New"> = [
  "all",
  "New",
  "Learning",
  "Review",
  "Relearning",
  "Suspended",
];

export function ProblemsTable(props: ProblemsTableProps) {
  const {
    emptyMessage = "No problems match these filters.",
    onEditProblem,
    padToPageSize = false,
    showRetentionColumn = false,
    showSelection = false,
    showTrackDetails = false,
    showTrackFilter = false,
    store,
  } = props;

  const problems = useProblemTableStoreSelector(store, (s) => s.problems);
  const settings = useProblemTableStoreSelector(store, (s) => s.settings);
  const tracks = useProblemTableStoreSelector(store, (s) => s.tracks);
  const now = useProblemTableStoreSelector(store, (s) => s.now);
  const filters = useProblemTableStoreSelector(store, (s) => s.filters);
  const sort = useProblemTableStoreSelector(store, (s) => s.sort);
  const page = useProblemTableStoreSelector(store, (s) => s.page);
  const rowsPerPage = useProblemTableStoreSelector(store, (s) => s.rowsPerPage);
  const selectedSlugs = useProblemTableStoreSelector(
    store,
    (s) => s.selectedSlugs
  );
  const expandedSlug = useProblemTableStoreSelector(
    store,
    (s) => s.expandedSlug
  );
  const pendingAction = useProblemTableStoreSelector(
    store,
    (s) => s.pendingAction
  );
  const error = useProblemTableStoreSelector(store, (s) => s.error);
  const dispatchIntent = useProblemTableStoreSelector(
    store,
    (s) => s.dispatchIntent
  );

  const filteredProblems = useMemo(
    () => filterAndSortProblems(problems, filters, sort, settings, now, tracks),
    [filters, now, problems, settings, sort, tracks]
  );
  const pageRows = useMemo(
    () => pageProblems(filteredProblems, page, rowsPerPage),
    [filteredProblems, page, rowsPerPage]
  );
  const trackOptions = useMemo(
    () => listTrackOptions(problems, tracks),
    [problems, tracks]
  );

  const isSelected = useCallback(
    (slug: ProblemSlug) => selectedSlugs.has(slug),
    [selectedSlugs]
  );

  const allOnPageSelected =
    pageRows.length > 0 &&
    pageRows.every((problem) => isSelected(asProblemSlug(problem.slug)));
  const someOnPageSelected =
    pageRows.some((problem) => isSelected(asProblemSlug(problem.slug))) &&
    !allOnPageSelected;

  const handleSort = useCallback(
    (key: SortKey) => () => {
      const nextSort =
        sort.key === key
          ? {
              key,
              direction: (sort.direction === "asc"
                ? "desc"
                : "asc") as SortDirection,
            }
          : { key, direction: "asc" as SortDirection };
      dispatchIntent({ type: "SET_SORT", sort: nextSort });
    },
    [dispatchIntent, sort]
  );

  const totalColumns =
    1 +
    (showSelection ? 1 : 0) +
    1 +
    1 +
    1 +
    (showRetentionColumn ? 1 : 0) +
    1 +
    1;

  return (
    <Box
      onClick={(event) => {
        if (!(event.target instanceof Element)) return;
        if (event.target.closest('[data-expanded-row="true"]')) return;
        dispatchIntent({ type: "CLEAR_EXPANDED" });
      }}
    >
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        sx={{ mb: 2 }}
        alignItems={{ xs: "stretch", md: "center" }}
      >
        <TextField
          size="small"
          label="Search problems"
          value={filters.query}
          onChange={(event) => {
            dispatchIntent({ type: "SET_QUERY", query: event.target.value });
          }}
          sx={{ minWidth: 240 }}
        />
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel id="problems-table-difficulty">Difficulty</InputLabel>
          <Select
            labelId="problems-table-difficulty"
            label="Difficulty"
            value={filters.difficulty}
            onChange={(event) => {
              dispatchIntent({
                type: "SET_DIFFICULTY",
                difficulty: event.target
                  .value as ProblemsTableFilters["difficulty"],
              });
            }}
          >
            {DIFFICULTY_OPTIONS.map((value) => (
              <MenuItem key={value} value={value}>
                {value === "all" ? "All difficulties" : value}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel id="problems-table-phase">Phase</InputLabel>
          <Select
            labelId="problems-table-phase"
            label="Phase"
            value={filters.phase}
            onChange={(event) => {
              dispatchIntent({
                type: "SET_PHASE",
                phase: event.target.value as ProblemsTableFilters["phase"],
              });
            }}
          >
            {PHASE_OPTIONS.map((value) => (
              <MenuItem key={value} value={value}>
                {value === "all" ? "All phases" : formatStudyPhase(value)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        {showTrackFilter ? (
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel id="library-filter-track-label">Track</InputLabel>
            <Select
              labelId="library-filter-track-label"
              label="Track"
              value={filters.trackId}
              onChange={(event) => {
                dispatchIntent({
                  type: "SET_TRACK_FILTER",
                  trackId: event.target
                    .value as ProblemsTableFilters["trackId"],
                });
              }}
            >
              <MenuItem value="all">All tracks</MenuItem>
              {trackOptions.map((option) => (
                <MenuItem key={option.trackId} value={option.trackId}>
                  {option.trackName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        ) : null}
      </Stack>

      {showSelection && selectedSlugs.size > 0 ? (
        <Box sx={{ mb: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Selected: {selectedSlugs.size}{" "}
            {selectedSlugs.size === 1 ? "problem" : "problems"}
          </Typography>
        </Box>
      ) : null}

      {error ? (
        <Typography variant="body2" color="error" sx={{ mb: 1 }}>
          {error}
        </Typography>
      ) : null}

      <SurfaceTableContainer
        sx={{ "& .MuiTableCell-root": { verticalAlign: "middle" } }}
      >
        <Table size="small" aria-label="Problems table">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox" aria-label="Row expand control" />
              {showSelection ? (
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={someOnPageSelected}
                    checked={allOnPageSelected}
                    onChange={() => {
                      dispatchIntent({
                        type: "TOGGLE_PAGE_SELECTION",
                        slugs: pageRows.map((problem) =>
                          asProblemSlug(problem.slug)
                        ),
                      });
                    }}
                    inputProps={{ "aria-label": "Select page rows" }}
                  />
                </TableCell>
              ) : null}
              <SortableHeadCell
                label="Title"
                sortKey="title"
                currentSort={sort}
                onSort={handleSort}
              />
              <SortableHeadCell
                label="Difficulty"
                sortKey="difficulty"
                currentSort={sort}
                onSort={handleSort}
              />
              <SortableHeadCell
                label="Status"
                sortKey="phase"
                currentSort={sort}
                onSort={handleSort}
              />
              {showRetentionColumn ? <TableCell>Retention</TableCell> : null}
              <SortableHeadCell
                label="Next review"
                sortKey="nextReview"
                currentSort={sort}
                onSort={handleSort}
              />
              <SortableHeadCell
                label="Last solved"
                sortKey="lastReviewed"
                currentSort={sort}
                onSort={handleSort}
              />
            </TableRow>
          </TableHead>
          <TableBody>
            {pageRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={totalColumns} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    {emptyMessage}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              pageRows.map((problem) => {
                const slug = asProblemSlug(problem.slug);
                const studySummary = getProblemStudySummary(
                  problem,
                  now,
                  settings.memoryReview.targetRetention
                );
                const suspended = getProblemSuspendedReason(problem, settings);
                const phase = suspended
                  ? "Suspended"
                  : (studySummary?.phase ?? "New");
                const isDue = studySummary?.isDue && !suspended;
                const isExpanded = expandedSlug === slug;
                return (
                  <Fragment key={slug}>
                    <TableRow
                      hover
                      selected={isSelected(slug)}
                      data-expanded-row={isExpanded ? "true" : undefined}
                      onClick={(event) => {
                        const target = event.target as Element | null;
                        if (
                          target?.closest("a, button, input, [role='button']")
                        )
                          return;
                        event.stopPropagation();
                        dispatchIntent({ type: "TOGGLE_EXPANDED", slug });
                      }}
                      sx={{
                        cursor: "pointer",
                        ...(isExpanded
                          ? { "& > *": { borderBottom: "unset" } }
                          : {}),
                      }}
                    >
                      <TableCell padding="checkbox">
                        <IconButton
                          size="small"
                          onClick={(event) => {
                            event.stopPropagation();
                            dispatchIntent({ type: "TOGGLE_EXPANDED", slug });
                          }}
                          aria-expanded={isExpanded}
                          aria-label={
                            isExpanded
                              ? `Collapse ${problem.title}`
                              : `Expand ${problem.title}`
                          }
                        >
                          {isExpanded ? (
                            <KeyboardArrowDown fontSize="small" />
                          ) : (
                            <KeyboardArrowRight fontSize="small" />
                          )}
                        </IconButton>
                      </TableCell>
                      {showSelection ? (
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={isSelected(slug)}
                            onChange={() => {
                              dispatchIntent({ type: "TOGGLE_SELECTED", slug });
                            }}
                            inputProps={{
                              "aria-label": `Select ${problem.title}`,
                            }}
                          />
                        </TableCell>
                      ) : null}
                      <TableCell>
                        <Link
                          href={problem.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          underline="hover"
                          color={suspended ? "text.disabled" : "primary"}
                          variant="body1"
                          sx={{
                            fontWeight: 500,
                            display: "-webkit-box",
                            WebkitBoxOrient: "vertical",
                            WebkitLineClamp: isExpanded ? 5 : 2,
                            overflow: "hidden",
                            wordBreak: "break-word",
                            textDecorationLine: suspended
                              ? "line-through"
                              : undefined,
                          }}
                        >
                          {problem.title}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <DifficultyChip difficulty={problem.difficulty} />
                      </TableCell>
                      <TableCell>
                        <Stack
                          direction="row"
                          spacing={0.5}
                          alignItems="center"
                        >
                          <Tooltip
                            title={suspendedTooltip(suspended)}
                            disableHoverListener={!suspended}
                            disableFocusListener={!suspended}
                            disableTouchListener={!suspended}
                            arrow
                          >
                            <Typography
                              variant="body2"
                              color={isDue ? "warning.main" : "text.secondary"}
                              sx={
                                suspended
                                  ? {
                                      cursor: "help",
                                      textDecorationLine: "underline",
                                      textDecorationStyle: "dotted",
                                      textUnderlineOffset: "3px",
                                    }
                                  : undefined
                              }
                            >
                              {formatStudyPhase(phase)}
                            </Typography>
                          </Tooltip>
                          {isDue ? (
                            <ToneChip label="DUE" tone="accent" />
                          ) : null}
                        </Stack>
                      </TableCell>
                      {showRetentionColumn ? (
                        <TableCell>
                          <RetentionBadge
                            retrievability={studySummary?.retrievability}
                          />
                        </TableCell>
                      ) : null}
                      <TableCell>
                        <Typography variant="body1" color="text.secondary">
                          {formatDisplayDate(studySummary?.nextReviewAt, "—")}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body1" color="text.secondary">
                          {formatDisplayDate(studySummary?.lastReviewedAt, "—")}
                        </Typography>
                      </TableCell>
                    </TableRow>
                    <TableRow
                      data-expanded-row={isExpanded ? "true" : undefined}
                    >
                      <TableCell
                        colSpan={totalColumns}
                        sx={{
                          p: 0,
                          borderBottom: isExpanded ? undefined : "none",
                        }}
                      >
                        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                          <ProblemRowDetail
                            commandsPending={pendingAction}
                            dispatchIntent={dispatchIntent}
                            onEditProblem={onEditProblem}
                            problem={problem}
                            settings={settings}
                            showTrackDetails={showTrackDetails}
                            tracks={tracks}
                            now={now}
                          />
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </Fragment>
                );
              })
            )}
            {padToPageSize &&
            pageRows.length > 0 &&
            pageRows.length < rowsPerPage
              ? Array.from({ length: rowsPerPage - pageRows.length }).map(
                  (_, index) => (
                    <TableRow
                      key={`empty-${index}`}
                      aria-hidden
                      sx={{ pointerEvents: "none" }}
                    >
                      <TableCell
                        colSpan={totalColumns}
                        sx={{ borderBottom: "none", height: 53 }}
                      />
                    </TableRow>
                  )
                )
              : null}
          </TableBody>
        </Table>
      </SurfaceTableContainer>

      <TablePagination
        component="div"
        count={filteredProblems.length}
        page={page}
        onPageChange={(_, nextPage) => {
          dispatchIntent({ type: "SET_PAGE", page: nextPage });
        }}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(event) => {
          dispatchIntent({
            type: "SET_ROWS_PER_PAGE",
            rowsPerPage: Number(event.target.value) as RowsPerPage,
          });
        }}
        rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS as unknown as number[]}
      />
    </Box>
  );
}

function SortableHeadCell({
  currentSort,
  label,
  onSort,
  sortKey,
}: {
  currentSort: { key: SortKey; direction: SortDirection };
  label: string;
  onSort: (key: SortKey) => () => void;
  sortKey: SortKey;
}) {
  return (
    <TableCell
      sortDirection={
        currentSort.key === sortKey ? currentSort.direction : false
      }
    >
      <TableSortLabel
        active={currentSort.key === sortKey}
        direction={currentSort.key === sortKey ? currentSort.direction : "asc"}
        onClick={onSort(sortKey)}
      >
        {label}
      </TableSortLabel>
    </TableCell>
  );
}

function suspendedTooltip(reason?: "manual" | "premium" | "both"): string {
  switch (reason) {
    case "manual":
      return "Suspended manually.";
    case "premium":
      return "Premium-locked. Treated as suspended via the Settings toggle.";
    case "both":
      return "Suspended manually and premium-locked.";
    default:
      return "";
  }
}

function RetentionBadge({ retrievability }: { retrievability?: number }) {
  const tone = retrievalTone(retrievability);
  const text = formatRetention(retrievability);
  if (retrievability === undefined) {
    return (
      <Typography variant="body2" color="text.secondary">
        {text}
      </Typography>
    );
  }
  const color =
    tone === "success"
      ? "success.main"
      : tone === "danger"
        ? "error.main"
        : "warning.main";
  const Icon =
    tone === "success"
      ? CheckCircleRounded
      : tone === "danger"
        ? ErrorRounded
        : WarningRounded;
  return (
    <Stack direction="row" spacing={0.5} alignItems="center">
      <Icon sx={{ color, fontSize: 16 }} />
      <Typography variant="body2" sx={{ fontVariantNumeric: "tabular-nums" }}>
        {text}
      </Typography>
    </Stack>
  );
}
