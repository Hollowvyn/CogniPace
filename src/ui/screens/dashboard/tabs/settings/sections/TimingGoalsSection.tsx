import InputAdornment from "@mui/material/InputAdornment";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useState } from "react";

import { UserSettings } from "../../../../../../domain/settings";
import { SwitchSetting } from "../components/SettingsInputs";
import { SurfaceFieldGrid } from "../../../../../components";
import {
  createGoalTextDraft,
  minutesToMs,
  parseGoalMinutes,
  resolveGoalTextDraft,
} from "../GoalTextDraft";
import { SettingsUpdate } from "../settingsTypes";

export function TimingGoalsSection(props: {
  onUpdateSettings: SettingsUpdate;
  settingsDraft: UserSettings;
}) {
  const draftEasyMs = props.settingsDraft.timing.difficultyGoalMs.Easy;
  const draftMediumMs = props.settingsDraft.timing.difficultyGoalMs.Medium;
  const draftHardMs = props.settingsDraft.timing.difficultyGoalMs.Hard;

  const [easyDraft, setEasyDraft] = useState(() =>
    createGoalTextDraft(draftEasyMs)
  );
  const [mediumDraft, setMediumDraft] = useState(() =>
    createGoalTextDraft(draftMediumMs)
  );
  const [hardDraft, setHardDraft] = useState(() =>
    createGoalTextDraft(draftHardMs)
  );

  const easyStr = resolveGoalTextDraft(easyDraft, draftEasyMs).value;
  const mediumStr = resolveGoalTextDraft(mediumDraft, draftMediumMs).value;
  const hardStr = resolveGoalTextDraft(hardDraft, draftHardMs).value;

  const easyMin = parseGoalMinutes(easyStr);
  const mediumMin = parseGoalMinutes(mediumStr);
  const hardMin = parseGoalMinutes(hardStr);

  const easyError =
    easyStr === ""
      ? "Required"
      : easyMin < 10
        ? "Min 10"
        : easyMin > 58
          ? "Max 58"
          : mediumStr !== "" && easyMin >= mediumMin
            ? "Must be < Medium"
            : undefined;
  const mediumError =
    mediumStr === ""
      ? "Required"
      : mediumMin > 59
        ? "Max 59"
        : easyStr !== "" && mediumMin <= easyMin
          ? "Must be > Easy"
          : hardStr !== "" && mediumMin >= hardMin
            ? "Must be < Hard"
            : undefined;
  const hardError =
    hardStr === ""
      ? "Required"
      : hardMin > 60
        ? "Max 60"
        : mediumStr !== "" && hardMin <= mediumMin
          ? "Must be > Medium"
          : undefined;

  const updateDraftMs = (eMin: number, mMin: number, hMin: number) => {
    props.onUpdateSettings((current) => ({
      ...current,
      timing: {
        ...current.timing,
        difficultyGoalMs: {
          ...current.timing.difficultyGoalMs,
          Easy: minutesToMs(eMin),
          Medium: minutesToMs(mMin),
          Hard: minutesToMs(hMin),
        },
      },
    }));
  };

  const commonTextFieldProps = {
    fullWidth: true,
    size: "small" as const,
    type: "text",
    slotProps: {
      input: {
        endAdornment: <InputAdornment position="end">min</InputAdornment>,
      },
    },
    inputProps: {
      inputMode: "numeric" as const,
    },
  };

  return (
    <Stack spacing={1}>
      <SurfaceFieldGrid columns={2}>
        <SwitchSetting
          checked={props.settingsDraft.timing.requireSolveTime}
          helper="Overlay submissions can require a recorded timer value."
          label="Require solve time"
          name="Require solve time"
          onChange={(checked) => {
            props.onUpdateSettings((current) => ({
              ...current,
              timing: {
                ...current.timing,
                requireSolveTime: checked,
              },
            }));
          }}
        />
        <SwitchSetting
          checked={props.settingsDraft.timing.hardMode}
          disabled={!props.settingsDraft.timing.requireSolveTime}
          helper="Enables stricter assessment criteria."
          label="Hard mode"
          name="Hard mode"
          onChange={(checked) => {
            props.onUpdateSettings((current) => ({
              ...current,
              timing: {
                ...current.timing,
                hardMode: checked,
              },
            }));
          }}
        />
      </SurfaceFieldGrid>
      <SurfaceFieldGrid columns={3}>
        <TextField
          {...commonTextFieldProps}
          error={Boolean(easyError)}
          helperText={easyError}
          label="Easy goal"
          onChange={(event) => {
            const raw = event.target.value;
            if (raw !== "" && !/^\d+$/.test(raw)) return;
            const minutes = parseGoalMinutes(raw);
            setEasyDraft({ sourceMs: minutesToMs(minutes), value: raw });
            updateDraftMs(minutes, mediumMin, hardMin);
          }}
          value={easyStr}
        />
        <TextField
          {...commonTextFieldProps}
          error={Boolean(mediumError)}
          helperText={mediumError}
          label="Medium goal"
          onChange={(event) => {
            const raw = event.target.value;
            if (raw !== "" && !/^\d+$/.test(raw)) return;
            const minutes = parseGoalMinutes(raw);
            setMediumDraft({ sourceMs: minutesToMs(minutes), value: raw });
            updateDraftMs(easyMin, minutes, hardMin);
          }}
          value={mediumStr}
        />
        <TextField
          {...commonTextFieldProps}
          error={Boolean(hardError)}
          helperText={hardError}
          label="Hard goal"
          onChange={(event) => {
            const raw = event.target.value;
            if (raw !== "" && !/^\d+$/.test(raw)) return;
            const minutes = parseGoalMinutes(raw);
            setHardDraft({ sourceMs: minutesToMs(minutes), value: raw });
            updateDraftMs(easyMin, mediumMin, minutes);
          }}
          value={hardStr}
        />
      </SurfaceFieldGrid>
      <Typography color="text.secondary" variant="caption">
        Questions with unknown difficulty use the Hard goal. Invalid goals are
        coerced when saving.
      </Typography>
    </Stack>
  );
}
