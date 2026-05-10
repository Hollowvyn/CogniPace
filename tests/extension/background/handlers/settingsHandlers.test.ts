import assert from "node:assert/strict";

import { beforeEach, describe, it, vi } from "vitest";

import {
  getAppData,
  STORAGE_KEY,
} from "../../../../src/data/repositories/appDataRepository";
import { resetStudyHistory } from "../../../../src/extension/background/handlers/settingsHandlers";
import { makeProblem, makeScheduledState } from "../../../support/domainFixtures";

const storageMocks = vi.hoisted(() => ({
  readLocalStorage: vi.fn(),
  writeLocalStorage: vi.fn(),
}));

vi.stubGlobal("chrome", {
  storage: {
    local: {
      get: storageMocks.readLocalStorage,
      set: storageMocks.writeLocalStorage,
      remove: vi.fn(),
    },
  },
});

vi.mock("../../../../src/data/datasources/chrome/storage", () => ({
  readLocalStorage: storageMocks.readLocalStorage,
  writeLocalStorage: storageMocks.writeLocalStorage,
  removeLocalStorage: vi.fn(),
}));

describe("Reset Study History", () => {
  beforeEach(() => {
    storageMocks.readLocalStorage.mockReset();
    storageMocks.writeLocalStorage.mockReset();
  });

  it("clears study history but preserves problems and settings", async () => {
    const initialData = {
      problemsBySlug: {
        "two-sum": makeProblem("two-sum", "Two Sum", "Easy"),
      },
      studyStatesBySlug: {
        "two-sum": makeScheduledState("2026-03-01T00:00:00.000Z"),
      },
      settings: {
        dailyQuestionGoal: 42,
      },
    };

    storageMocks.readLocalStorage.mockResolvedValue({
      [STORAGE_KEY]: initialData,
    });

    // Verify initial state
    const before = await getAppData();
    assert.equal(Object.keys(before.studyStatesBySlug).length, 1);
    assert.equal(before.settings.dailyQuestionGoal, 42);

    // Execute reset
    await resetStudyHistory();

    // Verify written data
    const lastCall = storageMocks.writeLocalStorage.mock.calls.at(-1);
    const savedData = lastCall?.[0][STORAGE_KEY];

    assert.equal(Object.keys(savedData.studyStatesBySlug).length, 0);
    // v7 — track progress aggregate is wiped alongside study states.
    assert.equal(Object.keys(savedData.studySetProgressById).length, 0);
    assert.equal(savedData.problemsBySlug["two-sum"].leetcodeSlug, "two-sum");
    assert.equal(savedData.settings.dailyQuestionGoal, 42);
  });
});
