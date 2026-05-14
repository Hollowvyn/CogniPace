/** Overlay surface shell — binds the panel's VM to the panel itself.
 *  Driven by `useOverlayPanelVM` per the canonical Screen+VM pattern.
 *  The shadow-root host and emotion cache are owned by
 *  `createOverlayHost` and the entrypoint; the shell stays React-only. */
import {
  OverlayPanel,
  OverlayPanelEnvironment,
  useOverlayPanelVM,
} from "@features/overlay-session";

export function OverlayShell(environment: OverlayPanelEnvironment) {
  const { renderModel } = useOverlayPanelVM(environment);
  return renderModel ? <OverlayPanel renderModel={renderModel} /> : null;
}
