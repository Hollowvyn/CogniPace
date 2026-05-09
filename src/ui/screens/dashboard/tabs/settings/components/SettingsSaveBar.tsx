import RestartAltRounded from "@mui/icons-material/RestartAltRounded";
import SaveRounded from "@mui/icons-material/SaveRounded";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";

import { SurfacePanel } from "../../../../../components";

import { SettingsActionSection } from "./SettingsLayout";

export function SettingsSaveBar(props: {
  canDiscardSettings: boolean;
  canResetSettingsToDefaults: boolean;
  canSaveSettings: boolean;
  onDiscardSettings: () => void;
  onResetSettingsToDefaults: () => void;
  onSaveSettings: () => void;
}) {
  return (
    <SurfacePanel
      sx={{
        alignItems: { sm: "center", xs: "stretch" },
        display: "flex",
        flexDirection: { sm: "row", xs: "column" },
        gap: 1,
        justifyContent: "space-between",
        p: { md: 1.5, xs: 1.25 },
      }}
    >
      <Typography color="text.secondary" variant="body2">
        Save persists all settings sections in one local update.
      </Typography>
      <SettingsActionSection>
        <Button
          disabled={!props.canResetSettingsToDefaults}
          onClick={props.onResetSettingsToDefaults}
          startIcon={<RestartAltRounded />}
          variant="outlined"
        >
          Reset Defaults
        </Button>
        <Button
          disabled={!props.canDiscardSettings}
          onClick={props.onDiscardSettings}
          variant="outlined"
        >
          Discard Changes
        </Button>
        <Button
          disabled={!props.canSaveSettings}
          onClick={props.onSaveSettings}
          startIcon={<SaveRounded />}
          variant="contained"
        >
          Save Settings
        </Button>
      </SettingsActionSection>
    </SurfacePanel>
  );
}
