/**
 * Design-system theme barrel.
 *
 * Token folder shape locked in Phase 4 (per plan §Theming); the
 * actual values stay as today's look until visual identity is its
 * own scope. Surface presets and the MUI theme factory live next to
 * the tokens; the `useReducedMotion` hook is the React-side
 * counterpart to the CssBaseline reduced-motion overrides.
 *
 * Import from `@design-system/theme`; do not reach into the per-
 * file tokens directly from outside the design-system. The two
 * historical names (`cognipaceTokens`, `cognipaceControlScale`)
 * are re-exported for back-compat during the migration; new code
 * uses `colorTokens` / `controlScale` directly.
 */
export { colorTokens } from "./tokens/color";
export type { ColorTokens } from "./tokens/color";
export { typographyTokens } from "./tokens/typography";
export type { TypographyTokens } from "./tokens/typography";
export { spacingTokens, controlScale } from "./tokens/spacing";
export type { SpacingTokens, ControlScale } from "./tokens/spacing";
export { radiusTokens } from "./tokens/radius";
export type { RadiusTokens } from "./tokens/radius";
export { motionTokens } from "./tokens/motion";
export type { MotionTokens } from "./tokens/motion";
export { elevationTokens } from "./tokens/elevation";
export type { ElevationTokens } from "./tokens/elevation";
export { zIndexTokens } from "./tokens/zIndex";
export type { ZIndexTokens } from "./tokens/zIndex";

export { popupSurface } from "./surfaces/popup";
export type { PopupSurface } from "./surfaces/popup";
export { dashboardSurface } from "./surfaces/dashboard";
export type { DashboardSurface } from "./surfaces/dashboard";
export { overlaySurface } from "./surfaces/overlay";
export type { OverlaySurface } from "./surfaces/overlay";

export { createCogniTheme } from "./createCogniTheme";
export type { SurfaceName } from "./createCogniTheme";

export { useReducedMotion } from "./useReducedMotion";

// Back-compat aliases for the historical names used by Phase 0-3 code.
// New code should import `colorTokens` / `controlScale` instead.
export { colorTokens as cognipaceTokens } from "./tokens/color";
export { controlScale as cognipaceControlScale } from "./tokens/spacing";
