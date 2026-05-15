/** SW receive-side dispatcher.
 *
 *  Reads `{ method, payload }`, authorizes the sender, looks up the handler in
 *  `swApi`, calls it, wraps the result in the wire envelope. Replaces the
 *  per-message validator switch + the router switch — together those used to be
 *  ~500 lines for the same dispatch decision a single object lookup performs. */
import { swApi, type SwApi } from "./swApi";

import type { RpcRequest, RpcResponse } from "@libs/runtime-rpc/proxy";

/** Methods reachable from a LeetCode page (content script). Every other method
 *  is only callable from inside the extension origin (popup, dashboard, overlay). */
const CONTENT_SCRIPT_METHODS = new Set<keyof SwApi>([
  "upsertProblemFromPage",
  "getProblemContext",
  "saveReviewResult",
  "saveOverlayLogDraft",
  "overrideLastReviewResult",
  "openExtensionPage",
  "getAppShellData",
  "getPopupShellData",
  "openProblemPage",
]);

/** Confirms the message came from our own extension and that the requested
 *  method is reachable from the sender's origin. Throws on auth failure. */
function authorize(
  method: keyof SwApi,
  sender: chrome.runtime.MessageSender,
  extensionId: string,
  extensionOrigin: string,
): void {
  if (sender.id !== extensionId) throw new Error("Unauthorized runtime sender.");
  const senderUrl = sender.url ?? sender.tab?.url;
  if (!senderUrl) throw new Error("Unauthorized runtime sender.");
  if (senderUrl.startsWith(extensionOrigin)) return; // popup / dashboard / overlay page
  // Content script on a problem page — allow-list applies.
  const onProblemPage = /^https?:\/\/(?:[^/]+\.)?leetcode\.com\/problems\//i.test(senderUrl);
  if (onProblemPage && CONTENT_SCRIPT_METHODS.has(method)) return;
  throw new Error(`Unauthorized runtime sender for method: ${method}.`);
}

/** Validates the request shape and that `method` is a known handler. */
function parseRequest(raw: unknown): RpcRequest & { method: keyof SwApi } {
  if (typeof raw !== "object" || raw === null) throw new Error("Invalid message.");
  const req = raw as Record<string, unknown>;
  if (typeof req.method !== "string") throw new Error("Missing or invalid method.");
  if (!Object.hasOwn(swApi, req.method)) throw new Error(`Unknown method: ${req.method}`);
  return { method: req.method as keyof SwApi, payload: req.payload };
}

/** End-to-end dispatch: parse → authorize → invoke handler → wrap envelope. */
export async function dispatch(
  raw: unknown,
  sender: chrome.runtime.MessageSender,
  extensionId: string,
  extensionOrigin: string,
): Promise<RpcResponse> {
  let req: { method: keyof SwApi; payload: unknown };
  try {
    req = parseRequest(raw);
    authorize(req.method, sender, extensionId, extensionOrigin);
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
  try {
    // openProblemPage is the only handler that uses sender. The cast is the
    // one place we widen the swApi type to accept an optional second arg.
    const handler = swApi[req.method] as (
      p: unknown,
      s?: chrome.runtime.MessageSender,
    ) => Promise<unknown>;
    return { ok: true, data: await handler(req.payload, sender) };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
