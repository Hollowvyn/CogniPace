import {alpha, createTheme} from "@mui/material/styles";

export const kineticTokens = {
  background: "#131313",
  backgroundAlt: "#181818",
  paper: "#1f1e1d",
  paperStrong: "#2a2a2a",
  outline: "rgba(161, 141, 122, 0.16)",
  outlineStrong: "rgba(161, 141, 122, 0.32)",
  text: "#e5e2e1",
  mutedText: "#a99f96",
  softText: "#7d756e",
  accent: "#ffa116",
  accentSoft: "#ffc78b",
  info: "#94dbff",
  success: "#8fe0a6",
  danger: "#ffb4ab",
};

export const kineticTheme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: kineticTokens.accent,
      light: kineticTokens.accentSoft,
      dark: "#bd6f00",
      contrastText: "#2b1700",
    },
    secondary: {
      main: kineticTokens.info,
      light: "#c5ecff",
      dark: "#3b8cb3",
    },
    success: {
      main: kineticTokens.success,
    },
    error: {
      main: kineticTokens.danger,
    },
    warning: {
      main: kineticTokens.accentSoft,
    },
    background: {
      default: kineticTokens.background,
      paper: kineticTokens.paper,
    },
    divider: kineticTokens.outline,
    text: {
      primary: kineticTokens.text,
      secondary: kineticTokens.mutedText,
    },
  },
  shape: {
    borderRadius: 10,
  },
  spacing: 7,
  typography: {
    allVariants: {
      lineHeight: 1.35,
    },
    fontFamily: '"Inter", "Segoe UI", sans-serif',
    fontSize: 13,
    h1: {
      fontFamily: '"Space Grotesk", "Avenir Next", "Segoe UI", sans-serif',
      fontSize: "2rem",
      fontWeight: 700,
      letterSpacing: "-0.04em",
    },
    h2: {
      fontFamily: '"Space Grotesk", "Avenir Next", "Segoe UI", sans-serif',
      fontSize: "1.625rem",
      fontWeight: 700,
      letterSpacing: "-0.03em",
    },
    h3: {
      fontFamily: '"Space Grotesk", "Avenir Next", "Segoe UI", sans-serif',
      fontSize: "1.325rem",
      fontWeight: 700,
      letterSpacing: "-0.02em",
    },
    h4: {
      fontFamily: '"Space Grotesk", "Avenir Next", "Segoe UI", sans-serif',
      fontSize: "1.5rem",
      fontWeight: 700,
      letterSpacing: "-0.03em",
    },
    h5: {
      fontFamily: '"Space Grotesk", "Avenir Next", "Segoe UI", sans-serif',
      fontSize: "1.2rem",
      fontWeight: 700,
      letterSpacing: "-0.03em",
    },
    h6: {
      fontFamily: '"Space Grotesk", "Avenir Next", "Segoe UI", sans-serif',
      fontSize: "1rem",
      fontWeight: 700,
      letterSpacing: "-0.02em",
    },
    body1: {
      fontSize: "0.9rem",
    },
    body2: {
      fontSize: "0.8rem",
    },
    button: {
      fontSize: "0.72rem",
      fontWeight: 700,
      letterSpacing: "0.06em",
      textTransform: "uppercase",
    },
    overline: {
      fontSize: "0.68rem",
      fontWeight: 700,
      letterSpacing: "0.1em",
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
        'body[data-surface="popup"], body[data-surface="popup"] #popup-root': {
          minHeight: 0,
          height: "auto",
        },
        body: {
          margin: 0,
          background: [
            `radial-gradient(circle at top, ${alpha(kineticTokens.accent, 0.08)}, transparent 28%)`,
            `radial-gradient(circle at 20% 20%, ${alpha(kineticTokens.info, 0.06)}, transparent 22%)`,
            "linear-gradient(180deg, #131313 0%, #111111 100%)",
          ].join(","),
          color: kineticTokens.text,
          fontFamily: '"Inter", "Segoe UI", sans-serif',
          letterSpacing: "0.01em",
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
          border: `1px solid ${kineticTokens.outline}`,
          backgroundColor: alpha(kineticTokens.paperStrong, 0.88),
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 8,
          minHeight: 34,
          paddingInline: 12,
        },
        containedPrimary: {
          boxShadow: `0 12px 24px ${alpha(kineticTokens.accent, 0.2)}`,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: kineticTokens.outline,
        },
        head: {
          color: kineticTokens.mutedText,
          fontSize: 12,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: alpha(kineticTokens.paperStrong, 0.6),
        },
        notchedOutline: {
          borderColor: kineticTokens.outline,
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          border: `1px solid ${kineticTokens.outline}`,
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          backgroundColor: alpha(kineticTokens.mutedText, 0.15),
        },
        bar: {
          borderRadius: 999,
        },
      },
    },
  },
});
