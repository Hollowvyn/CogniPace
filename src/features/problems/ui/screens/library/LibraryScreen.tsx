import { SurfaceCard } from "@design-system/atoms";
import { createInitialUserSettings } from "@features/settings";

import { EditProblemModalConnected } from "../../components/EditProblemModalConnected";
import { LibraryProblemTable } from "../../components/problemsTable";

import type { AppShellPayload } from "@features/app-shell";

export interface LibraryScreenProps {
  payload: AppShellPayload | null;
  onRefresh?: () => Promise<void> | void;
}

export function LibraryScreen({ onRefresh, payload }: LibraryScreenProps) {
  return (
    <SurfaceCard label="Library" title="All Tracked Problems">
      <LibraryProblemTable
        problems={payload?.problems ?? []}
        tracks={payload?.tracks ?? []}
        settings={payload?.settings ?? createInitialUserSettings()}
        onRefresh={onRefresh}
      />

      <EditProblemModalConnected />
    </SurfaceCard>
  );
}
