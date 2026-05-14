import {
  CollapsedOverlayViewModel,
  DockedOverlayViewModel,
  ExpandedOverlayViewModel,
  OverlayRenderModel,
} from "../../../../features/overlay-session/ui/screens/overlayPanel.types";
import { fireEvent } from "../../../support/render";

export function firePointerEvent(
  target: Element,
  type: "pointerdown" | "pointermove" | "pointerup",
  coordinates: { clientX?: number; clientY: number },
) {
  fireEvent(
    target,
    new MouseEvent(type, {
      bubbles: true,
      clientX: coordinates.clientX ?? 0,
      clientY: coordinates.clientY,
    }),
  );
}

export type ExpandedRenderModelOverrides = {
  actionAssist?: Partial<ExpandedOverlayViewModel["actionAssist"]>;
  actions?: Partial<ExpandedOverlayViewModel["actions"]>;
  assessment?: Partial<ExpandedOverlayViewModel["assessment"]>;
  assessmentAssist?: Partial<ExpandedOverlayViewModel["assessmentAssist"]>;
  feedback?: Partial<NonNullable<ExpandedOverlayViewModel["feedback"]>> | null;
  header?: Partial<ExpandedOverlayViewModel["header"]>;
  onClickAway?: ExpandedOverlayViewModel["onClickAway"];
  log?: {
    draft?: Partial<ExpandedOverlayViewModel["log"]["draft"]>;
    onChange?: ExpandedOverlayViewModel["log"]["onChange"];
  };
  postSubmitNext?: ExpandedOverlayViewModel["postSubmitNext"];
  timer?: Partial<ExpandedOverlayViewModel["timer"]>;
};

export type CollapsedRenderModelOverrides = {
  actions?: Partial<CollapsedOverlayViewModel["actions"]>;
  assist?: Partial<CollapsedOverlayViewModel["assist"]>;
  feedback?: Partial<NonNullable<CollapsedOverlayViewModel["feedback"]>> | null;
  timer?: Partial<CollapsedOverlayViewModel["timer"]>;
};

export type DockedRenderModelOverrides = Partial<DockedOverlayViewModel>;

export function makeExpandedRenderModel(
  overrides: ExpandedRenderModelOverrides = {}
): OverlayRenderModel {
  const feedback =
    overrides.feedback === null
      ? null
      : {
        isError: false,
        message: "Last reviewed today.",
        ...(overrides.feedback ?? {}),
      };

  return {
    model: {
      actions: {
        canFail: true,
        canRestart: false,
        canSubmit: true,
        canUpdate: false,
        onFail: () => undefined,
        onRestart: () => undefined,
        onSubmit: () => undefined,
        onUpdate: () => undefined,
        ...overrides.actions,
      },
      actionAssist: {
        message: "Submit saves this attempt.",
        tone: "default",
        ...overrides.actionAssist,
      },
      assessment: {
        disabledRatings: [],
        onSelectRating: () => undefined,
        selectedRating: 2,
        ...overrides.assessment,
      },
      assessmentAssist: {
        id: "overlay-assessment-help",
        message: "Good means you finished with steady recall.",
        tone: "accent",
        ...overrides.assessmentAssist,
      },
      feedback,
      header: {
        difficulty: "Medium",
        onCollapse: () => undefined,
        onHide: () => undefined,
        onOpenSettings: () => undefined,
        sessionLabel: "Recall review",
        status: {
          kind: "history",
          cards: [
            {
              label: "Last submitted",
              primary: "Mar 29",
              secondary: "",
              tone: "neutral",
            },
            {
              emphasized: true,
              label: "Next due",
              primary: "Mar 30",
              secondary: "",
              tone: "warning",
            },
          ],
        },
        title: "Group Anagrams",
        ...overrides.header,
      },
      onClickAway: overrides.onClickAway ?? (() => undefined),
      log: {
        draft: {
          interviewPattern: "",
          timeComplexity: "",
          spaceComplexity: "",
          languages: "",
          notes: "",
          ...(overrides.log?.draft ?? {}),
        },
        onChange: overrides.log?.onChange ?? (() => undefined),
      },
      postSubmitNext: overrides.postSubmitNext ?? null,
      timer: {
        canPause: true,
        canReset: true,
        canStart: true,
        display: "00:00",
        isRunning: false,
        onPause: () => undefined,
        onReset: () => undefined,
        onStart: () => undefined,
        startLabel: "Start timer",
        targetDisplay: "35:00",
        ...overrides.timer,
      },
    },
    variant: "expanded",
  };
}

export function makeCollapsedRenderModel(
  overrides: CollapsedRenderModelOverrides = {}
): OverlayRenderModel {
  const feedback =
    overrides.feedback === null
      ? null
      : {
        isError: false,
        message: "",
        ...(overrides.feedback ?? {}),
      };

  return {
    model: {
      actions: {
        canFail: true,
        onHide: () => undefined,
        canSubmit: true,
        onExpand: () => undefined,
        onFail: () => undefined,
        onSubmit: () => undefined,
        ...overrides.actions,
      },
      assist: {
        id: "overlay-collapsed-help",
        message: "Collapsed mode keeps the timer and quick actions nearby.",
        tone: "default",
        ...overrides.assist,
      },
      feedback,
      timer: {
        canPause: true,
        canReset: true,
        canStart: true,
        display: "03:12",
        isRunning: false,
        onPause: () => undefined,
        onReset: () => undefined,
        onStart: () => undefined,
        startLabel: "Start timer",
        ...overrides.timer,
      },
    },
    variant: "collapsed",
  };
}

export function makeDockedRenderModel(
  overrides: DockedRenderModelOverrides = {}
): OverlayRenderModel {
  return {
    model: {
      onRestore: () => undefined,
      ...overrides,
    },
    variant: "docked",
  };
}
