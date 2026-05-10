import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";

import {FieldAssistRow} from "../../../components";
import {ExpandedOverlayActionsViewModel, OverlayAssistViewModel} from "../overlayPanel.types";

const actionButtonSx = {
  flex: 1,
  minHeight: 44,
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

export function ExpandedOverlayActions(
  props: {
    actions: ExpandedOverlayActionsViewModel;
    assist: OverlayAssistViewModel;
  }
) {
  return (
    <Stack spacing={1.05}>
      <Stack
        alignItems="center"
        direction="row"
        flexWrap="wrap"
        gap={0.95}
        role="group"
        aria-describedby={props.assist.id}
        aria-label="Review actions"
        sx={{width: "100%"}}
      >
        <Button
          disabled={!props.actions.canRestart}
          onClick={props.actions.onRestart}
          sx={actionButtonSx}
          variant="outlined"
        >
          Restart
        </Button>
        <Button
          disabled={!props.actions.canUpdate}
          onClick={props.actions.onUpdate}
          sx={actionButtonSx}
          variant="outlined"
        >
          Update
        </Button>
        <Button
          disabled={!props.actions.canSubmit}
          onClick={props.actions.onSubmit}
          sx={actionButtonSx}
          variant="contained"
        >
          Submit
        </Button>
      </Stack>
      <Button
        color="error"
        disabled={!props.actions.canFail}
        fullWidth
        onClick={props.actions.onFail}
        variant="outlined"
      >
        I couldn&apos;t finish :(
      </Button>
      <FieldAssistRow id={props.assist.id} tone={props.assist.tone}>
        {props.assist.message}
      </FieldAssistRow>
    </Stack>
  );
}
