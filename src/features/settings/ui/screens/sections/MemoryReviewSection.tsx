import { SurfaceControlRow } from "@design-system/atoms";
import Box from "@mui/material/Box";
import Slider from "@mui/material/Slider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { ReactNode } from "react";


import { SelectSetting } from "../components/SettingsInputs";

import type { ReviewOrder, UserSettings } from "@features/settings";

const retentionMarks = [
  { label: "70%", value: 0.7 },
  { label: "85%", value: 0.85 },
  { label: "95%", value: 0.95 },
];
const retentionMin = 0.7;
const retentionMax = 0.95;

function SliderSetting(props: {
  helper: ReactNode;
  label: string;
  onChange: (value: number) => void;
  value: number;
}) {
  return (
    <SurfaceControlRow>
      <Stack spacing={1} sx={{ width: "100%" }}>
        <Stack
          alignItems="flex-start"
          direction="row"
          justifyContent="space-between"
          spacing={1}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2">{props.label}</Typography>
            <Typography color="text.secondary" variant="caption">
              {props.helper}
            </Typography>
          </Box>
          <Typography
            sx={{ fontVariantNumeric: "tabular-nums" }}
            variant="body2"
          >
            {Math.round(props.value * 100)}%
          </Typography>
        </Stack>
        <Slider
          aria-label={props.label}
          getAriaValueText={(value) => `${Math.round(value * 100)}%`}
          marks={retentionMarks.map((mark) => ({ value: mark.value }))}
          max={retentionMax}
          min={retentionMin}
          onChange={(_, value) => {
            props.onChange(value as number);
          }}
          step={0.01}
          sx={{ mt: 0.5 }}
          value={props.value}
          valueLabelDisplay="auto"
          valueLabelFormat={(value) => `${Math.round(value * 100)}%`}
        />
        <Box aria-hidden="true" sx={{ height: 18, position: "relative" }}>
          {retentionMarks.map((mark) => (
            <Typography
              component="span"
              key={mark.value}
              sx={{
                color: "text.secondary",
                left: `${((mark.value - retentionMin) / (retentionMax - retentionMin)) * 100}%`,
                lineHeight: 1.25,
                position: "absolute",
                transform:
                  mark.value === retentionMin
                    ? "translateX(0)"
                    : mark.value === retentionMax
                      ? "translateX(-100%)"
                      : "translateX(-50%)",
              }}
            >
              {mark.label}
            </Typography>
          ))}
        </Box>
      </Stack>
    </SurfaceControlRow>
  );
}

export function MemoryReviewSection(props: {
  onUpdateSettings: (updater: (current: UserSettings) => UserSettings) => void;
  settingsDraft: UserSettings;
}) {
  return (
    <Stack spacing={1}>
      <SliderSetting
        helper="Cards become due when retrievability drops below this threshold."
        label="Target Retention"
        onChange={(value) => {
          props.onUpdateSettings((current) => ({
            ...current,
            memoryReview: {
              ...current.memoryReview,
              targetRetention: value,
            },
          }));
        }}
        value={props.settingsDraft.memoryReview.targetRetention}
      />
      <SelectSetting<ReviewOrder>
        label="Review Order"
        onChange={(value) => {
          props.onUpdateSettings((current) => ({
            ...current,
            memoryReview: {
              ...current.memoryReview,
              reviewOrder: value,
            },
          }));
        }}
        options={[
          { label: "Due First", value: "dueFirst" },
          { label: "Mix By Difficulty", value: "mixByDifficulty" },
          { label: "Weakest First", value: "weakestFirst" },
        ]}
        value={props.settingsDraft.memoryReview.reviewOrder}
      />
    </Stack>
  );
}
