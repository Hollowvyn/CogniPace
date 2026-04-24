import ShuffleRounded from "@mui/icons-material/ShuffleRounded";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";

import {RecommendedProblemView} from "../../../../domain/views";
import {SurfaceIconButton, ToneChip} from "../../../components";
import {RecommendedProblemCard} from "../../../features/recommended/RecommendedProblemCard";
import {difficultyTone} from "../../../presentation/studyState";

function RecommendationHeaderAction(props: {
  canShuffle: boolean;
  difficulty: RecommendedProblemView["difficulty"];
  onShuffle: () => void;
}) {
  return (
    <Stack alignItems="center" direction="row" spacing={0.75}>
      <ToneChip
        label={props.difficulty}
        tone={difficultyTone(props.difficulty)}
      />
      {props.canShuffle ? (
        <Tooltip title="Shuffle recommendation">
          <SurfaceIconButton
            aria-label="Shuffle recommendation"
            onClick={props.onShuffle}
            sx={{ml: 0.75}}
          >
            <ShuffleRounded aria-hidden="true" fontSize="small"/>
          </SurfaceIconButton>
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
    <RecommendedProblemCard
      emptyCopy="No review pressure right now. Keep moving through your active course or refresh after the next session."
      emptyTitle="Queue Clear"
      headerAction={
        props.canShuffle ? (
          <Tooltip title="Shuffle recommendation">
            <SurfaceIconButton
              aria-label="Shuffle recommendation"
              onClick={props.onShuffle}
            >
              <ShuffleRounded aria-hidden="true" fontSize="small"/>
            </SurfaceIconButton>
          </Tooltip>
        ) : undefined
      }
      onOpenProblem={() => undefined}
      recommended={null}
      showNextReviewDate={false}
    />
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
  return (
    <RecommendedProblemCard
      buttonFullWidth
      headerAction={
        <RecommendationHeaderAction
          canShuffle={props.canShuffle}
          difficulty={props.recommended.difficulty}
          onShuffle={props.actions.onShuffle}
        />
      }
      onOpenProblem={props.actions.onOpenProblem}
      recommended={props.recommended}
      showNextReviewDate={false}
    />
  );
}
