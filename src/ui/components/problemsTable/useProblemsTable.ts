/**
 * Controller hook for `ProblemsTable`. Owns the search/filter/sort/pagination
 * state and the derived "visible rows" selector. Pure logic — no MUI imports
 * — so it's fast to unit-test and reusable from any view.
 */
import { useMemo, useState } from "react";

import { createDefaultFilters } from "./types";

import type {
  ProblemRowData,
  ProblemsTableFilters,
  RowsPerPage,
  SortDirection,
  SortKey,
} from "./types";
import type { Difficulty, StudyPhase } from "../../../domain/types";

export interface UseProblemsTableOptions {
  rows: ProblemRowData[];
  initialFilters?: Partial<ProblemsTableFilters>;
  defaultRowsPerPage?: RowsPerPage;
  initialSort?: { key: SortKey; direction: SortDirection };
}

export interface UseProblemsTableResult {
  // state
  filters: ProblemsTableFilters;
  setFilters: React.Dispatch<React.SetStateAction<ProblemsTableFilters>>;
  sort: { key: SortKey; direction: SortDirection };
  setSort: React.Dispatch<
    React.SetStateAction<{ key: SortKey; direction: SortDirection }>
  >;
  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  rowsPerPage: RowsPerPage;
  setRowsPerPage: React.Dispatch<React.SetStateAction<RowsPerPage>>;
  // derived
  filteredRows: ProblemRowData[];
  pageRows: ProblemRowData[];
  totalRowCount: number;
}

export function useProblemsTable(
  options: UseProblemsTableOptions,
): UseProblemsTableResult {
  const [filters, setFilters] = useState<ProblemsTableFilters>(() => ({
    ...createDefaultFilters(),
    ...options.initialFilters,
  }));
  const [sort, setSort] = useState<{ key: SortKey; direction: SortDirection }>(
    options.initialSort ?? { key: "title", direction: "asc" },
  );
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState<RowsPerPage>(
    options.defaultRowsPerPage ?? 20,
  );

  const filteredRows = useMemo(
    () => applyFiltersAndSort(options.rows, filters, sort),
    [options.rows, filters, sort],
  );

  const pageRows = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredRows.slice(start, start + rowsPerPage);
  }, [filteredRows, page, rowsPerPage]);

  return {
    filters,
    setFilters,
    sort,
    setSort,
    page,
    setPage,
    rowsPerPage,
    setRowsPerPage,
    filteredRows,
    pageRows,
    totalRowCount: filteredRows.length,
  };
}

/**
 * Pure selector: filter then sort the rows. Exported so unit tests can
 * exercise the algorithm without rendering React.
 */
export function applyFiltersAndSort(
  rows: ProblemRowData[],
  filters: ProblemsTableFilters,
  sort: { key: SortKey; direction: SortDirection },
): ProblemRowData[] {
  const query = filters.query.trim().toLowerCase();
  const filtered = rows.filter((row) => {
    if (query) {
      const haystack = `${row.view.title} ${row.view.slug}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    if (
      filters.difficulty !== "all" &&
      row.view.difficulty !== filters.difficulty
    ) {
      return false;
    }
    if (filters.phase !== "all") {
      const phase = phaseOf(row);
      if (phase !== filters.phase) return false;
    }
    return true;
  });
  return [...filtered].sort((a, b) => compareRows(a, b, sort));
}

function compareRows(
  a: ProblemRowData,
  b: ProblemRowData,
  sort: { key: SortKey; direction: SortDirection },
): number {
  const flip = sort.direction === "asc" ? 1 : -1;
  switch (sort.key) {
    case "title":
      return flip * a.view.title.localeCompare(b.view.title);
    case "difficulty":
      return flip * (difficultyOrdinal(a.view.difficulty) - difficultyOrdinal(b.view.difficulty));
    case "phase":
      return flip * phaseOrdinal(phaseOf(a)).localeCompare(phaseOrdinal(phaseOf(b)));
    case "nextReview":
      return flip * compareIsoDate(
        a.studyState?.nextReviewAt,
        b.studyState?.nextReviewAt,
      );
    case "lastReviewed":
      return flip * compareIsoDate(
        a.studyState?.lastReviewedAt,
        b.studyState?.lastReviewedAt,
      );
  }
}

function difficultyOrdinal(value: Difficulty): number {
  switch (value) {
    case "Easy":
      return 0;
    case "Medium":
      return 1;
    case "Hard":
      return 2;
    case "Unknown":
    default:
      return 3;
  }
}

function phaseOf(row: ProblemRowData): StudyPhase | "New" {
  return row.studyState?.phase ?? "New";
}

/** Stable string ordinal so `localeCompare` gives deterministic ordering. */
function phaseOrdinal(phase: StudyPhase | "New"): string {
  const order: Record<StudyPhase | "New", number> = {
    New: 0,
    Learning: 1,
    Review: 2,
    Relearning: 3,
    Suspended: 4,
  };
  return String(order[phase]).padStart(2, "0");
}

/** Generic ISO-date comparator: undefined values sort to the end. */
function compareIsoDate(a?: string, b?: string): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return a.localeCompare(b);
}
