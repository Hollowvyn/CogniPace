import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";

export const sendMessageMock =
  vi.fn<(method: string, payload?: unknown) => unknown>();
export const tabsCreateMock = vi.fn<(properties: unknown) => unknown>();
const storageChangeListeners = new Set<
  (
    changes: Record<string, chrome.storage.StorageChange>,
    areaName: string
  ) => void
>();

export function emitLocalStorageChange(
  changes: Record<string, chrome.storage.StorageChange>
) {
  for (const listener of storageChangeListeners) {
    listener(changes, "local");
  }
}

/** Wire-level mock used by the typed proxy in production. Translates the
 *  new `{ method, payload }` envelope into the current `(method, payload)`
 *  test mock shape, then normalizes the test's arbitrary return value
 *  (envelope or resolved data) into the proxy's expected
 *  `{ ok, data, error }` envelope. */
async function chromeSendMessageAdapter(envelope: unknown): Promise<unknown> {
  if (
    !envelope ||
    typeof envelope !== "object" ||
    !("method" in envelope) ||
    typeof (envelope as { method: unknown }).method !== "string"
  ) {
    return { ok: false, error: "Invalid envelope from test proxy." };
  }
  const { method, payload } = envelope as { method: string; payload: unknown };
  const raw: unknown = sendMessageMock(method, payload ?? {});
  const result: unknown = raw instanceof Promise ? await raw : raw;
  // Tests may return either an envelope `{ ok, data, error }` or a bare
  // value. Normalize: if it looks like an envelope keep it; otherwise
  // wrap as a success envelope so the proxy resolves with the value.
  if (result && typeof result === "object" && "ok" in (result as object)) {
    return result;
  }
  return { ok: true, data: result };
}

afterEach(() => {
  cleanup();
  sendMessageMock.mockReset();
  tabsCreateMock.mockReset();
  storageChangeListeners.clear();
  vi.useRealTimers();
});

beforeEach(() => {
  Object.defineProperty(window, "scrollTo", {
    configurable: true,
    value: vi.fn(),
  });
  Object.defineProperty(globalThis, "chrome", {
    configurable: true,
    value: {
      runtime: {
        getURL: (path: string) => `chrome-extension://test/${path}`,
        id: "test-extension",
        sendMessage: chromeSendMessageAdapter,
      },
      tabs: {
        create: tabsCreateMock,
      },
      storage: {
        onChanged: {
          addListener: (
            listener: (
              changes: Record<string, chrome.storage.StorageChange>,
              areaName: string
            ) => void
          ) => {
            storageChangeListeners.add(listener);
          },
          removeListener: (
            listener: (
              changes: Record<string, chrome.storage.StorageChange>,
              areaName: string
            ) => void
          ) => {
            storageChangeListeners.delete(listener);
          },
        },
      },
    },
  });
});
