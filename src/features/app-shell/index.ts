export type {
  AppShellPayload,
  PopupShellPayload,
  PopupViewData,
  UiStatus,
} from "./domain/model";

export type { AppShellRepository } from "./data/repository/AppShellRepository";
export { appShellRepository } from "./data/repository/AppShellRepository";

export {
  isExtensionContext,
  useAppShellQuery,
} from "./ui/hooks/useAppShellQuery";
