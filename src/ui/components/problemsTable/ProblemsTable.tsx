/**
 * Reusable problems table. Drives the Library tab, flat/derived Track
 * views, and the active group inside a grouped Track. All MUI Table
 * primitives — no DataGrid dependency — so the bundle stays lean.
 *
 * Variant prop drives Library-only columns (Track, Retention) and the
 * collapsed Title cell's slug subline. Each row carries an inline
 * chevron that toggles an expanded `ProblemRowDetail` panel showing
 * topics + companies, FSRS metric tiles, recent attempts, and inline
 * secondary actions (Edit / Suspend / Reset / Open in LeetCode).
 */
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
import Typography from "@mui/material/Typography";
import React, { Fragment, useCallback, useState } from "react";

import type { ProblemSlug } from "../../../domain/common/ids";
import type { Difficulty, StudyPhase } from "../../../domain/types";
import { SurfaceTableContainer } from "../../components/table/SurfaceTableContainer";
import { ToneChip } from "../chip/ToneChip";
import Link from "@mui/material/Link";
import {
  difficultyTone,
  formatDisplayDate,
  formatRetention,
  formatStudyPhase,
  retrievalTone,
} from "../../presentation/studyState";
import { ProblemRowDetail } from "./ProblemRowDetail";
import { useProblemsTable } from "./useProblemsTable";
import {
  ROWS_PER_PAGE_OPTIONS,
  type ProblemRowData,
  type ProblemSelection,
  type ProblemsTableFilters,
  type RowsPerPage,
  type SortDirection,
  type SortKey,
} from "./types";

export type ProblemsTableVariant = "tracks" | "library";

