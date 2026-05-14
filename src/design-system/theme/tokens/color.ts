/**
 * CogniPace color tokens — dark-only palette. Folder shape is locked
 * in Phase 4; actual values stay as today's look and become a future
 * visual-identity scope (see plan §"Visual identity values" — out of
 * scope for the architecture refactor).
 *
 * Naming follows semantic-then-raw: `background`/`paper`/`outline` are
 * surface tokens, `text`/`mutedText`/`softText` are content tokens, and
 * `accent`/`info`/`success`/`warning`/`danger` are intent tokens.
 */
export const colorTokens = {
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
  accentDeep: "#bd6f00",
  accentContrast: "#2b1700",
  info: "#94dbff",
  infoLight: "#c5ecff",
  infoDark: "#3b8cb3",
  success: "#8fe0a6",
  warning: "#ffd24a",
  danger: "#ffb4ab",
} as const;

export type ColorTokens = typeof colorTokens;
