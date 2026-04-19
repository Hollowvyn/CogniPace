import {Difficulty, Rating} from "../../../domain/types";

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
  onOpenSettings: () => void;
  onToggleCollapse: () => void;
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

export interface CollapsedOverlayActionsViewModel {
  canFail: boolean;
  canSubmit: boolean;
  onFail: () => void;
  onSubmit: () => void;
  onToggleCollapse: () => void;
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

export interface CollapsedOverlayViewModel {
  actions: CollapsedOverlayActionsViewModel;
  timer: OverlayTimerSectionViewModel;
}

export interface ExpandedOverlayViewModel {
  actions: ExpandedOverlayActionsViewModel;
  assessment: OverlayAssessmentSectionViewModel;
  feedback: OverlayFeedbackViewModel | null;
  header: OverlayHeaderSectionViewModel;
  log: OverlayLogSectionViewModel;
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
    model: ExpandedOverlayViewModel;
    variant: "expanded";
  };
