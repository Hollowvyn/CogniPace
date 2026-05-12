/**
 * Z-index scale shared across the three surfaces. The overlay shell
 * reserves a high layer that sits above the LeetCode page; everything
 * else uses MUI's defaults via the theme.
 */
export const zIndexTokens = {
  overlayShell: 2147483000,
} as const;

export type ZIndexTokens = typeof zIndexTokens;
