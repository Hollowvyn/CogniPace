import CodeRounded from "@mui/icons-material/CodeRounded";
import SchoolRounded from "@mui/icons-material/SchoolRounded";
import ButtonBase from "@mui/material/ButtonBase";
import Stack from "@mui/material/Stack";
import {alpha} from "@mui/material/styles";
import Typography from "@mui/material/Typography";

import {StudyMode} from "../../../../domain/types";
import {SurfaceCard} from "../../../components";
import {cognipaceControlScale, cognipaceTokens} from "../../../theme";

interface PopupModeOptionProps {
  active: boolean;
  icon: typeof SchoolRounded;
  label: string;
  onClick: () => void;
}

function PopupModeOption(props: PopupModeOptionProps) {
  const Icon = props.icon;

  return (
    <ButtonBase
      aria-pressed={props.active}
      onClick={props.onClick}
      sx={{
        backgroundColor: props.active
          ? cognipaceTokens.accent
          : "transparent",
        borderRadius: 1.1,
        color: props.active ? "#2b1700" : cognipaceTokens.softText,
        display: "flex",
        flex: 1,
        minHeight: cognipaceControlScale.popupModeMinHeight,
        px: 1,
        py: 0.7,
        transition: "background-color 160ms ease, color 160ms ease",
        touchAction: "manipulation",
        "&:hover": {
          backgroundColor: props.active
            ? cognipaceTokens.accent
            : alpha(cognipaceTokens.paperStrong, 0.82),
          color: props.active ? "#2b1700" : cognipaceTokens.text,
        },
        "&:focus-visible": {
          outline: `2px solid ${alpha(cognipaceTokens.info, 0.72)}`,
          outlineOffset: 2,
        },
      }}
    >
      <Stack alignItems="center" spacing={0.45} sx={{width: "100%"}}>
        <Icon aria-hidden="true" fontSize="small"/>
        <Typography
          sx={{
            fontSize: "0.64rem",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          {props.label}
        </Typography>
      </Stack>
    </ButtonBase>
  );
}

export interface PopupModeSwitchProps {
  onSelectMode: (mode: StudyMode) => Promise<void> | void;
  studyMode: StudyMode;
}

export function PopupModeSwitch(props: PopupModeSwitchProps) {
  return (
    <SurfaceCard compact>
      <Stack direction="row" spacing={0.8}>
        <PopupModeOption
          active={props.studyMode === "studyPlan"}
          icon={SchoolRounded}
          label="Study Mode"
          onClick={() => {
            void props.onSelectMode("studyPlan");
          }}
        />
        <PopupModeOption
          active={props.studyMode === "freestyle"}
          icon={CodeRounded}
          label="Freestyle"
          onClick={() => {
            void props.onSelectMode("freestyle");
          }}
        />
      </Stack>
    </SurfaceCard>
  );
}
