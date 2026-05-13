import { sendMessage } from "@libs/runtime-rpc/client";

import type { ExportPayload, ImportedResponse } from "../../domain/model";

export interface BackupRepository {
  /** Pulls the full persisted snapshot from the SW. */
  exportData(): Promise<ExportPayload>;
  /** Sends an already-validated payload to the SW for import. */
  importData(payload: ExportPayload): Promise<ImportedResponse>;
  /** Triggers a browser download of the payload as canonical JSON. */
  downloadJson(payload: ExportPayload, documentRef?: Document): void;
}

async function dispatchExport(): Promise<ExportPayload> {
  const response = await sendMessage("EXPORT_DATA", {});
  if (!response.ok || !response.data) {
    throw new Error(response.error ?? "backupRepository.exportData failed");
  }
  return response.data;
}

async function dispatchImport(
  payload: ExportPayload,
): Promise<ImportedResponse> {
  const response = await sendMessage("IMPORT_DATA", payload);
  if (!response.ok || !response.data) {
    throw new Error(response.error ?? "backupRepository.importData failed");
  }
  return response.data;
}

function downloadJson(
  payload: ExportPayload,
  documentRef: Document = document,
): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = documentRef.createElement("a");
  link.href = url;
  link.download = "cognipace-backup.json";
  link.click();
  URL.revokeObjectURL(url);
}

export const backupRepository: BackupRepository = {
  exportData: dispatchExport,
  importData: dispatchImport,
  downloadJson,
};
