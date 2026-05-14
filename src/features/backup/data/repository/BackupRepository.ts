import { api } from "@app/api";

import type { ExportPayload, ImportedResponse } from "../../domain/model";

export interface BackupRepository {
  /** Pulls the full persisted snapshot from the SW. Throws on failure. */
  exportData(): Promise<ExportPayload>;
  /** Sends an already-validated payload to the SW for import. Throws on failure. */
  importData(payload: ExportPayload): Promise<ImportedResponse>;
  /** Triggers a browser download of the payload as canonical JSON. */
  downloadJson(payload: ExportPayload, documentRef?: Document): void;
}

async function dispatchExport(): Promise<ExportPayload> {
  return (await api.exportData({})) as ExportPayload;
}

async function dispatchImport(
  payload: ExportPayload,
): Promise<ImportedResponse> {
  return (await api.importData(payload)) as ImportedResponse;
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
