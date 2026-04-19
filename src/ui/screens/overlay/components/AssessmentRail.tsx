import Stack from "@mui/material/Stack";
import {alpha} from "@mui/material/styles";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";

import {Rating} from "../../../../domain/types";
import {kineticTokens} from "../../../theme";
import {OverlayAssessmentSectionViewModel} from "../overlayPanel.types";

interface AssessmentOption {
  color: string;
  copy: string;
  label: string;
  rating: Rating;
}

const assessmentOptions: AssessmentOption[] = [
  {
    color: kineticTokens.success,
    copy: "Fast",
    label: "Easy",
    rating: 3,
  },
  {
    color: "#c2cf70",
    copy: "Stable",
    label: "Good",
    rating: 2,
  },
  {
    color: kineticTokens.accentSoft,
    copy: "Lagging",
    label: "Hard",
    rating: 1,
  },
  {
    color: kineticTokens.danger,
    copy: "Failed",
    label: "Again",
    rating: 0,
  },
];

const assessmentRailDividerColor = alpha(kineticTokens.mutedText, 0.12);

function assessmentToggleSx(color: string) {
  return {
    alignItems: "stretch",
    backgroundColor: alpha(color, 0.08),
    color: alpha(color, 0.94),
    flex: 1,
    minHeight: 76,
    minWidth: 0,
    px: 1.1,
    py: 1.05,
    textAlign: "center",
    transition: "background-color 160ms ease, border-color 160ms ease, color 160ms ease",
    "& .assessment-label": {
      color: alpha(color, 0.92),
    },
    "& .assessment-copy": {
      color: alpha(color, 0.72),
    },
    "&.Mui-selected": {
      backgroundColor: alpha(color, 0.75),
      boxShadow: `inset 0 0 0 1px ${alpha(color, 0.85)}`,
      color: kineticTokens.text,
    },
    "&.Mui-selected .assessment-label": {
      color: kineticTokens.text,
    },
    "&.Mui-selected .assessment-copy": {
      color: alpha(kineticTokens.text, 0.82),
    },
    "&:hover": {
      backgroundColor: alpha(color, 0.12),
    },
    "&.Mui-selected:hover": {
      backgroundColor: alpha(color, 0.4),
    },
  } as const;
}

export function AssessmentRail(
  props: {
    assessment: OverlayAssessmentSectionViewModel;
  }
) {
  return (
    <Stack spacing={1.15}>
      <Typography color="text.secondary" variant="overline">
        Assessment
      </Typography>
      <ToggleButtonGroup
        exclusive
        fullWidth
        sx={{
          backgroundColor: alpha(kineticTokens.backgroundAlt, 0.52),
          border: `1px solid ${assessmentRailDividerColor}`,
          borderRadius: 2.5,
          overflow: "hidden",
          "& .MuiToggleButtonGroup-grouped": {
            border: 0,
            borderRadius: 0,
            margin: 0,
          },
          "& .MuiToggleButtonGroup-grouped:not(:first-of-type)": {
            borderLeft: `1px solid ${assessmentRailDividerColor}`,
          },
        }}
        onChange={(_, value: Rating | null) => {
          if (value === null) {
            return;
          }

          props.assessment.onSelectRating(value);
        }}
        value={props.assessment.selectedRating}
      >
        {assessmentOptions.map((option) => (
          <ToggleButton
            key={option.rating}
            sx={assessmentToggleSx(option.color)}
            value={option.rating}
          >
            <Stack
              alignItems="center"
              spacing={0.25}
              sx={{justifyContent: "center", width: "100%"}}
            >
              <Typography className="assessment-label" variant="button">
                {option.label}
              </Typography>
              <Typography className="assessment-copy" variant="caption">
                {option.copy}
              </Typography>
            </Stack>
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Stack>
  );
}
