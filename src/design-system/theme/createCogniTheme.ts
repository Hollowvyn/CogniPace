/**
 * Builds the MUI Theme for a given CogniPace surface. Dark-mode only —
 * no `modes/` folder exists (see plan §Theming). Tokens are imported
 * from neighboring `tokens/` files so consumers can reach them
 * directly when they need raw values (e.g. for inline gradients).
 *
 * The `surface` parameter is the hook for future per-surface density /
 * elevation overrides. Today all three surfaces resolve to the same
 * theme; the parameter exists so the swap-in is a one-line change
 * when visual identity lands.
 */
import { alpha, createTheme, type Theme } from "@mui/material/styles";

import { colorTokens } from "./tokens/color";
import { radiusTokens } from "./tokens/radius";
import { controlScale } from "./tokens/spacing";
import { typographyTokens } from "./tokens/typography";

export type SurfaceName = "popup" | "dashboard" | "overlay";

export function createCogniTheme(surface: SurfaceName = "dashboard"): Theme {
  // surface is reserved for per-surface density / elevation overrides
  // in a follow-up visual-identity phase; today all three surfaces
  // share the same theme.
  void surface;
  return createTheme({
    palette: {
      mode: "dark",
      primary: {
        main: colorTokens.accent,
        light: colorTokens.accentSoft,
        dark: colorTokens.accentDeep,
        contrastText: colorTokens.accentContrast,
      },
      secondary: {
        main: colorTokens.info,
        light: colorTokens.infoLight,
        dark: colorTokens.infoDark,
      },
      success: { main: colorTokens.success },
      error: { main: colorTokens.danger },
      warning: { main: colorTokens.warning },
      background: {
        default: colorTokens.background,
        paper: colorTokens.paper,
      },
      divider: colorTokens.outline,
      text: {
        primary: colorTokens.text,
        secondary: colorTokens.mutedText,
      },
    },
    shape: {
      borderRadius: radiusTokens.base,
    },
    spacing: 7,
    typography: {
      allVariants: {
        lineHeight: typographyTokens.baseLineHeight,
      },
      fontFamily: typographyTokens.bodyFont,
      fontSize: typographyTokens.baseFontSize,
      h1: {
        fontFamily: typographyTokens.displayFont,
        fontSize: "2rem",
        fontWeight: 700,
        letterSpacing: typographyTokens.letterSpacingTight,
      },
      h2: {
        fontFamily: typographyTokens.displayFont,
        fontSize: "1.625rem",
        fontWeight: 700,
        letterSpacing: typographyTokens.letterSpacingDisplay,
      },
      h3: {
        fontFamily: typographyTokens.displayFont,
        fontSize: "1.325rem",
        fontWeight: 700,
        letterSpacing: "-0.02em",
      },
      h4: {
        fontFamily: typographyTokens.displayFont,
        fontSize: "1.5rem",
        fontWeight: 700,
        letterSpacing: typographyTokens.letterSpacingDisplay,
      },
      h5: {
        fontFamily: typographyTokens.displayFont,
        fontSize: "1.2rem",
        fontWeight: 700,
        letterSpacing: typographyTokens.letterSpacingDisplay,
      },
      h6: {
        fontFamily: typographyTokens.displayFont,
        fontSize: "1rem",
        fontWeight: 700,
        letterSpacing: "-0.02em",
      },
      body1: { fontSize: "0.9rem" },
      body2: { fontSize: "0.8rem" },
      button: {
        fontSize: "0.72rem",
        fontWeight: 700,
        letterSpacing: typographyTokens.letterSpacingButton,
        textTransform: "uppercase",
      },
      overline: {
        fontSize: "0.68rem",
        fontWeight: 700,
        letterSpacing: typographyTokens.letterSpacingOverline,
      },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          ":root": {
            colorScheme: "dark",
          },
          "html, body, #popup-root, #app-shell": {
            minHeight: "100%",
          },
          'body[data-surface="popup"], body[data-surface="popup"] #popup-root':
            {
              minHeight: 0,
              height: "auto",
            },
          body: {
            margin: 0,
            background: [
              `radial-gradient(circle at top, ${alpha(colorTokens.accent, 0.08)}, transparent 28%)`,
              `radial-gradient(circle at 20% 20%, ${alpha(colorTokens.info, 0.06)}, transparent 22%)`,
              "linear-gradient(180deg, #131313 0%, #111111 100%)",
            ].join(","),
            color: colorTokens.text,
            fontFamily: typographyTokens.bodyFont,
            letterSpacing: typographyTokens.letterSpacingBody,
          },
          "body::before": {
            content: '""',
            position: "fixed",
            inset: 0,
            backgroundImage:
              "radial-gradient(rgba(255, 255, 255, 0.05) 0.7px, transparent 0.7px)",
            backgroundSize: "20px 20px",
            opacity: 0.2,
            pointerEvents: "none",
          },
          "@media (prefers-reduced-motion: reduce)": {
            "*, *::before, *::after": {
              animationDuration: "0.01ms !important",
              animationIterationCount: "1 !important",
              scrollBehavior: "auto !important",
              transitionDuration: "0.01ms !important",
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
            boxShadow: `inset 0 0 0 1px ${alpha("#ffffff", 0.04)}, 0 18px 48px rgba(0, 0, 0, 0.26)`,
            backdropFilter: "blur(12px)",
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            border: `1px solid ${colorTokens.outline}`,
            backgroundColor: alpha(colorTokens.paperStrong, 0.88),
          },
        },
      },
      MuiButton: {
        defaultProps: {
          disableElevation: true,
        },
        styleOverrides: {
          root: {
            borderRadius: radiusTokens.button,
            minHeight: controlScale.buttonMinHeight,
            paddingInline: controlScale.buttonInlinePadding,
          },
          sizeSmall: {
            minHeight: 28,
            paddingInline: 9,
          },
          containedPrimary: {
            boxShadow: `0 12px 24px ${alpha(colorTokens.accent, 0.2)}`,
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          sizeSmall: {
            padding: 4,
          },
        },
      },
      MuiToggleButton: {
        styleOverrides: {
          root: {
            minHeight: controlScale.buttonMinHeight,
            paddingInline: controlScale.buttonInlinePadding,
          },
          sizeSmall: {
            minHeight: 28,
            paddingInline: 9,
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: radiusTokens.pill,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderColor: colorTokens.outline,
          },
          head: {
            color: colorTokens.mutedText,
            fontSize: 12,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            backgroundColor: alpha(colorTokens.paperStrong, 0.6),
          },
          notchedOutline: {
            borderColor: colorTokens.outline,
          },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: radiusTokens.button,
            border: `1px solid ${colorTokens.outline}`,
          },
        },
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: {
            borderRadius: radiusTokens.pill,
            backgroundColor: alpha(colorTokens.mutedText, 0.15),
          },
          bar: {
            borderRadius: radiusTokens.pill,
          },
        },
      },
    },
  });
}
