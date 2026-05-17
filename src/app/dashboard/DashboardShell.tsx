/** Dashboard surface shell — delegates URL state to the TanStack Router tree. */
import { DashboardRouterProvider } from "./navigation/router";

export function DashboardShell() {
  return <DashboardRouterProvider />;
}
