import assert from "node:assert/strict";

import { beforeEach, describe, it, vi } from "vitest";

import {
  getAppData,
  STORAGE_KEY,
} from "../../../../src/data/repositories/appDataRepository";
import { clearAllStudyHistory } from "../../../../src/data/studyStates/repository";
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

// Post-Phase-5 tracks slice: resetStudyHistory only wipes the SQLite
// study_states + attempt_history tables (track progress is derived,
// no separate aggregate to clear). Mock the SQLite path so this test
// doesn't load wasm — the SQLite-side test
// (tests/data/studyStates/repository.test.ts) verifies the actual
// table truncation.
vi.mock("../../../../src/data/db/instance", () => ({
  getDb: vi.fn().mockResolvedValue({ db: null }),
}));
vi.mock("../../../../src/data/studyStates/repository", () => ({
  clearAllStudyHistory: vi.fn(),
  // Other exports left undefined — the test doesn't call them.
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

    const writesBeforeReset = storageMocks.writeLocalStorage.mock.calls.length;

    // Execute reset
    await resetStudyHistory();

    // Single contract: clearAllStudyHistory fires once. Wiping
    // study_states + attempt_history is enough — track progress is
    // derived from attempt_history, so there's no separate aggregate
    // to clear. The reset itself doesn't touch chrome.storage either.
    assert.equal(
      (clearAllStudyHistory as ReturnType<typeof vi.fn>).mock.calls.length,
      1,
    );
    assert.equal(
      storageMocks.writeLocalStorage.mock.calls.length,
      writesBeforeReset,
    );
  });
});
