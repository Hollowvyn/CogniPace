/** Thin overlay surface router that renders the explicit collapsed or expanded variant. */
import {CollapsedOverlayPanel} from "./components/CollapsedOverlayPanel";
import {ExpandedOverlayPanel} from "./components/ExpandedOverlayPanel";
import {OverlayRenderModel} from "./overlayPanel.types";

export function OverlayPanel(props: { renderModel: OverlayRenderModel }) {
  if (props.renderModel.variant === "collapsed") {
    return <CollapsedOverlayPanel model={props.renderModel.model}/>;
  }

  return <ExpandedOverlayPanel model={props.renderModel.model}/>;
}
