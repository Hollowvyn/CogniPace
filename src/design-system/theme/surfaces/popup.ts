/**
 * Popup surface preset — compact density. The popup runs in a tight
 * action-bar footprint and paints under a hard <300ms budget, so its
 * preset trades a few pixels of breathing room for visible content.
 *
 * Today the preset is a marker (no value diffs from the base theme);
 * density tweaks land in the visual-identity scope.
 */
export const popupSurface = {
  name: "popup" as const,
  density: "compact" as const,
};

export type PopupSurface = typeof popupSurface;
