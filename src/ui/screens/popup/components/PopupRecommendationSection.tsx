import OpenInNewRounded from "@mui/icons-material/OpenInNewRounded";
import ShuffleRounded from "@mui/icons-material/ShuffleRounded";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import {alpha} from "@mui/material/styles";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";

import {RecommendedProblemView} from "../../../../domain/views";
import {difficultyTone, recommendedTone,} from "../../../presentation/studyState";
import {kineticTokens} from "../../../theme";

import {popupIconButtonSx, popupPanelSx, popupSectionLabelSx, popupSmallButtonSx,} from "./popupStyles";

const chipToneSx = {
  accent: {
    backgroundColor: alpha(kineticTokens.info, 0.12),
    color: kineticTokens.info,
  },
  danger: {
    backgroundColor: alpha(kineticTokens.danger, 0.12),
    color: kineticTokens.danger,
  },
  default: {
    backgroundColor: alpha(kineticTokens.mutedText, 0.12),
    color: kineticTokens.mutedText,
  },
  info: {
    backgroundColor: alpha(kineticTokens.info, 0.12),
    color: kineticTokens.info,
  },
  success: {
    backgroundColor: alpha(kineticTokens.success, 0.12),
    color: kineticTokens.success,
  },
} as const;

function PopupChip(props: { label: string; tone: keyof typeof chipToneSx }) {
  return (
    <Chip
      label={props.label}
      size="small"
      sx={{
        ...chipToneSx[props.tone],
        borderRadius: 999,
        fontSize: "0.68rem",
        fontWeight: 700,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
      }}
    />
  );
}

/** Layout for the recommendation section header. */
function RecommendationHeader(props: {
  canShuffle: boolean;
  onShuffle: () => void;
}) {
  return (
    <Stack
      alignItems="center"
      direction="row"
      justifyContent="space-between"
      spacing={1}
      sx={{
        borderBottom: `1px solid ${alpha(kineticTokens.outlineStrong, 0.28)}`,
        px: 1.65,
        py: 1.3,
      }}
    >
      <Typography sx={popupSectionLabelSx}>Recommended Now</Typography>
      {props.canShuffle ? (
        <Tooltip title="Shuffle recommendation">
          <IconButton
            aria-label="Shuffle recommendation"
            onClick={props.onShuffle}
            size="small"
            sx={popupIconButtonSx}
          >
            <ShuffleRounded aria-hidden="true" fontSize="small"/>
          </IconButton>
        </Tooltip>
      ) : null}
    </Stack>
  );
}

export function RecommendationEmpty(props: {
  canShuffle: boolean;
  onShuffle: () => void;
}) {
  return (
    <Box sx={{...popupPanelSx, p: 0}}>
      <RecommendationHeader
        canShuffle={props.canShuffle}
        onShuffle={props.onShuffle}
      />
      <Stack spacing={0.65} sx={{p: 1.7}}>
        <Typography component="h2" variant="h6">
          Queue Clear
        </Typography>
        <Typography color="text.secondary" variant="body2">
          No review pressure right now. Keep moving through your active course
          or refresh after the next session.
        </Typography>
      </Stack>
    </Box>
  );
}

export function RecommendationActive(props: {
  actions: {
    onOpenProblem: (
      target: Pick<RecommendedProblemView, "slug">
    ) => Promise<void> | void;
    onShuffle: () => void;
  };
  canShuffle: boolean;
  recommended: RecommendedProblemView;
}) {
  const reasonTone = recommendedTone(props.recommended.reason);
  const difficultyToneValue = difficultyTone(props.recommended.difficulty);

  return (
    <Box sx={{...popupPanelSx, overflow: "hidden"}}>
      <RecommendationHeader
        canShuffle={props.canShuffle}
        onShuffle={props.actions.onShuffle}
      />

      <Stack alignItems="center" direction="row" spacing={1.45} sx={{p: 1.7}}>
        <Stack spacing={1.05} sx={{flex: 1, minWidth: 0}}>
          <Typography
            component="h2"
            sx={{
              fontSize: "1.05rem",
              fontWeight: 700,
              lineHeight: 1.22,
              minWidth: 0,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              height: "2.44em",
            }}
            translate="no"
          >
            {props.recommended.title}
          </Typography>
          <Stack direction="row" flexWrap="wrap" gap={0.8}>
            <PopupChip
              label={props.recommended.difficulty}
              tone={difficultyToneValue}
            />
            <PopupChip label={props.recommended.reason} tone={reasonTone}/>
            {props.recommended.alsoCourseNext ? (
              <PopupChip label="Also Next In Course" tone="success"/>
            ) : null}
          </Stack>
        </Stack>
        <Button
          endIcon={<OpenInNewRounded aria-hidden="true" fontSize="small"/>}
          onClick={() => {
            void props.actions.onOpenProblem({slug: props.recommended.slug});
          }}
          sx={{
            ...popupSmallButtonSx,
            flexShrink: 0,
            minHeight: 38,
            px: 1.25,
            whiteSpace: "nowrap",
          }}
          variant="contained"
        >
          Open Problem
        </Button>
      </Stack>
    </Box>
  );
}
