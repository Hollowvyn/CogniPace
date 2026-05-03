/** Repository for loading extension UI read models. */
import { AppShellPayload, PopupShellPayload } from "../../domain/views";
import { sendMessage } from "../../extension/runtime/client";

/** Fetches the broad app-shell payload used by dashboard and overlay flows. */
export async function fetchAppShellPayload() {
  return sendMessage<"GET_APP_SHELL_DATA", AppShellPayload>(
    "GET_APP_SHELL_DATA",
    {}
  );
}

/** Fetches the narrow popup shell payload from the background worker. */
export async function fetchPopupShellPayload() {
  return sendMessage<"GET_POPUP_SHELL_DATA", PopupShellPayload>(
    "GET_POPUP_SHELL_DATA",
    {}
  );
}
