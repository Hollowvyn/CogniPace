import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";

import { StudyMode } from "../../../../domain/types";

export interface PopupActionsProps {
  onOpenDashboard: () => void;
  onToggleStudyMode: () => Promise<void>;
  studyMode?: StudyMode;
}

export function PopupActions(props: PopupActionsProps) {
  return (
    <Stack spacing={1}>
      <Button
        fullWidth
        onClick={() => {
          void props.onToggleStudyMode();
        }}
        variant="outlined"
      >
        {props.studyMode === "studyPlan" ? "Study Mode" : "Freestyle"}
      </Button>
      <Button fullWidth onClick={props.onOpenDashboard} variant="contained">
        Full Dashboard
      </Button>
    </Stack>
  );
}
