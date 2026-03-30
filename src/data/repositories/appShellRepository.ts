/** Repository for loading the aggregated app-shell read model. */
import { AppShellPayload } from "../../domain/views";
import { sendMessage } from "../../extension/runtime/client";

/** Fetches the current popup/dashboard shell payload from the background worker. */
export async function fetchAppShellPayload() {
  return sendMessage<"GET_APP_SHELL_DATA", AppShellPayload>("GET_APP_SHELL_DATA", {});
}
