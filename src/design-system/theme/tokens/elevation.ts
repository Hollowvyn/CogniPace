/**
 * Elevation tokens — shadow scales used by Paper-like surfaces. Folder
 * shape is locked; the exact shadow recipes will be revisited in the
 * visual-identity scope. Today's values match the boxShadow used by
 * MuiPaper's styleOverrides.
 */
export const elevationTokens = {
  /** Subtle inner highlight + soft drop shadow (default Paper). */
  paper:
    "inset 0 0 0 1px rgba(255, 255, 255, 0.04), 0 18px 48px rgba(0, 0, 0, 0.26)",
  /** Pronounced shadow under primary buttons. */
  primaryButton: "0 12px 24px rgba(255, 161, 22, 0.2)",
} as const;

export type ElevationTokens = typeof elevationTokens;
