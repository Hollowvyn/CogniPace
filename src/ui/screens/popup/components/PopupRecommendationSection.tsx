import ShuffleRounded from "@mui/icons-material/ShuffleRounded";
import Stack from "@mui/material/Stack";

import {RecommendedProblemView} from "../../../../domain/views";
import {FieldAssistRow, InlineStatusRegion, SurfaceIconButton, SurfaceTooltip, ToneChip} from "../../../components";
import {RecommendedProblemCard} from "../../../features/recommended/RecommendedProblemCard";
import {difficultyTone} from "../../../presentation/studyState";
import {UiStatus} from "../../../state/useAppShellQuery";

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
        <SurfaceTooltip title="Shuffle recommendation">
          <SurfaceIconButton
            aria-label="Shuffle recommendation"
            onClick={props.onShuffle}
            sx={{ml: 0.75}}
          >
            <ShuffleRounded aria-hidden="true" fontSize="small"/>
          </SurfaceIconButton>
        </SurfaceTooltip>
      ) : null}
    </Stack>
  );
}

export function RecommendationEmpty(props: {
  canShuffle: boolean;
  onShuffle: () => void;
  status?: UiStatus;
}) {
  return (
    <RecommendedProblemCard
      emptyCopy="No review pressure right now. Keep moving through your active course or refresh after the next session."
      emptyTitle="Queue Clear"
      headerAction={
        props.canShuffle ? (
          <SurfaceTooltip title="Shuffle recommendation">
            <SurfaceIconButton
              aria-label="Shuffle recommendation"
              onClick={props.onShuffle}
            >
              <ShuffleRounded aria-hidden="true" fontSize="small"/>
            </SurfaceIconButton>
          </SurfaceTooltip>
        ) : undefined
      }
      helper={
        <Stack spacing={0.8}>
          <FieldAssistRow>
            Review is clear for now. Shuffle only rotates among current
            recommendation candidates.
          </FieldAssistRow>
          <InlineStatusRegion
            isError={props.status?.isError}
            message={props.status?.message}
          />
        </Stack>
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
  status?: UiStatus;
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
      helper={
        <Stack spacing={0.8}>
          <FieldAssistRow>
            Open the current best review target. Shuffle rotates only the
            recommendation pool and leaves course progression unchanged.
          </FieldAssistRow>
          <InlineStatusRegion
            isError={props.status?.isError}
            message={props.status?.message}
          />
        </Stack>
      }
      onOpenProblem={props.actions.onOpenProblem}
      recommended={props.recommended}
      showNextReviewDate={false}
    />
  );
}
