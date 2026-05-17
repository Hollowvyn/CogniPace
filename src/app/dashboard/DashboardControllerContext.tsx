import { createContext, useContext } from "react";

import type { useDashboardShellVM } from "./useDashboardShellVM";
import type { ReactNode } from "react";

export type DashboardShellController = ReturnType<typeof useDashboardShellVM>;

const DashboardControllerContext =
  createContext<DashboardShellController | null>(null);

export function DashboardControllerProvider(props: {
  children: ReactNode;
  value: DashboardShellController;
}) {
  return (
    <DashboardControllerContext.Provider value={props.value}>
      {props.children}
    </DashboardControllerContext.Provider>
  );
}

export function useDashboardController(): DashboardShellController {
  const controller = useContext(DashboardControllerContext);
  if (!controller) {
    throw new Error("Dashboard controller context is missing.");
  }
  return controller;
}
