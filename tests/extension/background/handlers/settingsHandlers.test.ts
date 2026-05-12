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

// Phase 5: resetStudyHistory now clears the SQLite study_states +
// attempt_history tables via clearAllStudyHistory. Mock the SQLite
// path so the test doesn't try to load wasm — the test's contract
// is "the v7 blob's studySetProgressById gets wiped"; the SQLite
// side is covered by tests/data/studyStates/repository.test.ts.
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

    // Execute reset
    await resetStudyHistory();

    // Phase 5: study states live in SQLite — confirm the repo wipe
    // fired; the SQLite-side test (tests/data/studyStates/) verifies
    // the actual table truncation.
    assert.equal(
      (clearAllStudyHistory as ReturnType<typeof vi.fn>).mock.calls.length,
      1,
    );

    // The v7 blob still carries studySetProgressById; verify the
    // legacy wipe path ran for that aggregate. Problems + settings
    // (also v7 blob residents but read from SQLite in production)
    // are preserved on the v7 write so the legacy fields stay
    // consistent during the transitional period.
    const lastCall = storageMocks.writeLocalStorage.mock.calls.at(-1);
    const savedData = lastCall?.[0][STORAGE_KEY];
    assert.equal(Object.keys(savedData.studySetProgressById).length, 0);
    assert.equal(savedData.problemsBySlug["two-sum"].leetcodeSlug, "two-sum");
    assert.equal(savedData.settings.dailyQuestionGoal, 42);
  });
});
