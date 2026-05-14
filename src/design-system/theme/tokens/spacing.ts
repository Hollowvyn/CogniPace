/**
 * Spacing tokens — the MUI `spacing` unit (multiplier) and a control-
 * scale table for interactive primitives (button heights, dock sizes,
 * etc). Keeps numeric scales in one named place so layout tweaks ride
 * tokens rather than literals.
 */
export const spacingTokens = {
  /** MUI `spacing()` unit, in px. */
  unit: 7,
} as const;

export const controlScale = {
  assessmentMinHeight: 64,
  buttonInlinePadding: 10,
  buttonMinHeight: 30,
  compactButtonMinHeight: 32,
  compactButtonMinWidth: 32,
  compactPillMinHeight: 26,
  compactPillMinWidth: 26,
  dockMinHeight: 60,
  dockWidth: 40,
  iconButtonSize: 34,
  navButtonInlinePadding: 9,
  navButtonMinHeight: 38,
  overlayActionMinHeight: 38,
  popupModeMinHeight: 48,
} as const;

export type SpacingTokens = typeof spacingTokens;
export type ControlScale = typeof controlScale;
