import FormControl from "@mui/material/FormControl";
import InputAdornment from "@mui/material/InputAdornment";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select, { SelectChangeEvent } from "@mui/material/Select";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import { ReactNode } from "react";

import { SurfaceControlRow } from "../../../../../components";

export function NumberSetting(props: {
  error?: boolean;
  helperText?: string;
  label: string;
  max?: number;
  min?: number;
  onChange: (value: number) => void;
  suffix?: string;
  value: number;
}) {
  return (
    <TextField
      error={props.error}
      fullWidth
      helperText={props.helperText}
      label={props.label}
      onChange={(event) => {
        const raw = event.target.value;
        const parsed = parseInt(raw, 10);
        props.onChange(isNaN(parsed) ? 0 : parsed);
      }}
      size="small"
      slotProps={{
        htmlInput: {
          "aria-label": props.label,
          max: props.max,
          min: props.min,
        },
        input: props.suffix
          ? {
              endAdornment: (
                <InputAdornment position="end">{props.suffix}</InputAdornment>
              ),
            }
          : undefined,
      }}
      sx={{
        "& input[type=number]": {
          MozAppearance: "textfield",
        },
        "& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button":
          {
            WebkitAppearance: "none",
            margin: 0,
          },
      }}
      type="number"
      value={props.value}
    />
  );
}

export function SelectSetting<TValue extends string>(props: {
  label: string;
  onChange: (value: TValue) => void;
  options: Array<{ label: string; value: TValue }>;
  value: TValue;
}) {
  const labelId = `${props.label.toLowerCase().replace(/\W+/g, "-")}-label`;

  return (
    <FormControl fullWidth size="small">
      <InputLabel id={labelId}>{props.label}</InputLabel>
      <Select
        label={props.label}
        labelId={labelId}
        onChange={(event: SelectChangeEvent<TValue>) => {
          props.onChange(event.target.value as TValue);
        }}
        value={props.value}
      >
        {props.options.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

export function SwitchSetting(props: {
  checked: boolean;
  disabled?: boolean;
  helper?: ReactNode;
  label: ReactNode;
  name: string;
  onChange?: (checked: boolean) => void;
}) {
  return (
    <SurfaceControlRow
      control={
        <Switch
          checked={props.checked}
          disabled={props.disabled}
          onChange={(event) => {
            props.onChange?.(event.target.checked);
          }}
          slotProps={{
            input: {
              "aria-label": props.name,
            },
          }}
        />
      }
      helper={props.helper}
      label={props.label}
    />
  );
}

export function TimeSetting(props: {
  disabled?: boolean;
  label: string;
  onChange: (time: string) => void;
  value: string;
}) {
  return (
    <TextField
      disabled={props.disabled}
      fullWidth
      label={props.label}
      onChange={(event) => {
        props.onChange(event.target.value);
      }}
      size="small"
      slotProps={{
        htmlInput: {
          "aria-label": props.label,
        },
      }}
      type="time"
      value={props.value}
    />
  );
}
