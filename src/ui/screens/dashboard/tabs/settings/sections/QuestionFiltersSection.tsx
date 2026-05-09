import Stack from "@mui/material/Stack";

import { UserSettings } from "../../../../../../domain/settings";
import { SwitchSetting } from "../components/SettingsInputs";
import { SettingsUpdate } from "../settingsTypes";

export function QuestionFiltersSection(props: {
  onUpdateSettings: SettingsUpdate;
  settingsDraft: UserSettings;
}) {
  return (
    <Stack spacing={1}>
      <SwitchSetting
        checked={props.settingsDraft.questionFilters.skipIgnored}
        helper="Keeps suspended questions out of generated practice queues."
        label="Skip ignored questions"
        name="Skip ignored questions"
        onChange={(checked) => {
          props.onUpdateSettings((current) => ({
            ...current,
            questionFilters: {
              ...current.questionFilters,
              skipIgnored: checked,
            },
          }));
        }}
      />
      <SwitchSetting
        checked={props.settingsDraft.questionFilters.skipPremium}
        helper="Only applies when a problem has premium-only metadata."
        label="Skip premium questions"
        name="Skip premium questions"
        onChange={(checked) => {
          props.onUpdateSettings((current) => ({
            ...current,
            questionFilters: {
              ...current.questionFilters,
              skipPremium: checked,
            },
          }));
        }}
      />
    </Stack>
  );
}
