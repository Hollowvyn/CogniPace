/** Repository for backup import/export actions. */
import { ExportPayload } from "../../domain/types";
import { sendMessage } from "../../extension/runtime/client";

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
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = documentRef.createElement("a");
  link.href = url;
  link.download = "kinetic-terminal-backup.json";
  link.click();
  URL.revokeObjectURL(url);
}
