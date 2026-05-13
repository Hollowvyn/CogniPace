import { sendMessage } from "@libs/runtime-rpc/client";

import type {
  AppShellPayload,
  PopupShellPayload,
} from "../../domain/model";

export interface AppShellRepository {
  /** Fetches the broad dashboard/overlay payload from the SW. */
  fetchAppShell(): Promise<{
    ok: boolean;
    data?: AppShellPayload;
    error?: string;
  }>;
  /** Fetches the narrow popup payload from the SW. */
  fetchPopupShell(): Promise<{
    ok: boolean;
    data?: PopupShellPayload;
    error?: string;
  }>;
}

export const appShellRepository: AppShellRepository = {
  fetchAppShell: () =>
    sendMessage<"GET_APP_SHELL_DATA", AppShellPayload>(
      "GET_APP_SHELL_DATA",
      {},
    ),
  fetchPopupShell: () =>
    sendMessage<"GET_POPUP_SHELL_DATA", PopupShellPayload>(
      "GET_POPUP_SHELL_DATA",
      {},
    ),
};
