import Chip from "@mui/material/Chip";
import { alpha } from "@mui/material/styles";
import { memo } from "react";

import { toneStyles } from "../tone";

import type { Tone } from "../tone";
import type { Difficulty } from "@libs/leetcode";

const difficultyChipTypography = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 0,
  lineHeight: "18px",
  textTransform: "none",
} as const;

type DifficultyChipUi = {
  backgroundColor: string;
  borderColor: string;
  color: string;
  typography: typeof difficultyChipTypography;
};

function createDifficultyChipUi(tone: Tone): DifficultyChipUi {
  const toneStyle = toneStyles[tone];
  return {
    backgroundColor: toneStyle.background,
    borderColor: alpha(toneStyle.color, 0.24),
    color: toneStyle.color,
    typography: difficultyChipTypography,
  };
}

const difficultyChipUiByDifficulty: Record<Difficulty, DifficultyChipUi> = {
  Easy: createDifficultyChipUi("info"),
  Medium: createDifficultyChipUi("accent"),
  Hard: createDifficultyChipUi("danger"),
  Unknown: createDifficultyChipUi("default"),
};

export const DifficultyChip = memo(function DifficultyChip(props: {
  difficulty: Difficulty;
}) {
  const ui = difficultyChipUiByDifficulty[props.difficulty];

  return (
    <Chip
      label={props.difficulty}
      size="small"
      sx={{
        backgroundColor: ui.backgroundColor,
        border: `1px solid ${ui.borderColor}`,
        color: ui.color,
        height: 20,
        minHeight: 20,
        ...ui.typography,
        "& .MuiChip-label": {
          px: 0.75,
          py: 0,
          ...ui.typography,
        },
      }}
    />
  );
});
