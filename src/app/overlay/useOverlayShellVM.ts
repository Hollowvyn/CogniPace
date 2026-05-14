/** Overlay surface shell VM — delegates to the panel's feature VM.
 *  The overlay has no host-level state; `useOverlayPanelVM` in
 *  `features/overlay-session` owns the session logic. */
import {
  useOverlayPanelVM,
  type OverlayPanelEnvironment,
} from "@features/overlay-session";

export type { OverlayPanelEnvironment };

export function useOverlayShellVM(environment: OverlayPanelEnvironment) {
  return useOverlayPanelVM(environment);
}
