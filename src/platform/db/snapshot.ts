/**
 * SQLite snapshot persistence — Phase 6.
 *
 * Persists the wasm DB across SW restarts by serialising it to a byte
 * buffer (via sqlite-wasm's `sqlite3_js_db_export`), base64-encoding,
 * and writing into `chrome.storage.local`. On the next SW boot we
 * deserialise back into a fresh wasm DB with `sqlite3_deserialize`.
 *
 * A short hash of the migration SQL — the "schema fingerprint" — is
 * stored alongside the snapshot. If the deployed extension's migration
 * doesn't match the stored fingerprint, the snapshot is dropped and
 * the DB starts fresh (per charter rule: pre-MVP we wipe on schema
 * change; tightening happens at MVP).
 */
import type { DbHandle } from "./client";

/** Versioned storage keys — bump the suffix if the snapshot format
 * changes in a non-backwards-compatible way (independent of schema
 * fingerprints, which are content-driven). */
export const SNAPSHOT_KEY = "cognipace_db_snapshot_v1";
export const FINGERPRINT_KEY = "cognipace_db_snapshot_fingerprint_v1";

/**
 * djb2 hash — deterministic, 8-char hex output. Used to detect schema
 * changes between snapshot writes and reads. Cryptographic strength
 * isn't required; we just need a fast, stable summary of the migration
 * text contents.
 */
export function computeFingerprint(text: string): string {
  let hash = 5381;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) + hash) ^ text.charCodeAt(i);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

/**
 * Encodes raw DB bytes as a base64 ASCII string suitable for
 * `chrome.storage.local`. Chunks the byte → char conversion to avoid
 * blowing the call stack on multi-megabyte snapshots.
 */
export function bytesToBase64(bytes: Uint8Array): string {
  const CHUNK = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

export function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Serialises the live wasm DB to a Uint8Array. Backed by
 * `sqlite3_js_db_export`, which calls SQLite's `sqlite3_serialize`
 * internally — it's a snapshot of the in-memory file, not a textual
 * dump.
 */
export function serializeDb(handle: DbHandle): Uint8Array {
  return handle.sqlite3.capi.sqlite3_js_db_export(handle.rawDb);
}

/**
 * Restores a serialised snapshot into the given live wasm DB. The
 * bytes are copied into wasm-heap memory; SQLite takes ownership of
 * the buffer via `SQLITE_DESERIALIZE_FREEONCLOSE` so we don't have to
 * `dealloc` it manually. `RESIZEABLE` lets the in-memory file grow
 * on subsequent writes.
 *
 * Throws on a non-zero result code from `sqlite3_deserialize`.
 */
export function deserializeDb(handle: DbHandle, bytes: Uint8Array): void {
  const { capi, wasm } = handle.sqlite3;
  const ptr = wasm.allocFromTypedArray(bytes);
  const flags =
    capi.SQLITE_DESERIALIZE_FREEONCLOSE | capi.SQLITE_DESERIALIZE_RESIZEABLE;
  const rc = capi.sqlite3_deserialize(
    handle.rawDb,
    "main",
    ptr,
    bytes.length,
    bytes.length,
    flags,
  );
  if (rc !== 0) {
    throw new Error(`sqlite3_deserialize failed (rc=${rc})`);
  }
}

export interface StoredSnapshot {
  fingerprint: string;
  bytes: Uint8Array;
}

/** Reads the snapshot from `chrome.storage.local`. Returns null when
 * either the snapshot OR fingerprint key is missing — the pair is
 * load-bearing together. */
export async function readSnapshotFromStorage(): Promise<StoredSnapshot | null> {
  const result = await chrome.storage.local.get([SNAPSHOT_KEY, FINGERPRINT_KEY]);
  const fingerprint = result[FINGERPRINT_KEY];
  const b64 = result[SNAPSHOT_KEY];
  if (typeof fingerprint !== "string" || typeof b64 !== "string") {
    return null;
  }
  return { fingerprint, bytes: base64ToBytes(b64) };
}

/** Writes the snapshot + fingerprint atomically (chrome.storage.local
 * batches the set call so both land together). */
export async function writeSnapshotToStorage(
  snapshot: StoredSnapshot,
): Promise<void> {
  await chrome.storage.local.set({
    [SNAPSHOT_KEY]: bytesToBase64(snapshot.bytes),
    [FINGERPRINT_KEY]: snapshot.fingerprint,
  });
}

/** Drops the snapshot entirely — used when the schema fingerprint
 * mismatches (pre-MVP wipe policy) or when tests need a clean slate. */
export async function clearSnapshot(): Promise<void> {
  await chrome.storage.local.remove([SNAPSHOT_KEY, FINGERPRINT_KEY]);
}
