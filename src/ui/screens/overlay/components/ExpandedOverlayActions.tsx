import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";

import {ExpandedOverlayActionsViewModel} from "../overlayPanel.types";

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
  }
) {
  return (
    <Stack spacing={1.05}>
      <Stack
        alignItems="center"
        direction="row"
        flexWrap="wrap"
        gap={0.95}
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
    </Stack>
  );
}
