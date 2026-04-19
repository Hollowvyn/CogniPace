import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

import {OverlayDraftLogFields, OverlayLogSectionViewModel} from "../overlayPanel.types";

function DraftField(
  props: {
    ariaLabel: string;
    field: keyof OverlayDraftLogFields;
    label: string;
    log: OverlayLogSectionViewModel;
    multiline?: boolean;
    rows?: number;
  }
) {
  return (
    <TextField
      fullWidth
      label={props.label}
      multiline={props.multiline}
      onChange={(event) => {
        props.log.onChange(props.field, event.target.value);
      }}
      rows={props.rows}
      size="small"
      slotProps={{
        htmlInput: {
          "aria-label": props.ariaLabel,
        },
      }}
      value={props.log.draft[props.field]}
    />
  );
}

export function OverlayLogFields(
  props: {
    log: OverlayLogSectionViewModel;
  }
) {
  return (
    <Stack spacing={1.5}>
      <Typography color="text.secondary" variant="overline">
        Log
      </Typography>
      <DraftField
        ariaLabel="Interview pattern"
        field="interviewPattern"
        label="Interview pattern"
        log={props.log}
      />
      <Stack direction="row" spacing={1.25}>
        <DraftField
          ariaLabel="Time complexity"
          field="timeComplexity"
          label="Time complexity"
          log={props.log}
        />
        <DraftField
          ariaLabel="Space complexity"
          field="spaceComplexity"
          label="Space complexity"
          log={props.log}
        />
      </Stack>
      <DraftField
        ariaLabel="Languages used"
        field="languages"
        label="Languages used"
        log={props.log}
      />
      <DraftField
        ariaLabel="Notes"
        field="notes"
        label="Notes"
        log={props.log}
        multiline
        rows={5}
      />
    </Stack>
  );
}
