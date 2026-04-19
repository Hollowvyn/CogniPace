/** Overlay root that binds controller state to the presentational overlay panel. */
import { OverlayPanel } from "./OverlayPanel";
import {
  OverlayControllerEnvironment,
  useOverlayController,
} from "./useOverlayController";

export function OverlayRoot(environment: OverlayControllerEnvironment) {
  const {renderModel} = useOverlayController(environment);
  return renderModel ? <OverlayPanel renderModel={renderModel}/> : null;
}
