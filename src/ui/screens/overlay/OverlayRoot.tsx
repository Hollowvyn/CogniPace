/** Overlay root that binds controller state to the presentational overlay panel. */
import { OverlayPanel } from "./OverlayPanel";
import {
  OverlayControllerEnvironment,
  useOverlayController,
} from "./useOverlayController";

export function OverlayRoot(environment: OverlayControllerEnvironment) {
  const { panelProps } = useOverlayController(environment);
  return panelProps ? <OverlayPanel {...panelProps} /> : null;
}
