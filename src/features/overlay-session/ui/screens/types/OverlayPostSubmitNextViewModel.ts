import type { RecommendedProblemView } from "@features/problems";
import type { TrackQuestionView } from "@features/tracks";

export type OverlayPostSubmitNextViewModel =
  | {
      kind: "loading";
      message: string;
      title: string;
    }
  | {
      kind: "empty";
      message: string;
      title: string;
    }
  | {
      activeTrackId?: string;
      kind: "track";
      onOpenProblem: (target: {
        slug: string;
        courseId?: string;
        chapterId?: string;
      }) => Promise<void> | void;
      view: TrackQuestionView;
    }
  | {
      kind: "recommended";
      onOpenProblem: (
        target: Pick<RecommendedProblemView, "slug">,
      ) => Promise<void> | void;
      recommended: RecommendedProblemView;
    };
