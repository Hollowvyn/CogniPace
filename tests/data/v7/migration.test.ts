/**
 * v6 → v7 migration tests. The load-bearing invariant is **sidecar before
 * wipe** — if storage ever ends up with the live key wiped before the
 * sidecar key is written, the user's pre-v7 data is lost. We pin the
 * call order via `mock.invocationCallOrder`.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  consumeSidecarBackup,
  getAppDataV7,
  PRE_V7_BACKUP_KEY,
} from "../../../src/data/repositories/v7/appDataRepository";
import { STORAGE_KEY } from "../../../src/domain/common/constants";
import { STORAGE_SCHEMA_VERSION_V7 } from "../../../src/domain/data/appDataV7";

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

vi.mock("@platform/chrome/storage", () => ({
  readLocalStorage: (keys: string[]) => storageMocks.readLocalStorage(keys),
  writeLocalStorage: (payload: Record<string, unknown>) =>
    storageMocks.writeLocalStorage(payload),
  removeLocalStorage: (keys: string[]) => storageMocks.removeLocalStorage(keys),
}));

describe("v6 → v7 migration", () => {
  beforeEach(() => {
    storageMocks.readLocalStorage.mockReset();
    storageMocks.writeLocalStorage.mockReset();
    storageMocks.removeLocalStorage.mockReset();
  });

  it("writes the pre-v7 sidecar BEFORE the v7 wipe (load-bearing)", async () => {
    const v6Blob = {
      schemaVersion: 6,
      problemsBySlug: { "two-sum": { id: "two-sum" } },
      studyStatesBySlug: {},
    };
    storageMocks.readLocalStorage.mockResolvedValueOnce({
      [STORAGE_KEY]: v6Blob,
    });
    storageMocks.writeLocalStorage.mockResolvedValue(undefined);

    await getAppDataV7();

    const calls = storageMocks.writeLocalStorage.mock.calls;
    const sidecarCallIndex = calls.findIndex(
      ([payload]) => Object.keys(payload)[0] === PRE_V7_BACKUP_KEY,
    );
    const liveWriteIndex = calls.findIndex(
      ([payload]) => Object.keys(payload)[0] === STORAGE_KEY,
    );

    expect(sidecarCallIndex).toBeGreaterThanOrEqual(0);
    expect(liveWriteIndex).toBeGreaterThanOrEqual(0);
    expect(sidecarCallIndex).toBeLessThan(liveWriteIndex);
  });

  it("seeds the live key with a fresh v7 snapshot after migration", async () => {
    const v6Blob = { schemaVersion: 6, problemsBySlug: {} };
    storageMocks.readLocalStorage.mockResolvedValueOnce({
      [STORAGE_KEY]: v6Blob,
    });
    storageMocks.writeLocalStorage.mockResolvedValue(undefined);

    const result = await getAppDataV7();

    expect(result.schemaVersion).toBe(STORAGE_SCHEMA_VERSION_V7);
    // Post-Phase-5 tracks slice: every aggregate (topics, companies,
    // tracks) lives in SQLite. The blob's runtime fields are
    // intentionally `{}` after migration — the SW seeds the catalogs
    // into the DB at boot and the dashboard handler hydrates the
    // runtime fields from there.
    expect(result.topicsById).toEqual({});
    expect(result.companiesById).toEqual({});
  });

  it("does not migrate when the stored blob is already v7", async () => {
    storageMocks.readLocalStorage.mockResolvedValueOnce({
      [STORAGE_KEY]: {
        schemaVersion: STORAGE_SCHEMA_VERSION_V7,
        problemsBySlug: {},
        studyStatesBySlug: {},
        topicsById: {},
        companiesById: {},
        studySetsById: {},
        studySetOrder: [],
        studySetProgressById: {},
        settings: {},
      },
    });

    await getAppDataV7();

    const sidecarCalls = storageMocks.writeLocalStorage.mock.calls.filter(
      ([payload]) => Object.keys(payload)[0] === PRE_V7_BACKUP_KEY,
    );
    expect(sidecarCalls).toHaveLength(0);
  });

  it("seeds fresh on first launch with no stored blob", async () => {
    storageMocks.readLocalStorage.mockResolvedValueOnce({});
    storageMocks.writeLocalStorage.mockResolvedValue(undefined);

    const result = await getAppDataV7();

    expect(result.schemaVersion).toBe(STORAGE_SCHEMA_VERSION_V7);
    // No sidecar should be written when there is no pre-v7 blob.
    const sidecarCalls = storageMocks.writeLocalStorage.mock.calls.filter(
      ([payload]) => Object.keys(payload)[0] === PRE_V7_BACKUP_KEY,
    );
    expect(sidecarCalls).toHaveLength(0);
  });

  it("consumeSidecarBackup returns the blob and clears the key once", async () => {
    const sidecarBlob = { schemaVersion: 6, problemsBySlug: {} };
    storageMocks.readLocalStorage.mockResolvedValueOnce({
      [PRE_V7_BACKUP_KEY]: sidecarBlob,
    });
    storageMocks.removeLocalStorage.mockResolvedValue(undefined);

    const result = await consumeSidecarBackup();

    expect(result).toEqual(sidecarBlob);
    expect(storageMocks.removeLocalStorage).toHaveBeenCalledWith([
      PRE_V7_BACKUP_KEY,
    ]);
  });

  it("consumeSidecarBackup returns null when no sidecar exists", async () => {
    storageMocks.readLocalStorage.mockResolvedValueOnce({});
    const result = await consumeSidecarBackup();
    expect(result).toBeNull();
    expect(storageMocks.removeLocalStorage).not.toHaveBeenCalled();
  });
});