export interface ProblemsTableProps {
  rows: ProblemRowData[];
  /** Variant controls Library-only columns (Track, Retention) and the Title slug subline. */
  variant?: ProblemsTableVariant;
  /** When true, renders a checkbox column and a selection toolbar. */
  selectable?: boolean;
  /** Controlled selection. Parent owns the state when supplied. */
  selectedSlugs?: ProblemSelection;
  onSelectionChange?: (next: ProblemSelection) => void;
  /** Initial filter values (still user-editable). */
  initialFilters?: Partial<ProblemsTableFilters>;
  /** Default rows per page; defaults to 20. */
  defaultRowsPerPage?: RowsPerPage;
  /** Optional toolbar slot for parent-supplied filters (e.g. Library shows a Track filter). */
  toolbarExtras?: React.ReactNode;
  /** Empty-state message override. */
  emptyMessage?: string;
  /** Expanded panel callback — open the Edit Problem modal for this slug. */
  onEditProblem?: (slug: ProblemSlug) => void;
  /** Expanded panel callback — toggle suspend on the problem's StudyState. */
  onSuspendProblem?: (slug: ProblemSlug, suspend: boolean) => void;
  /** Expanded panel callback — reset the FSRS schedule for this problem. */
  onResetSchedule?: (slug: ProblemSlug) => void;
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
    rows,
    variant = "library",
    selectable,
    selectedSlugs,
    onSelectionChange,
    initialFilters,
    defaultRowsPerPage,
    toolbarExtras,
    emptyMessage = "No problems match these filters.",
    onEditProblem,
    onSuspendProblem,
    onResetSchedule,
  } = props;

  const showRetentionColumn = variant === "library";

  const controller = useProblemsTable({
    rows,
    initialFilters,
    defaultRowsPerPage,
  });
  const {
    filters,
    setFilters,
    sort,
    setSort,
    page,
    setPage,
    rowsPerPage,
    setRowsPerPage,
    pageRows,
    totalRowCount,
  } = controller;

  // Single-row expansion: opening a new row collapses any other expanded
  // row in the same table. Keeps the surface focused.
  const [expandedSlug, setExpandedSlug] = useState<ProblemSlug | null>(null);
  const toggleExpanded = useCallback(
    (event: React.MouseEvent, slug: ProblemSlug) => {
      // Don't let the chevron click bubble to the table-level outside-click
      // handler (which would otherwise instantly collapse what we just opened).
      event.stopPropagation();
      setExpandedSlug((prev) => (prev === slug ? null : slug));
    },
    [],
  );

  /**
   * Any click inside the table that lands outside the currently-expanded
   * row (collapsed cells + detail panel) collapses the row. Lets the user
   * dismiss the panel by clicking on another row's title, the toolbar,
   * column headers, pagination, etc. — anywhere except the expanded
   * region itself or a chevron.
   */
  const handleOutsideClick = useCallback((event: React.MouseEvent) => {
    if (!(event.target instanceof Element)) return;
    if (event.target.closest('[data-expanded-row="true"]')) return;
    setExpandedSlug(null);
  }, []);

  /**
   * Whole-row click toggles the row's expansion. Clicks on interactive
   * children (title link, chevron, checkbox) are skipped so they retain
   * their own behavior. Stops propagation so the table-level
   * outside-click handler doesn't immediately undo the toggle.
   */
  const handleRowClick = useCallback(
    (event: React.MouseEvent, slug: ProblemSlug) => {
      const target = event.target as Element | null;
      if (target?.closest('a, button, input, [role="button"]')) return;
      event.stopPropagation();
      setExpandedSlug((prev) => (prev === slug ? null : slug));
    },
    [],
  );

  const handleSort = useCallback(
    (key: SortKey) => () => {
      setSort((prev) => {
        if (prev.key === key) {
          return {
            key,
            direction: prev.direction === "asc" ? "desc" : "asc",
          } satisfies { key: SortKey; direction: SortDirection };
        }
        return { key, direction: "asc" };
      });
    },
    [setSort],
  );

  const isSelected = useCallback(
    (slug: ProblemSlug) => selectedSlugs?.has(slug) ?? false,
    [selectedSlugs],
  );

  const toggleSelected = useCallback(
    (slug: ProblemSlug) => {
      if (!onSelectionChange) return;
      const next = new Set(selectedSlugs ?? []);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      onSelectionChange(next);
    },
    [onSelectionChange, selectedSlugs],
  );

  const allOnPageSelected =
    selectable &&
    pageRows.length > 0 &&
    pageRows.every((row) => isSelected(row.view.slug as ProblemSlug));
  const someOnPageSelected =
    selectable &&
    pageRows.some((row) => isSelected(row.view.slug as ProblemSlug)) &&
    !allOnPageSelected;

  const togglePageSelection = useCallback(() => {
    if (!onSelectionChange) return;
    const next = new Set(selectedSlugs ?? []);
    if (allOnPageSelected) {
      for (const row of pageRows) next.delete(row.view.slug as ProblemSlug);
    } else {
      for (const row of pageRows) next.add(row.view.slug as ProblemSlug);
    }
    onSelectionChange(next);
  }, [allOnPageSelected, onSelectionChange, pageRows, selectedSlugs]);

  // Total column count for the expanded-row colSpan. (No Actions column —
  // the title cell is the LeetCode link, secondary actions live in the
  // expanded panel.)
  const totalColumns =
    1 + // chevron
    (selectable ? 1 : 0) +
    1 + // title
    1 + // difficulty
    1 + // phase / status
    (showRetentionColumn ? 1 : 0) +
    1 + // next review
    1; // last solved

  return (
    <Box onClick={handleOutsideClick}>
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
            setPage(0);
            setFilters((prev) => ({ ...prev, query: event.target.value }));
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
              setPage(0);
              setFilters((prev) => ({
                ...prev,
                difficulty: event.target.value as ProblemsTableFilters["difficulty"],
              }));
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
              setPage(0);
              setFilters((prev) => ({
                ...prev,
                phase: event.target.value as ProblemsTableFilters["phase"],
              }));
            }}
          >
            {PHASE_OPTIONS.map((value) => (
              <MenuItem key={value} value={value}>
                {value === "all" ? "All phases" : formatStudyPhase(value)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        {toolbarExtras}
      </Stack>

      {selectable && selectedSlugs && selectedSlugs.size > 0 ? (
        <Box sx={{ mb: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Selected: {selectedSlugs.size}{" "}
            {selectedSlugs.size === 1 ? "problem" : "problems"}
          </Typography>
        </Box>
      ) : null}

      <SurfaceTableContainer
        sx={{
          // Center cell contents vertically — the default in
          // SurfaceTableContainer is top-aligned for general tables, but
          // ProblemsTable rows look better with a middle baseline because
          // chips, badges, and link sit at varying heights.
          "& .MuiTableCell-root": { verticalAlign: "middle" },
        }}
      >
        <Table size="small" aria-label="Problems table">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox" />
              {selectable ? (
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={someOnPageSelected}
                    checked={allOnPageSelected}
                    onChange={togglePageSelection}
                    inputProps={{ "aria-label": "Select page rows" }}
                  />
                </TableCell>
              ) : null}
              <TableCell sortDirection={sort.key === "title" ? sort.direction : false}>
                <TableSortLabel
                  active={sort.key === "title"}
                  direction={sort.key === "title" ? sort.direction : "asc"}
                  onClick={handleSort("title")}
                >
                  Title
                </TableSortLabel>
              </TableCell>
              <TableCell sortDirection={sort.key === "difficulty" ? sort.direction : false}>
                <TableSortLabel
                  active={sort.key === "difficulty"}
                  direction={sort.key === "difficulty" ? sort.direction : "asc"}
                  onClick={handleSort("difficulty")}
                >
                  Difficulty
                </TableSortLabel>
              </TableCell>
              <TableCell sortDirection={sort.key === "phase" ? sort.direction : false}>
                <TableSortLabel
                  active={sort.key === "phase"}
                  direction={sort.key === "phase" ? sort.direction : "asc"}
                  onClick={handleSort("phase")}
                >
                  Status
                </TableSortLabel>
              </TableCell>
              {showRetentionColumn ? <TableCell>Retention</TableCell> : null}
              <TableCell sortDirection={sort.key === "nextReview" ? sort.direction : false}>
                <TableSortLabel
                  active={sort.key === "nextReview"}
                  direction={sort.key === "nextReview" ? sort.direction : "asc"}
                  onClick={handleSort("nextReview")}
                >
                  Next review
                </TableSortLabel>
              </TableCell>
              <TableCell sortDirection={sort.key === "lastReviewed" ? sort.direction : false}>
                <TableSortLabel
                  active={sort.key === "lastReviewed"}
                  direction={sort.key === "lastReviewed" ? sort.direction : "asc"}
                  onClick={handleSort("lastReviewed")}
                >
                  Last solved
                </TableSortLabel>
              </TableCell>
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
              pageRows.map((row) => {
                const slug = row.view.slug as ProblemSlug;
                const phase = row.studyState?.phase ?? "New";
                const phaseLabel = formatStudyPhase(phase);
                const isDue = row.studyState?.isDue;
                const nextReviewAt = row.studyState?.nextReviewAt;
                const lastReviewedAt = row.studyState?.lastReviewedAt;
                const isExpanded = expandedSlug === slug;
                const retrievability = row.studyState?.retrievability;
                return (
                  <Fragment key={slug}>
                    <TableRow
                      hover
                      selected={selectable && isSelected(slug)}
                      data-expanded-row={isExpanded ? "true" : undefined}
                      onClick={(event) => handleRowClick(event, slug)}
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
                          onClick={(event) => toggleExpanded(event, slug)}
                          aria-expanded={isExpanded}
                          aria-label={
                            isExpanded
                              ? `Collapse ${row.view.title}`
                              : `Expand ${row.view.title}`
                          }
                        >
                          {isExpanded ? (
                            <KeyboardArrowDown fontSize="small" />
                          ) : (
                            <KeyboardArrowRight fontSize="small" />
                          )}
                        </IconButton>
                      </TableCell>
                      {selectable ? (
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={isSelected(slug)}
                            onChange={() => toggleSelected(slug)}
                            inputProps={{
                              "aria-label": `Select ${row.view.title}`,
                            }}
                          />
                        </TableCell>
                      ) : null}
                      <TableCell>
                        <Link
                          href={row.view.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          underline="hover"
                          color="primary"
                          variant="body1"
                          sx={{ fontWeight: 500 }}
                        >
                          {row.view.title}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <ToneChip
                          label={row.view.difficulty}
                          tone={difficultyTone(row.view.difficulty)}
                        />
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <Typography
                            variant="body2"
                            color={isDue ? "warning.main" : "text.secondary"}
                          >
                            {phaseLabel}
                          </Typography>
                          {isDue ? <ToneChip label="DUE" tone="accent" /> : null}
                        </Stack>
                      </TableCell>
                      {showRetentionColumn ? (
                        <TableCell>
                          <RetentionBadge retrievability={retrievability} />
                        </TableCell>
                      ) : null}
                      <TableCell>
                        <Typography variant="body1" color="text.secondary">
                          {formatDisplayDate(nextReviewAt, "—")}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body1" color="text.secondary">
                          {formatDisplayDate(lastReviewedAt, "—")}
                        </Typography>
                      </TableCell>
                    </TableRow>
                    <TableRow data-expanded-row={isExpanded ? "true" : undefined}>
                      <TableCell
                        colSpan={totalColumns}
                        sx={{
                          p: 0,
                          borderBottom: isExpanded ? undefined : "none",
                        }}
                      >
                        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                          <ProblemRowDetail
                            row={row}
                            variant={variant}
                            onEditProblem={onEditProblem}
                            onSuspendProblem={onSuspendProblem}
                            onResetSchedule={onResetSchedule}
                          />
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </SurfaceTableContainer>

      <TablePagination
        component="div"
        count={totalRowCount}
        page={page}
        onPageChange={(_, nextPage) => setPage(nextPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(event) => {
          setPage(0);
          setRowsPerPage(Number(event.target.value) as RowsPerPage);
        }}
        rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS as unknown as number[]}
      />
    </Box>
  );
}

/** Library-variant retention badge: colored icon + tabular percent. */
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
    <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, color }}>
      <Icon fontSize="small" sx={{ fontSize: "1rem" }} />
      <Typography
        variant="body2"
        color="inherit"
        sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 500 }}
      >
        {text}
      </Typography>
    </Box>
  );
}
