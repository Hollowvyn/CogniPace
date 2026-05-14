import assert from "node:assert/strict";

import { resetStudyHistory } from "@features/backup/server";
import { clearAllStudyHistory } from "@features/study/server";
import { beforeEach, describe, it, vi } from "vitest";

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

vi.mock("@platform/chrome/storage", () => ({
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
vi.mock("@platform/db/instance", () => ({
  getDb: vi.fn().mockResolvedValue({ db: null }),
}));
vi.mock("@features/study/server", () => ({
  clearAllStudyHistory: vi.fn(),
  // Other exports left undefined — the test doesn't call them.
}));

describe("Reset Study History", () => {
  beforeEach(() => {
    storageMocks.readLocalStorage.mockReset();
    storageMocks.writeLocalStorage.mockReset();
  });

  it("clears study history without touching chrome.storage", async () => {
    const writesBeforeReset = storageMocks.writeLocalStorage.mock.calls.length;

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
