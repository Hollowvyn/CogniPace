import Autocomplete, { createFilterOptions } from "@mui/material/Autocomplete";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import InputLabel from "@mui/material/InputLabel";
import LinearProgress from "@mui/material/LinearProgress";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useEffect } from "react";

import { useProblemFormViewModel } from "../../store/problemFormStore";

import type { CompanyLabel, Difficulty } from "../../../domain/model";
import type { ProblemSlug } from "@shared/ids";

export interface ProblemFormDialogProps {
  slugId?: ProblemSlug;
}

const DIFFICULTY_OPTIONS: Difficulty[] = ["Easy", "Medium", "Hard", "Unknown"];
const CREATE_COMPANY_SENTINEL = "__create_company__";

const companyFilter = createFilterOptions<CompanyLabel>({
  matchFrom: "any",
  trim: true,
});

function extractSentinelName(label: string): string {
  const match = /^\+ Add "(.+)"$/.exec(label);
  return match?.[1]?.trim() ?? "";
}

export function ProblemFormDialog(props: ProblemFormDialogProps) {
  const dispatch = useProblemFormViewModel((state) => state.dispatch);
  const uiState = useProblemFormViewModel((state) => state.uiState);

  useEffect(() => {
    dispatch({ type: "Load", slugId: props.slugId });
  }, [dispatch, props.slugId]);

  return (
    <Dialog
      open
      onClose={() => dispatch({ type: "Cancel" })}
      fullWidth
      maxWidth="sm"
      aria-labelledby="problem-form-dialog-title"
    >
      <DialogTitle id="problem-form-dialog-title">{uiState.title}</DialogTitle>
      <DialogContent dividers>
        {uiState.isLoading ? <LinearProgress /> : null}

        {!uiState.isLoading && uiState.loadError ? (
          <Typography variant="body2" color="text.secondary">
            {uiState.loadError.message}
          </Typography>
        ) : null}

        {uiState.canRenderForm ? (
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            {uiState.mode === "create" ? (
              <TextField
                label="LeetCode URL or slug"
                value={uiState.values.problemInput}
                onChange={(event) =>
                  dispatch({
                    type: "ChangeProblemInput",
                    value: event.target.value,
                  })
                }
                fullWidth
                required
                size="small"
              />
            ) : null}

            <TextField
              label="Title"
              value={uiState.values.title}
              onChange={(event) =>
                dispatch({ type: "ChangeTitle", value: event.target.value })
              }
              fullWidth
              size="small"
            />

            <FormControl size="small" fullWidth>
              <InputLabel id="problem-form-difficulty">Difficulty</InputLabel>
              <Select
                labelId="problem-form-difficulty"
                label="Difficulty"
                value={uiState.values.difficulty}
                onChange={(event) =>
                  dispatch({
                    type: "SetDifficulty",
                    value: event.target.value as Difficulty,
                  })
                }
              >
                {DIFFICULTY_OPTIONS.map((value) => (
                  <MenuItem key={value} value={value}>
                    {value}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="LeetCode URL"
              value={uiState.values.url}
              onChange={(event) =>
                dispatch({ type: "ChangeUrl", value: event.target.value })
              }
              fullWidth
              size="small"
            />

            <Autocomplete
              multiple
              options={uiState.topicOptions}
              value={uiState.values.topics}
              onChange={(_, next) => {
                dispatch({ type: "SetTopics", value: next });
              }}
              isOptionEqualToValue={(option, value) =>
                typeof value !== "string" && option.id === value.id
              }
              getOptionLabel={(option) => option.name}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Topics"
                  placeholder="Choose topics..."
                  size="small"
                />
              )}
            />

            <Autocomplete<CompanyLabel, true, false, true>
              multiple
              freeSolo
              options={uiState.companyOptions}
              value={uiState.values.companies}
              filterOptions={(options, params) => {
                const filtered = companyFilter(options, params);
                const inputValue = params.inputValue.trim();
                const matchesExisting = options.some(
                  (option) =>
                    option.name.toLowerCase() === inputValue.toLowerCase()
                );
                if (inputValue && !matchesExisting) {
                  filtered.push({
                    id: CREATE_COMPANY_SENTINEL,
                    name: `+ Add "${inputValue}"`,
                  });
                }
                return filtered;
              }}
              onChange={(_, next) => {
                dispatch({
                  type: "SetCompanies",
                  value: next.map((entry) =>
                    typeof entry === "string" ||
                    entry.id !== CREATE_COMPANY_SENTINEL
                      ? entry
                      : extractSentinelName(entry.name)
                  ),
                });
              }}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              getOptionLabel={(option) =>
                typeof option === "string" ? option : option.name
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Companies"
                  placeholder="Type a company name to add a new one..."
                  size="small"
                />
              )}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={uiState.values.isPremium}
                  onChange={(event) =>
                    dispatch({
                      type: "SetPremium",
                      value: event.target.checked,
                    })
                  }
                />
              }
              label="LeetCode Premium"
            />
          </Stack>
        ) : null}

        {uiState.saveError ? (
          <Typography variant="body2" color="error" sx={{ mt: 2 }}>
            {uiState.saveError}
          </Typography>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button
          onClick={() => dispatch({ type: "Cancel" })}
          disabled={uiState.isSaving}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={() => dispatch({ type: "Save" })}
          disabled={!uiState.canSave}
        >
          {uiState.isSaving ? "Saving..." : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
