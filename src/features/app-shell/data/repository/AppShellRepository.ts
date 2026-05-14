import { api } from "@app/api";

import type { AppShellPayload, PopupShellPayload } from "../../domain/model";

export interface AppShellRepository {
  /** Fetches the broad dashboard/overlay payload from the SW. Throws on failure. */
  fetchAppShell(): Promise<AppShellPayload>;
  /** Fetches the narrow popup payload from the SW. Throws on failure. */
  fetchPopupShell(): Promise<PopupShellPayload>;
}

export const appShellRepository: AppShellRepository = {
  fetchAppShell: () => api.getAppShellData({}) as Promise<AppShellPayload>,
  fetchPopupShell: () => api.getPopupShellData({}) as Promise<PopupShellPayload>,
};
