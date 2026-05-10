import assert from "node:assert/strict";

import { beforeEach, describe, it, vi } from "vitest";

import {
  getAppData,
  PRE_V7_BACKUP_KEY,
  STORAGE_KEY,
} from "../../src/data/repositories/appDataRepository";
import { CURRENT_STORAGE_SCHEMA_VERSION } from "../../src/domain/common/constants";

const storageMocks = vi.hoisted(() => ({
  readLocalStorage: vi.fn(),
  writeLocalStorage: vi.fn(),
  removeLocalStorage: vi.fn(),
}));

vi.stubGlobal("chrome", {
  storage: {
    local: {
      get: storageMocks.readLocalStorage,
      set: storageMocks.writeLocalStorage,
      remove: storageMocks.removeLocalStorage,
    },
  },
});

vi.mock("../../src/data/datasources/chrome/storage", () => ({
  readLocalStorage: (keys: string[]) => storageMocks.readLocalStorage(keys),
  writeLocalStorage: (payload: Record<string, unknown>) =>
    storageMocks.writeLocalStorage(payload),
  removeLocalStorage: (keys: string[]) => storageMocks.removeLocalStorage(keys),
}));

describe("legacy app-data migration", () => {
  beforeEach(() => {
    storageMocks.readLocalStorage.mockReset();
    storageMocks.writeLocalStorage.mockReset();
    storageMocks.removeLocalStorage.mockReset();
  });

  it("writes a pre-v7 sidecar before persisting seeded v7 aggregates", async () => {
    const preV7Blob = {
      schemaVersion: CURRENT_STORAGE_SCHEMA_VERSION,
      problemsBySlug: { "two-sum": { id: "two-sum" } },
      studyStatesBySlug: {},
      coursesById: {},
      courseOrder: [],
      courseProgressById: {},
      settings: {
        dailyQuestionGoal: 10,
      },
    };
    storageMocks.readLocalStorage.mockResolvedValueOnce({
      [STORAGE_KEY]: preV7Blob,
    });
    storageMocks.writeLocalStorage.mockResolvedValue(undefined);

    const result = await getAppData();
    const calls = storageMocks.writeLocalStorage.mock.calls;
    const sidecarCallIndex = calls.findIndex(
      ([payload]) => Object.keys(payload)[0] === PRE_V7_BACKUP_KEY,
    );
    const liveWriteIndex = calls.findIndex(
      ([payload]) => Object.keys(payload)[0] === STORAGE_KEY,
    );

    assert.equal(result.schemaVersion, CURRENT_STORAGE_SCHEMA_VERSION);
    assert.ok(Object.keys(result.topicsById).length > 0);
    assert.ok(Object.keys(result.companiesById).length > 0);
    assert.ok(Object.keys(result.studySetsById).length > 0);
    assert.notEqual(sidecarCallIndex, -1);
    assert.notEqual(liveWriteIndex, -1);
    assert.ok(sidecarCallIndex < liveWriteIndex);
  });
});
