/**
 * Border-radius tokens. `base` is the MUI `shape.borderRadius` value;
 * `pill` is a fully rounded "999"-style for chips and progress bars;
 * `button` is the explicit button radius (intentionally smaller than
 * base today).
 */
export const radiusTokens = {
  base: 10,
  button: 8,
  pill: 999,
} as const;

export type RadiusTokens = typeof radiusTokens;
