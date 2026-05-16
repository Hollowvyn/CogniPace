import { SurfaceCard } from "@design-system/atoms";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";

import { EditProblemModalConnected } from "../../components/EditProblemModalConnected";
import { ProblemsTable } from "../../components/problemsTable";
import { useLibraryVM, UseLibraryVMInput } from "../../hooks/useLibraryVM";

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

      <EditProblemModalConnected />
    </SurfaceCard>
  );
}
