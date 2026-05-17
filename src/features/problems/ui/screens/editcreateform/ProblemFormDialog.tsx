import Autocomplete from "@mui/material/Autocomplete";
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
import { useEffect, useState } from "react";
import { useStore } from "zustand";

import { createProblemFormViewModel } from "./viewmodel/problemFormStore";

import type { Difficulty } from "../../../domain/model";
import type { ProblemSlug } from "@shared/ids";

export type ProblemFormDialogCloseReason =
  | { type: "cancel" }
  | { mode: "create" | "edit"; slugId: ProblemSlug; type: "saved" };

export interface ProblemFormDialogProps {
  onClose: (reason: ProblemFormDialogCloseReason) => void;
  slugId?: ProblemSlug;
}

const DIFFICULTY_OPTIONS: Difficulty[] = ["Easy", "Medium", "Hard", "Unknown"];

export function ProblemFormDialog(props: ProblemFormDialogProps) {
  const { onClose, slugId } = props;
  const [store] = useState(createProblemFormViewModel);
  const { dispatch, uiEffect, uiState } = useStore(
    store,
    (state) => state
  );
  const controlsDisabled = uiState.isSaving;

  useEffect(() => {
    dispatch({ type: "Load", slugId });
  }, [dispatch, slugId]);

  useEffect(() => {
    if (!uiEffect) {
      return;
    }
    onClose({
      mode: uiEffect.mode,
      slugId: uiEffect.slugId,
      type: "saved",
    });
  }, [onClose, uiEffect]);

  return (
    <Dialog
      open
      onClose={() => {
        if (!uiState.isSaving) {
          onClose({ type: "cancel" });
        }
      }}
      disableEscapeKeyDown={uiState.isSaving}
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
                disabled={controlsDisabled}
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
              disabled={controlsDisabled}
              fullWidth
              size="small"
            />

            <FormControl size="small" fullWidth disabled={controlsDisabled}>
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
              disabled={controlsDisabled}
              fullWidth
              size="small"
            />

            <Autocomplete
              multiple
              disabled={controlsDisabled}
              options={uiState.topicOptions}
              value={uiState.values.topics}
              onChange={(_, next) => {
                dispatch({ type: "SetTopics", value: next });
              }}
              isOptionEqualToValue={(option, value) => option.id === value.id}
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

            <Autocomplete
              multiple
              disabled={controlsDisabled}
              options={uiState.companyOptions}
              value={uiState.values.companies}
              onChange={(_, next) => {
                dispatch({
                  type: "SetCompanies",
                  value: next,
                });
              }}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              getOptionLabel={(option) => option.name}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Companies"
                  placeholder="Choose companies..."
                  size="small"
                />
              )}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={uiState.values.isPremium}
                  disabled={controlsDisabled}
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
          onClick={() => onClose({ type: "cancel" })}
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
