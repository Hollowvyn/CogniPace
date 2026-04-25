import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";

export const sendMessageMock = vi.fn();
export const tabsCreateMock = vi.fn();

vi.mock("../../../src/extension/runtime/client", () => {
  return {
    sendMessage: (...args: unknown[]) => sendMessageMock(...args),
  };
});

afterEach(() => {
  cleanup();
  sendMessageMock.mockReset();
  tabsCreateMock.mockReset();
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
    },
  });
});
