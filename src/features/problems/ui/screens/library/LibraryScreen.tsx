/**
 * Library screen — flat browse-everything view of every tracked
 * problem. Hosts the Edit Problem modal launched from the expanded
 * row panel. Driven by `useLibraryVM` per the canonical Screen+VM
 * pattern.
 *
 * The actual table (search / sort / filter / pagination / selection /
 * row expansion / Retention badge) is the shared `ProblemsTable`
 * primitive in `library` variant; this screen supplies the rows, the
 * extra Track filter, and the modal.
 */
import { SurfaceCard } from "@design-system/atoms";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";

import { ProblemsTable } from "../../components/problemsTable";
import { useLibraryVM, UseLibraryVMInput } from "../../hooks/useLibraryVM";

import { EditProblemModal } from "./EditProblemModal";

export type LibraryScreenProps = UseLibraryVMInput;

export function LibraryScreen(props: LibraryScreenProps) {
  const model = useLibraryVM(props);

  return (
    <SurfaceCard label="Library" title="All Tracked Problems">
      <ProblemsTable
        rows={model.tableRows}
        variant="library"
        padToPageSize
        selectable
        selectedSlugs={model.selectedSlugs}
        onSelectionChange={model.onSelectionChange}
        onEditProblem={model.onEditProblem}
        onSuspendProblem={model.onSuspendProblem}
        onResetSchedule={model.onResetSchedule}
        onEnablePremium={model.onEnablePremium}
        toolbarExtras={
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel id="library-filter-track-label">Track</InputLabel>
            <Select
              labelId="library-filter-track-label"
              label="Track"
              value={model.filters.trackId}
              onChange={(event) => {
                model.onTrackFilterChange(event.target.value);
              }}
            >
              <MenuItem value="all">All tracks</MenuItem>
              {model.trackOptions.map((option) => (
                <MenuItem key={option.trackId} value={option.trackId}>
                  {option.trackName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        }
      />

      <EditProblemModal
        open={model.isEditing}
        problem={model.editingRow?.view ?? null}
        topicChoices={model.topicChoices}
        companyChoices={model.companyChoices}
        onClose={model.onCloseEdit}
        onSaved={model.onSavedEdit}
      />
    </SurfaceCard>
  );
}
