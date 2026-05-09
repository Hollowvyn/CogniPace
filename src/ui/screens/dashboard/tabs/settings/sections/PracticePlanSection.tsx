import Stack from "@mui/material/Stack";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";

import { StudyMode, UserSettings } from "../../../../../../domain/settings";
import { SurfaceControlRow } from "../../../../../components";
import { NumberSetting } from "../components/SettingsInputs";
import { SettingsUpdate } from "../settingsTypes";

export function PracticePlanSection(props: {
  onUpdateSettings: SettingsUpdate;
  settingsDraft: UserSettings;
}) {
  return (
    <Stack spacing={1}>
      <NumberSetting
        label="Daily Question Goal"
        min={0}
        onChange={(value) => {
          props.onUpdateSettings((current) => ({
            ...current,
            dailyQuestionGoal: value,
          }));
        }}
        value={props.settingsDraft.dailyQuestionGoal}
      />
      <SurfaceControlRow
        control={
          <ToggleButtonGroup
            aria-label="Study Mode"
            exclusive
            onChange={(_, value: StudyMode | null) => {
              if (!value) {
                return;
              }
              props.onUpdateSettings((current) => ({
                ...current,
                studyMode: value,
              }));
            }}
            size="small"
            value={props.settingsDraft.studyMode}
          >
            <ToggleButton value="studyPlan">Study plan</ToggleButton>
            <ToggleButton value="freestyle">Freestyle</ToggleButton>
          </ToggleButtonGroup>
        }
        helper="Study plan follows the active course; freestyle uses queue priority only."
        label="Study mode"
      />
    </Stack>
  );
}
