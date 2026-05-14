/** Overlay surface shell — driven by `useOverlayShellVM` per the canonical
 * Screen+VM pattern. Runtime host setup stays in the entrypoint so this
 * module remains React-only. */
import { OverlayPanel } from "@features/overlay-session";

import {
  useOverlayShellVM,
  type OverlayPanelEnvironment,
} from "./useOverlayShellVM";

export function OverlayShell(environment: OverlayPanelEnvironment) {
  const { renderModel } = useOverlayShellVM(environment);
  return renderModel ? <OverlayPanel renderModel={renderModel} /> : null;
}
