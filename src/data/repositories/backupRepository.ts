/** Repository for backup import/export actions. */
import { sendMessage } from "@libs/runtime-rpc/client";

import { ExportPayload } from "../../domain/types";

/** Requests the current exported backup payload. */
export async function exportData() {
  return sendMessage("EXPORT_DATA", {});
}

/** Imports a previously exported backup payload. */
export async function importData(payload: ExportPayload) {
  return sendMessage("IMPORT_DATA", payload);
}

/** Triggers a client-side JSON download for a backup payload. */
export function downloadBackupJson(
  payload: ExportPayload,
  documentRef: Document = document
): void {
  downloadJsonAs(payload, "cognipace-backup.json", documentRef);
}

/**
 * Triggers a client-side JSON download for an arbitrary payload. Used by
 * the pre-v7 sidecar backup prompt where the blob's shape predates the
 * current `ExportPayload` type (raw v6 storage record).
 */
export function downloadJsonAs(
  payload: unknown,
  filename: string,
  documentRef: Document = document,
): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = documentRef.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
