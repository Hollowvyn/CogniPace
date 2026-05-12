/**
 * CogniPace typography tokens. Folder shape locked; fonts are
 * placeholders that match today's look and will become the visual-
 * identity scope.
 */
export const typographyTokens = {
  bodyFont: '"Inter", "Segoe UI", sans-serif',
  displayFont:
    '"Space Grotesk", "Avenir Next", "Segoe UI", sans-serif',
  baseFontSize: 13,
  baseLineHeight: 1.35,
  letterSpacingTight: "-0.04em",
  letterSpacingDisplay: "-0.03em",
  letterSpacingBody: "0.01em",
  letterSpacingButton: "0.06em",
  letterSpacingOverline: "0.1em",
  numericFigures: "tabular-nums",
} as const;

export type TypographyTokens = typeof typographyTokens;
