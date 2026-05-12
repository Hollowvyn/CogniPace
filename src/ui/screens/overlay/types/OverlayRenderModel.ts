import type { CollapsedOverlayViewModel } from "./CollapsedOverlayViewModel";
import type { DockedOverlayViewModel } from "./DockedOverlayViewModel";
import type { ExpandedOverlayViewModel } from "./ExpandedOverlayViewModel";

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
