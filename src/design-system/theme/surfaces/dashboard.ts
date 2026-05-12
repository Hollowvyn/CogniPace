/**
 * Dashboard surface preset — roomy density. The dashboard is a full
 * browser-tab document; users browse, edit, and read at length, so the
 * preset favors generous spacing and clear typographic hierarchy.
 */
export const dashboardSurface = {
  name: "dashboard" as const,
  density: "roomy" as const,
};

export type DashboardSurface = typeof dashboardSurface;
