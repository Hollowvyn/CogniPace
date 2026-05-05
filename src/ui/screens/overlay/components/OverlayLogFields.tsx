import ClearRounded from "@mui/icons-material/ClearRounded";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";

import {SurfaceSectionLabel, SurfaceTooltip} from "../../../components";
import {OverlayDraftLogFields, OverlayLogSectionViewModel} from "../overlayPanel.types";

function DraftField(
  props: {
    ariaLabel: string;
    field: keyof OverlayDraftLogFields;
    label: string;
    name: string;
    log: OverlayLogSectionViewModel;
    multiline?: boolean;
    rows?: number;
  }
) {
  const hasValue = props.log.draft[props.field].trim().length > 0;

  return (
    <TextField
      autoComplete="off"
      fullWidth
      InputProps={{
        endAdornment: hasValue ? (
          <InputAdornment position="end">
            <SurfaceTooltip title={`Clear ${props.label}`}>
              <IconButton
                aria-label={`Clear ${props.label}`}
                edge="end"
                onClick={() => {
                  props.log.onChange(props.field, "");
                }}
                onMouseDown={(event) => {
                  event.preventDefault();
                }}
                size="small"
              >
                <ClearRounded fontSize="small"/>
              </IconButton>
            </SurfaceTooltip>
          </InputAdornment>
        ) : undefined,
      }}
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
          autoComplete: "off",
          name: props.name,
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
      <SurfaceSectionLabel>Log</SurfaceSectionLabel>
      <DraftField
        ariaLabel="Interview pattern"
        field="interviewPattern"
        label="Interview pattern"
        log={props.log}
        name="overlay-interview-pattern"
      />
      <Stack direction="row" spacing={1.25}>
        <DraftField
          ariaLabel="Time complexity"
          field="timeComplexity"
          label="Time complexity"
          log={props.log}
          name="overlay-time-complexity"
        />
        <DraftField
          ariaLabel="Space complexity"
          field="spaceComplexity"
          label="Space complexity"
          log={props.log}
          name="overlay-space-complexity"
        />
      </Stack>
      <DraftField
        ariaLabel="Languages used"
        field="languages"
        label="Languages used"
        log={props.log}
        name="overlay-languages"
      />
      <DraftField
        ariaLabel="Notes"
        field="notes"
        label="Notes"
        log={props.log}
        multiline
        name="overlay-notes"
        rows={5}
      />
    </Stack>
  );
}
