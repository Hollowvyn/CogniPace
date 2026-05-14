/**
 * Motion tokens — durations and easings. Atoms with animation should
 * read durations from this table and honor `prefers-reduced-motion`
 * via the `useReducedMotion()` hook in this folder (returns 0 for all
 * durations when the user opts out).
 *
 * Today's CssBaseline override flattens animation durations to 0.01ms
 * under `(prefers-reduced-motion: reduce)`; the hook is the React-side
 * counterpart for components that compute their own transitions.
 */
export const motionTokens = {
  duration: {
    xs: 80,
    sm: 160,
    md: 240,
    lg: 360,
  },
  easing: {
    enter: "cubic-bezier(0.16, 1, 0.3, 1)",
    exit: "cubic-bezier(0.7, 0, 0.84, 0)",
    emphasis: "cubic-bezier(0.34, 1.56, 0.64, 1)",
  },
} as const;

export type MotionTokens = typeof motionTokens;
