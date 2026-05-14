/** LibraryScreen's ViewModel — owns modal state, selection state, and
 *  per-row mutations (suspend, reset schedule). Filters/rows still come
 *  from the dashboard shell's shared app-shell query for now; when the
 *  library grows its own data path, the VM gains its own reads and the
 *  screen stops needing those props. */
import { api } from "@app/api";
import { useMemo, useState } from "react";

import { LibraryFilters } from "../presentation/library";

import type { LibraryProblemRow } from "../../domain/model";
import type { ProblemRowData, ProblemSelection } from "../components/problemsTable";
import type { AppShellPayload } from "@features/app-shell";
import type { ProblemSlug } from "@shared/ids";
import type React from "react";

export interface LibraryTrackOption {
  trackId: string;
  trackName: string;
}

export interface LibraryScreenModel {
  trackOptions: LibraryTrackOption[];
  tableRows: ProblemRowData[];
  editingRow: LibraryProblemRow | null;
  isEditing: boolean;
  selectedSlugs: ProblemSelection;
  topicChoices: AppShellPayload["topicChoices"];
  companyChoices: AppShellPayload["companyChoices"];
  filters: LibraryFilters;
  onSelectionChange: (selection: ProblemSelection) => void;
  onFilterChange: React.Dispatch<React.SetStateAction<LibraryFilters>>;
  onTrackFilterChange: (trackId: string) => void;
  onEditProblem: (slug: ProblemSlug) => void;
  onCloseEdit: () => void;
  onSavedEdit: () => Promise<void>;
  onSuspendProblem: (slug: ProblemSlug, suspend: boolean) => Promise<void>;
  onResetSchedule: (slug: ProblemSlug) => Promise<void>;
  onEnablePremium: () => void;
}

export interface UseLibraryVMInput {
  filters: LibraryFilters;
  onFilterChange: React.Dispatch<React.SetStateAction<LibraryFilters>>;
  onEnablePremium: () => Promise<void>;
  onRefresh?: () => Promise<void>;
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

  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [selectedSlugs, setSelectedSlugs] = useState<ProblemSelection>(
    () => new Set(),
  );

  const editingRow = useMemo(
    () => visibleRows.find((row) => row.view.slug === editingSlug) ?? null,
    [visibleRows, editingSlug],
  );

  return {
    trackOptions,
    tableRows,
    editingRow,
    isEditing: editingSlug !== null,
    selectedSlugs,
    topicChoices: input.payload?.topicChoices ?? [],
    companyChoices: input.payload?.companyChoices ?? [],
    filters: input.filters,
    onSelectionChange: setSelectedSlugs,
    onFilterChange: input.onFilterChange,
    onTrackFilterChange: (trackId) => {
      input.onFilterChange((current) => ({ ...current, trackId }));
    },
    onEditProblem: (slug) => {
      // Drop focus from the trigger row/menu before opening the modal so
      // MUI's aria-hidden on <main id="app-shell"> never lands while a
      // descendant retains focus (Chrome a11y audit complains otherwise).
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      setEditingSlug(slug);
    },
    onCloseEdit: () => setEditingSlug(null),
    onSavedEdit: async () => {
      await input.onRefresh?.();
    },
    onSuspendProblem: async (slug, suspend) => {
      await api.suspendProblem({ slug, suspend });
      await input.onRefresh?.();
    },
    onResetSchedule: async (slug) => {
      await api.resetProblemSchedule({ slug });
      await input.onRefresh?.();
    },
    onEnablePremium: () => void input.onEnablePremium(),
  };
}
