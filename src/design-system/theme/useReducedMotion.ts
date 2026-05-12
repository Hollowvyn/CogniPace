/**
 * React hook: returns true when the user prefers reduced motion.
 *
 * Atoms with animation should consume `motionTokens.duration.*` AND
 * multiply by 0 when this returns true. The CssBaseline override in
 * `createCogniTheme` already flattens CSS animations under
 * `(prefers-reduced-motion: reduce)`; this hook is the React-side
 * counterpart for JS-driven transitions and `Math.min(duration, …)`
 * style calculations.
 */
import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function getMatch(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia(QUERY).matches;
}

function subscribe(callback: () => void): () => void {
  if (typeof window === "undefined" || !window.matchMedia) {
    return () => undefined;
  }
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getMatch, () => false);
}
