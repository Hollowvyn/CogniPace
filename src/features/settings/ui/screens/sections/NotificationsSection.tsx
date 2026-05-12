import { UserSettings } from "@features/settings";
import Stack from "@mui/material/Stack";

import { SwitchSetting, TimeSetting } from "../components/SettingsInputs";
import { SettingsUpdate } from "../settingsTypes";

export function NotificationsSection(props: {
  onUpdateSettings: SettingsUpdate;
  settingsDraft: UserSettings;
}) {
  const disabled = !props.settingsDraft.notifications.enabled;

  return (
    <Stack spacing={1}>
      <SwitchSetting
        checked={props.settingsDraft.notifications.enabled}
        helper="Runs once per day at the local reminder time."
        label="Enable reminders"
        name="Enable reminders"
        onChange={(checked) => {
          props.onUpdateSettings((current) => ({
            ...current,
            notifications: {
              ...current.notifications,
              enabled: checked,
            },
          }));
        }}
      />
      <TimeSetting
        disabled={disabled}
        label="Notification Time"
        onChange={(value) => {
          props.onUpdateSettings((current) => ({
            ...current,
            notifications: {
              ...current.notifications,
              dailyTime: value,
            },
          }));
        }}
        value={props.settingsDraft.notifications.dailyTime}
      />
    </Stack>
  );
}
