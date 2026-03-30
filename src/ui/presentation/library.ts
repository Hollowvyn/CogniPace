/** Pure selectors and filter models for the dashboard library screen. */
import { LibraryProblemRow } from "../../domain/views";

export interface LibraryFilters {
  courseId: string;
  difficulty: string;
  query: string;
  status: string;
}

/** Creates the default dashboard library filter state. */
export function createDefaultLibraryFilters(): LibraryFilters {
  return {
    courseId: "all",
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
        `${row.problem.title} ${row.problem.leetcodeSlug}`.toLowerCase();
      if (!haystack.includes(query)) {
        return false;
      }
    }

    if (
      filters.courseId !== "all" &&
      !row.courses.some((course) => course.courseId === filters.courseId)
    ) {
      return false;
    }

    if (
      filters.difficulty !== "all" &&
      row.problem.difficulty !== filters.difficulty
    ) {
      return false;
    }

    if (filters.status !== "all") {
      const summary = row.studyStateSummary;
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
