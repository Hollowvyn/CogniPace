/**
 * Dashboard library screen — flat browse-everything view of every tracked
 * problem. Hosts the Edit Problem modal launched from the expanded row
 * panel.
 *
 * The actual table (search / sort / filter / pagination / selection /
 * row expansion / Retention badge) is the shared `ProblemsTable`
 * primitive in `library` variant; this view supplies the rows, the
 * extra Track filter, and the secondary action handlers.
 */
import { SurfaceCard } from "@design-system/atoms";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import React, { useMemo, useState } from "react";

import {
  resetProblemSchedule,
  suspendProblem,
} from "../../../../../data/repositories/v7ActionRepository";
import { LibraryFilters } from "../../../../../ui/presentation/library";
import {
  ProblemsTable,
  type ProblemRowData,
  type ProblemSelection,
} from "../../components/problemsTable";

import { EditProblemModal } from "./EditProblemModal";

import type { LibraryProblemRow } from "../../../domain/model";
import type { AppShellPayload } from "@features/app-shell";
import type { ProblemSlug } from "@shared/ids";

export interface LibraryViewProps {
  filters: LibraryFilters;
  onFilterChange: React.Dispatch<React.SetStateAction<LibraryFilters>>;
  onEnablePremium: () => Promise<void>;
  onOpenProblem: (target: { slug: string }) => Promise<void>;
  onRefresh?: () => Promise<void>;
  payload: AppShellPayload | null;
  rows: LibraryProblemRow[];
}

export function LibraryView(props: LibraryViewProps) {
  const trackOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const row of props.rows) {
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
  }, [props.rows]);

  const visibleRows = useMemo(() => {
    if (props.filters.trackId === "all") return props.rows;
    return props.rows.filter((row) =>
      (row.trackMemberships ?? []).some(
        (member) => member.trackId === props.filters.trackId,
      ),
    );
  }, [props.filters.trackId, props.rows]);

  const tableRows: ProblemRowData[] = useMemo(
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

  const handleEdit = (slug: ProblemSlug) => {
    // Drop focus from the trigger row/menu before opening the modal so
    // MUI's aria-hidden on <main id="app-shell"> never lands while a
    // descendant retains focus (Chrome a11y audit complains otherwise).
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setEditingSlug(slug);
  };
  const handleSuspend = async (slug: ProblemSlug, suspend: boolean) => {
    await suspendProblem({ slug, suspend });
    await props.onRefresh?.();
  };
  const handleReset = async (slug: ProblemSlug) => {
    await resetProblemSchedule({ slug });
    await props.onRefresh?.();
  };

  return (
    <SurfaceCard label="Library" title="All Tracked Problems">
      <ProblemsTable
        rows={tableRows}
        variant="library"
        padToPageSize
        selectable
        selectedSlugs={selectedSlugs}
        onSelectionChange={setSelectedSlugs}
        onEditProblem={handleEdit}
        onSuspendProblem={handleSuspend}
        onResetSchedule={handleReset}
        onEnablePremium={() => void props.onEnablePremium()}
        toolbarExtras={
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel id="library-filter-track-label">Track</InputLabel>
            <Select
              labelId="library-filter-track-label"
              label="Track"
              value={props.filters.trackId}
              onChange={(event) => {
                props.onFilterChange((current) => ({
                  ...current,
                  trackId: event.target.value,
                }));
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
        }
      />

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
    </SurfaceCard>
  );
}
