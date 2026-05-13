import assert from "node:assert/strict";

import { openProblemPage } from "@features/problems/server";
import { describe, it } from "vitest";


interface ChromeTabsMock {
  createdTabs: chrome.tabs.CreateProperties[];
  restore: () => void;
  updatedTabs: Array<{
    id: number;
    properties: chrome.tabs.UpdateProperties;
  }>;
}

function installChromeTabsMock(): ChromeTabsMock {
  const previousChrome = globalThis.chrome;
  const createdTabs: chrome.tabs.CreateProperties[] = [];
  const updatedTabs: ChromeTabsMock["updatedTabs"] = [];

  Object.defineProperty(globalThis, "chrome", {
    configurable: true,
    value: {
      tabs: {
        create: async (properties: chrome.tabs.CreateProperties) => {
          createdTabs.push(properties);
          return {} as chrome.tabs.Tab;
        },
        update: async (
          id: number,
          properties: chrome.tabs.UpdateProperties
        ) => {
          updatedTabs.push({ id, properties });
          return { id, ...properties } as chrome.tabs.Tab;
        },
      },
    } as Partial<typeof chrome>,
  });

  return {
    createdTabs,
    restore: () => {
      Object.defineProperty(globalThis, "chrome", {
        configurable: true,
        value: previousChrome,
      });
    },
    updatedTabs,
  };
}

describe("openProblemPage", () => {
  it("reuses the current LeetCode problem tab", async () => {
    const tabsMock = installChromeTabsMock();

    try {
      await openProblemPage({ slug: " Two-Sum " }, {
        tab: { id: 7 },
        url: "https://leetcode.com/problems/two-sum/",
      } as chrome.runtime.MessageSender);
    } finally {
      tabsMock.restore();
    }

    assert.deepEqual(tabsMock.updatedTabs, [
      {
        id: 7,
        properties: { url: "https://leetcode.com/problems/two-sum/" },
      },
    ]);
    assert.equal(tabsMock.createdTabs.length, 0);
  });

  it("opens a new tab from an extension page sender", async () => {
    const tabsMock = installChromeTabsMock();

    try {
      await openProblemPage({ slug: "two-sum" }, {
        tab: {
          id: 11,
          url: "chrome-extension://test-extension/dashboard.html?view=library",
        },
      } as chrome.runtime.MessageSender);
    } finally {
      tabsMock.restore();
    }

    assert.deepEqual(tabsMock.createdTabs, [
      { url: "https://leetcode.com/problems/two-sum/" },
    ]);
    assert.equal(tabsMock.updatedTabs.length, 0);
  });

  it("opens a new tab from the popup sender", async () => {
    const tabsMock = installChromeTabsMock();

    try {
      await openProblemPage({ slug: "two-sum" }, {
        id: "test-extension",
        url: "chrome-extension://test-extension/popup.html",
      } as chrome.runtime.MessageSender);
    } finally {
      tabsMock.restore();
    }

    assert.deepEqual(tabsMock.createdTabs, [
      { url: "https://leetcode.com/problems/two-sum/" },
    ]);
    assert.equal(tabsMock.updatedTabs.length, 0);
  });
});
