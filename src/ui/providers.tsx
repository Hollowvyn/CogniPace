import { createCogniTheme, type SurfaceName } from "@design-system/theme";
import CssBaseline from "@mui/material/CssBaseline";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { ReactNode, useMemo } from "react";


/**
 * Shared app-level provider stack. Wraps a surface (popup / dashboard /
 * overlay) in the MUI theme appropriate to that surface and routes
 * MUI's portal-bound primitives (Modal / Popover / Popper) into the
 * supplied `portalContainer` so they appear inside the shadow root
 * when the overlay surface needs them.
 *
 * `surface` defaults to "dashboard" so legacy callers that omit it
 * keep working; entrypoints should pass it explicitly.
 */
export function AppProviders(props: {
  children?: ReactNode;
  portalContainer?: Element | null;
  surface?: SurfaceName;
}) {
  const surface = props.surface ?? "dashboard";

  const theme = useMemo(() => {
    const base = createCogniTheme(surface);
    if (!props.portalContainer) {
      return base;
    }

    return createTheme(base, {
      components: {
        MuiModal: {
          defaultProps: {
            container: props.portalContainer,
          },
        },
        MuiPopover: {
          defaultProps: {
            container: props.portalContainer,
          },
        },
        MuiPopper: {
          defaultProps: {
            container: props.portalContainer,
          },
        },
      },
    });
  }, [props.portalContainer, surface]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline enableColorScheme />
      {props.children}
    </ThemeProvider>
  );
}
