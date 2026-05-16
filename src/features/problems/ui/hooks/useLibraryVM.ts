/** LibraryScreen's ViewModel — owns selection state and row filtering.
 *  Edit modal and problem mutations (suspend, reset, enable-premium) are
 *  handled by ProblemRowDetail + EditProblemModalConnected directly. */
import { useMemo, useState } from "react";

import { LibraryFilters } from "../presentation/library";

import type { LibraryProblemRow } from "../../domain/model";
import type { ProblemRowData, ProblemSelection } from "../components/problemsTable";
import type { AppShellPayload } from "@features/app-shell";
import type React from "react";

export interface LibraryTrackOption {
  trackId: string;
  trackName: string;
}

export interface LibraryScreenModel {
  trackOptions: LibraryTrackOption[];
  tableRows: ProblemRowData[];
  selectedSlugs: ProblemSelection;
  filters: LibraryFilters;
  onSelectionChange: (selection: ProblemSelection) => void;
  onFilterChange: React.Dispatch<React.SetStateAction<LibraryFilters>>;
  onTrackFilterChange: (trackId: string) => void;
}

export interface UseLibraryVMInput {
  filters: LibraryFilters;
  onFilterChange: React.Dispatch<React.SetStateAction<LibraryFilters>>;
  payload: AppShellPayload | null;
  rows: LibraryProblemRow[];
}

export function useLibraryVM(input: UseLibraryVMInput): LibraryScreenModel {
  const trackOptions = useMemo<LibraryTrackOption[]>(() => {
    const seen = new Map<string, string>();
    for (const row of input.rows) {
      for (const member of row.trackMemberships ?? []) {
        if (!seen.has(member.trackId)) {
          seen.set(member.trackId, member.trackName);
        }
      }
    }
    return Array.from(seen.entries()).map(([trackId, trackName]) => ({
      trackId,
      trackName,
    }));
  }, [input.rows]);

  const visibleRows = useMemo(() => {
    if (input.filters.trackId === "all") return input.rows;
    return input.rows.filter((row) =>
      (row.trackMemberships ?? []).some(
        (member) => member.trackId === input.filters.trackId,
      ),
    );
  }, [input.filters.trackId, input.rows]);

  const tableRows = useMemo<ProblemRowData[]>(
    () =>
      visibleRows.map((row) => ({
        view: row.view,
        studyState: row.studyState,
        trackMemberships: row.trackMemberships,
        suspended: row.suspended,
      })),
    [visibleRows],
  );

  const [selectedSlugs, setSelectedSlugs] = useState<ProblemSelection>(
    () => new Set(),
  );

  return {
    trackOptions,
    tableRows,
    selectedSlugs,
    filters: input.filters,
    onSelectionChange: setSelectedSlugs,
    onFilterChange: input.onFilterChange,
    onTrackFilterChange: (trackId) => {
      input.onFilterChange((current) => ({ ...current, trackId }));
    },
  };
}
