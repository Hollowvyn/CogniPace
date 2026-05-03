import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";

export const sendMessageMock = vi.fn();
export const tabsCreateMock = vi.fn();
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

vi.mock("../../../src/extension/runtime/client", () => {
  return {
    sendMessage: (...args: unknown[]) => sendMessageMock(...args),
  };
});

afterEach(() => {
  cleanup();
  sendMessageMock.mockReset();
  tabsCreateMock.mockReset();
  storageChangeListeners.clear();
  vi.useRealTimers();
});

beforeEach(() => {
  Object.defineProperty(globalThis, "chrome", {
    configurable: true,
    value: {
      runtime: {
        getURL: (path: string) => `chrome-extension://test/${path}`,
        id: "test-extension",
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
