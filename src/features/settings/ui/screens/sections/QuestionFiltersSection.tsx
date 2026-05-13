import { UserSettings } from "@features/settings";
import Stack from "@mui/material/Stack";

import { SwitchSetting } from "../components/SettingsInputs";

export function QuestionFiltersSection(props: {
  onUpdateSettings: (updater: (current: UserSettings) => UserSettings) => void;
  settingsDraft: UserSettings;
}) {
  return (
    <Stack spacing={1}>
      <SwitchSetting
        checked={props.settingsDraft.questionFilters.skipPremium}
        helper="Premium-locked questions are treated as suspended — kept out of the queue and badged in the library."
        label="Treat premium as suspended"
        name="Treat premium as suspended"
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
