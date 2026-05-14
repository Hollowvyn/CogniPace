/** Pure selectors and filter models for the dashboard library screen. */
import { LibraryProblemRow } from "@features/problems";

export interface LibraryFilters {
  /** Active track filter — "all" or a TrackId. */
  trackId: string;
  difficulty: string;
  query: string;
  status: string;
}

/** Creates the default dashboard library filter state. */
export function createDefaultLibraryFilters(): LibraryFilters {
  return {
    trackId: "all",
    difficulty: "all",
    query: "",
    status: "all",
  };
}

/** Filters the library rows using a pure selector so controllers stay transport-free. */
export function filterLibraryRows(
  rows: LibraryProblemRow[],
  filters: LibraryFilters
): LibraryProblemRow[] {
  const query = filters.query.trim().toLowerCase();

  return rows.filter((row) => {
    if (query) {
      const haystack =
        `${row.view.title} ${row.view.slug}`.toLowerCase();
      if (!haystack.includes(query)) {
        return false;
      }
    }

    if (
      filters.trackId !== "all" &&
      !row.trackMemberships.some(
        (membership) => membership.trackId === filters.trackId,
      )
    ) {
      return false;
    }

    if (
      filters.difficulty !== "all" &&
      row.view.difficulty !== filters.difficulty
    ) {
      return false;
    }

    if (filters.status !== "all") {
      const summary = row.studyState;
      if (filters.status === "due" && !summary?.isDue) {
        return false;
      }
      if (filters.status === "new" && summary?.isStarted) {
        return false;
      }
      if (filters.status === "review" && summary?.phase !== "Review") {
        return false;
      }
      if (filters.status === "suspended" && summary?.phase !== "Suspended") {
        return false;
      }
      if (filters.status === "learning" && summary?.phase !== "Learning") {
        return false;
      }
      if (filters.status === "relearning" && summary?.phase !== "Relearning") {
        return false;
      }
    }

    return true;
  });
}
