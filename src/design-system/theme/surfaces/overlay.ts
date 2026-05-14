/**
 * Overlay surface preset — shadow-root-safe, glass density. The overlay
 * mounts inside a shadow root on the live LeetCode page; the preset
 * exists so future surface-specific style tweaks (z-index reservation,
 * pointer-event scoping, color-against-page) live in one named place.
 */
export const overlaySurface = {
  name: "overlay" as const,
  density: "glass" as const,
};

export type OverlaySurface = typeof overlaySurface;
