/** UI-side typed handle to the service worker.
 *
 *  `api.X(payload)` → `chrome.runtime.sendMessage({ method: "X", payload })`.
 *  Resolves with the handler's return value. Throws an Error with the handler's
 *  error message on failure. The Proxy + tsconfig path alias mean every UI
 *  caller gets full TS autocomplete on the SW surface. */
import { createSwClient } from "@libs/runtime-rpc/client";

import type { SwApi } from "@extension/background/swApi";

export const api = createSwClient<SwApi>();
