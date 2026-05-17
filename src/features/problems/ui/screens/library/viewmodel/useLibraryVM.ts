import { createInitialUserSettings } from "@features/settings";
import { useMemo } from "react";

import type { Problem } from "../../../../domain/model";
import type { AppShellPayload } from "@features/app-shell";
import type { UserSettings } from "@features/settings";
import type { Track } from "@features/tracks";

export interface LibraryViewModel {
  problems: readonly Problem[];
  settings: UserSettings;
  title: string;
  tracks: readonly Track[];
}

export function useLibraryVM(
  payload: AppShellPayload | null
): LibraryViewModel {
  return useMemo(
    () => ({
      problems: payload?.problems ?? [],
      settings: payload?.settings ?? createInitialUserSettings(),
      title: "All Tracked Problems",
      tracks: payload?.tracks ?? [],
    }),
    [payload]
  );
}
