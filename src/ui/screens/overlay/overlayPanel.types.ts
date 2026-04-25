import {Difficulty, Rating} from "../../../domain/types";
import {CourseQuestionView, RecommendedProblemView} from "../../../domain/views";

export interface OverlayDraftLogFields {
  interviewPattern: string;
  timeComplexity: string;
  spaceComplexity: string;
  languages: string;
  notes: string;
}

export type OverlayHeaderStatusTone =
  | "neutral"
  | "accent"
  | "warning"
  | "danger";

export interface OverlayHeaderStatusCard {
  emphasized?: boolean;
  label: string;
  primary: string;
  secondary: string;
  tone: OverlayHeaderStatusTone;
}

export type OverlayHeaderStatus =
  | {
  cards: OverlayHeaderStatusCard[];
  kind: "empty";
}
  | {
  cards: OverlayHeaderStatusCard[];
  kind: "history";
};

export type OverlayDraftChangeHandler = (
  field: keyof OverlayDraftLogFields,
  value: string
) => void;

export interface OverlayHeaderSectionViewModel {
  difficulty: Difficulty;
  onCollapse: () => void;
  onHide: () => void;
  onOpenSettings: () => void;
  sessionLabel: string;
  status: OverlayHeaderStatus;
  title: string;
}

export interface OverlayTimerSectionViewModel {
  canPause: boolean;
  canReset: boolean;
  canStart: boolean;
  display: string;
  isRunning: boolean;
  onPause: () => void;
  onReset: () => void;
  onStart: () => void;
  startLabel: string;
  targetDisplay?: string;
}

export interface OverlayAssessmentSectionViewModel {
  disabledRatings: Rating[];
  onSelectRating: (rating: Rating) => void;
  selectedRating: Rating;
}

export interface OverlayLogSectionViewModel {
  draft: OverlayDraftLogFields;
  onChange: OverlayDraftChangeHandler;
}

export interface OverlayFeedbackViewModel {
  isError: boolean;
  message: string;
}

export interface OverlayAssistViewModel {
  id?: string;
  message: string;
  tone?: "accent" | "danger" | "default" | "info" | "success" | "warning";
}

export interface CollapsedOverlayActionsViewModel {
  canFail: boolean;
  onHide: () => void;
  canSubmit: boolean;
  onExpand: () => void;
  onFail: () => void;
  onSubmit: () => void;
}

export interface ExpandedOverlayActionsViewModel {
  canFail: boolean;
  canRestart: boolean;
  canSubmit: boolean;
  canUpdate: boolean;
  onFail: () => void;
  onRestart: () => void;
  onSubmit: () => void;
  onUpdate: () => void;
}

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
  activeCourseId?: string;
  kind: "course";
  onOpenProblem: (target: {
    slug: string;
    courseId?: string;
    chapterId?: string;
  }) => Promise<void> | void;
  view: CourseQuestionView;
}
  | {
  kind: "recommended";
  onOpenProblem: (
    target: Pick<RecommendedProblemView, "slug">
  ) => Promise<void> | void;
  recommended: RecommendedProblemView;
};

export interface CollapsedOverlayViewModel {
  actions: CollapsedOverlayActionsViewModel;
  assist: OverlayAssistViewModel;
  feedback: OverlayFeedbackViewModel | null;
  timer: OverlayTimerSectionViewModel;
}

export interface DockedOverlayViewModel {
  onRestore: () => void;
}

export interface ExpandedOverlayViewModel {
  actions: ExpandedOverlayActionsViewModel;
  actionAssist: OverlayAssistViewModel;
  assessment: OverlayAssessmentSectionViewModel;
  assessmentAssist: OverlayAssistViewModel;
  feedback: OverlayFeedbackViewModel | null;
  header: OverlayHeaderSectionViewModel;
  onClickAway: () => void;
  log: OverlayLogSectionViewModel;
  postSubmitNext: OverlayPostSubmitNextViewModel | null;
  timer: OverlayTimerSectionViewModel & {
    targetDisplay: string;
  };
}

export type OverlayRenderModel =
  | {
  model: CollapsedOverlayViewModel;
  variant: "collapsed";
}
  | {
  model: DockedOverlayViewModel;
  variant: "docked";
}
  | {
  model: ExpandedOverlayViewModel;
  variant: "expanded";
};
