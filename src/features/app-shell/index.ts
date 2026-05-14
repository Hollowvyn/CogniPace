export type {
  AppShellPayload,
  PopupShellPayload,
  PopupViewData,
  UiStatus,
  OpenedResponse,
  PopupModeLabel,
} from "./domain/model";

export type { AppShellRepository } from "./data/repository/AppShellRepository";
export { appShellRepository } from "./data/repository/AppShellRepository";

export { useAppShellQuery } from "./ui/hooks/useAppShellQuery";

// Mock payload builders — used by surface VMs as the disconnected-context
// fallback (vite dev server, jsdom tests) and by test fixtures.
export {
  createMockAppShellPayload,
  createMockPopupShellPayload,
} from "./data/mockData";

export { OverviewScreen } from "./ui/screens/OverviewScreen";
export type { OverviewScreenProps } from "./ui/screens/OverviewScreen";
export { useOverviewVM } from "./ui/hooks/useOverviewVM";
export type { OverviewScreenModel } from "./ui/hooks/useOverviewVM";
