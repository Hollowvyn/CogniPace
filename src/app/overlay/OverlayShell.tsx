/** Overlay surface shell — driven by `useOverlayShellVM` per the canonical
 *  Screen+VM pattern. Shadow-root host and emotion cache live in
 *  `createOverlayHost` and the entrypoint; this shell is React-only. */
import { OverlayPanel } from "@features/overlay-session";

import {
  useOverlayShellVM,
  type OverlayPanelEnvironment,
} from "./useOverlayShellVM";

export function OverlayShell(environment: OverlayPanelEnvironment) {
  const { renderModel } = useOverlayShellVM(environment);
  return renderModel ? <OverlayPanel renderModel={renderModel} /> : null;
}
