import CssBaseline from "@mui/material/CssBaseline";
import {createTheme, ThemeProvider} from "@mui/material/styles";
import {ReactNode, useMemo} from "react";

import {cognipaceTheme} from "./theme";

export function AppProviders(props: {
  children?: ReactNode;
  portalContainer?: Element | null;
}) {
  const theme = useMemo(() => {
    if (!props.portalContainer) {
      return cognipaceTheme;
    }

    return createTheme(cognipaceTheme, {
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
  }, [props.portalContainer]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline enableColorScheme/>
      {props.children}
    </ThemeProvider>
  );
}
