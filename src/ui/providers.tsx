import { DIProvider, type DIServices } from "@app/di";
import { createCogniTheme, type SurfaceName } from "@design-system/theme";
import { settingsRepository } from "@features/settings";
import CssBaseline from "@mui/material/CssBaseline";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { ReactNode, useMemo } from "react";

/** App-level provider stack — MUI theme per surface + DI. Tests pass
 *  `services` to inject mocks; production wiring is the default. */
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
