/** Thin overlay surface router that renders the explicit overlay variant. */
import {CollapsedOverlayPanel} from "./components/CollapsedOverlayPanel";
import {DockedOverlayPanel} from "./components/DockedOverlayPanel";
import {ExpandedOverlayPanel} from "./components/ExpandedOverlayPanel";
import {OverlayRenderModel} from "./overlayPanel.types";

export function OverlayPanel(props: { renderModel: OverlayRenderModel }) {
  if (props.renderModel.variant === "collapsed") {
    return <CollapsedOverlayPanel model={props.renderModel.model}/>;
  }

  if (props.renderModel.variant === "docked") {
    return <DockedOverlayPanel model={props.renderModel.model}/>;
  }

  return <ExpandedOverlayPanel model={props.renderModel.model}/>;
}
