import { DIProvider, type DIServices } from "@app/di";
import { createCogniTheme, type SurfaceName } from "@design-system/theme";
import { settingsRepository } from "@features/settings";
import CssBaseline from "@mui/material/CssBaseline";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { ReactNode, useMemo } from "react";

/**
 * Shared app-level provider stack. Wraps a surface (popup / dashboard /
 * overlay) in the MUI theme appropriate to that surface, mounts the
 * DI surface (so `useDI()` works in every hook below), and routes
 * MUI's portal-bound primitives (Modal / Popover / Popper) into the
 * supplied `portalContainer` so they appear inside the shadow root
 * when the overlay surface needs them.
 *
 * `surface` defaults to "dashboard"; entrypoints pass it explicitly.
 * `services` defaults to the production wiring (one
 * `DefaultSettingsRepository` over the runtime client); tests pass a
 * mock-built `DIServices` to inject fakes.
 */
const DEFAULT_DI_SERVICES: DIServices = {
  settingsRepository,
};

export function AppProviders(props: {
  children?: ReactNode;
  portalContainer?: Element | null;
  surface?: SurfaceName;
  services?: DIServices;
}) {
  const surface = props.surface ?? "dashboard";
  const services = props.services ?? DEFAULT_DI_SERVICES;

  const theme = useMemo(() => {
    const base = createCogniTheme(surface);
    if (!props.portalContainer) {
      return base;
    }

    return createTheme(base, {
      components: {
        MuiModal: {
          defaultProps: { container: props.portalContainer },
        },
        MuiPopover: {
          defaultProps: { container: props.portalContainer },
        },
        MuiPopper: {
          defaultProps: { container: props.portalContainer },
        },
      },
    });
  }, [props.portalContainer, surface]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline enableColorScheme />
      <DIProvider services={services}>{props.children}</DIProvider>
    </ThemeProvider>
  );
}
