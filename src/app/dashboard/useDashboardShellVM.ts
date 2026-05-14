/** DashboardShell's ViewModel — owns route state, filters, and the
 *  cross-feature concerns (backup export/import, study-history reset)
 *  that don't have a dedicated feature owner yet. Settings-screen state
 *  (draft, save, discard, reset) lives inside
 *  `features/settings/ui/hooks/useSettingsScreen`; the shell just passes
 *  the persisted snapshot through and surfaces status. */
import { useDI } from "@app/di";
import { createMockAppShellPayload, useAppShellQuery } from "@features/app-shell";
import { openProblemPage } from "@features/problems";
import {
  createDefaultLibraryFilters,
  filterLibraryRows,
  LibraryFilters,
} from "@features/problems/ui/presentation/library";
import { isExtensionContext } from "@platform/chrome/tabs";
import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useDeferredValue,
} from "react";

import { resetStudyHistory } from "../../data/repositories/settingsRepository";

import {
  buildDashboardUrl,
  getDashboardRoute,
  readDashboardViewFromSearch,
  DashboardView,
} from "./navigation/routes";

import type { ExportPayload } from "@features/backup";
import type { UserSettings } from "@features/settings";
import type { TrackId } from "@shared/ids";

function isImportPayloadCandidate(value: unknown): value is ExportPayload {
  return Boolean(value) && typeof value === "object";
}

/** Coordinates dashboard screen state while keeping transport concerns in repositories. */
export function useDashboardShellVM() {
  const { backupRepository, settingsRepository } = useDI();
  const mockPayload = useMemo(() => createMockAppShellPayload(), []);
  const { load, payload, setPayload, setStatus, status } =
    useAppShellQuery(mockPayload);
  const [view, setView] = useState<DashboardView>(() =>
    readDashboardViewFromSearch(window.location.search)
  );
  const [filters, setFilters] = useState<LibraryFilters>(
    createDefaultLibraryFilters()
  );
  const [importFile, setImportFile] = useState<File | null>(null);
  const deferredQuery = useDeferredValue(filters.query);
  const { trackId, difficulty, status: filterStatus } = filters;

  useEffect(() => {
    const handlePopState = () => {
      startTransition(() => {
        setView(readDashboardViewFromSearch(window.location.search));
      });
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  const rows = useMemo(
    () =>
      filterLibraryRows(payload?.library ?? [], {
        trackId,
        difficulty,
        status: filterStatus,
        query: deferredQuery,
      }),
    [trackId, deferredQuery, difficulty, filterStatus, payload?.library]
  );

  const refresh = useCallback(
    async (clearStatus = true): Promise<void> => {
      await load({ clearStatusOnSuccess: clearStatus });
    },
    [load]
  );

  const navigateToView = useCallback((nextView: DashboardView): void => {
    startTransition(() => {
      setView(nextView);
    });
    window.history.pushState(
      {},
      "",
      buildDashboardUrl(window.location.href, nextView)
    );
  }, []);

  const runMutation = useCallback(
    async <T>(
      action: Promise<T>,
      successMessage?: string
    ): Promise<boolean> => {
      try {
        await action;
      } catch (err) {
        setStatus({
          message: (err as Error).message || "Action failed.",
          isError: true,
        });
        return false;
      }

      if (successMessage) {
        setStatus({
          message: successMessage,
          isError: false,
        });
      }
      await load({ clearStatusOnSuccess: false });
      return true;
    },
    [load, setStatus]
  );

  const onOpenProblem = useCallback(
    async (target: {
      slug: string;
      groupId?: string;
      trackId?: string;
    }): Promise<void> => {
      try {
        await openProblemPage(target);
      } catch (err) {
        setStatus({
          message: (err as Error).message || "Failed to open problem.",
          isError: true,
        });
      }
    },
    [setStatus]
  );

  const onEnablePremium = useCallback(async (): Promise<void> => {
    // Hook → Repository → Client → SW → DataSource → DB.
    try {
      const saved = await settingsRepository.setSkipPremium(false);
      setPayload((current) =>
        current ? { ...current, settings: saved } : current,
      );
      setStatus({ message: "Premium questions enabled.", isError: false });
      if (isExtensionContext()) {
        await load({ clearStatusOnSuccess: false });
      }
    } catch (err) {
      setStatus({
        message: (err as Error).message || "Action failed.",
        isError: true,
      });
    }
  }, [load, setPayload, setStatus, settingsRepository]);

  const onToggleMode = useCallback(async (): Promise<void> => {
    const nextMode =
      payload?.settings?.studyMode === "studyPlan" ? "freestyle" : "studyPlan";
    if (!nextMode) {
      return;
    }
    try {
      const saved = await settingsRepository.setStudyMode(nextMode);
      setPayload((current) =>
        current ? { ...current, settings: saved } : current,
      );
      setStatus({ message: "Study mode updated.", isError: false });
      if (isExtensionContext()) {
        await load({ clearStatusOnSuccess: false });
      }
    } catch (err) {
      setStatus({
        message: (err as Error).message || "Action failed.",
        isError: true,
      });
    }
  }, [
    load,
    payload?.settings?.studyMode,
    setPayload,
    setStatus,
    settingsRepository,
  ]);

  const onResetStudyHistory = useCallback(async (): Promise<void> => {
    await runMutation(resetStudyHistory(), "Study history reset.");
  }, [runMutation]);

  const onExportData = useCallback(async (): Promise<void> => {
    try {
      const payload = await backupRepository.exportData();
      backupRepository.downloadJson(payload);
      setStatus({ message: "Backup exported.", isError: false });
    } catch (err) {
      setStatus({
        message: (err as Error).message || "Failed to export data.",
        isError: true,
      });
    }
  }, [backupRepository, setStatus]);

  const onImportData = useCallback(async (): Promise<void> => {
    if (!importFile) {
      setStatus({ message: "Choose a backup file first.", isError: true });
      return;
    }

    const text = await importFile.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      setStatus({ message: "Invalid JSON backup file.", isError: true });
      return;
    }

    if (!isImportPayloadCandidate(parsed)) {
      setStatus({ message: "Backup payload is malformed.", isError: true });
      return;
    }

    try {
      await backupRepository.importData(parsed);
      setStatus({ message: "Backup imported.", isError: false });
      await load({ clearStatusOnSuccess: false });
    } catch (err) {
      setStatus({
        message: (err as Error).message || "Failed to import data.",
        isError: true,
      });
    }
  }, [backupRepository, importFile, load, setStatus]);

  const onSetActiveFocus = useCallback(
    async (trackId: TrackId | null): Promise<void> => {
      let savedSettings: UserSettings;
      try {
        savedSettings = await settingsRepository.setActiveTrack(trackId);
      } catch (err) {
        setStatus({
            message: (err as Error).message || "Failed to update active track.",
          isError: true,
        });
        return;
      }
      setPayload((current) =>
        current ? { ...current, settings: savedSettings } : current,
      );
      if (isExtensionContext()) {
        await load({ clearStatusOnSuccess: false });
      }
    },
    [load, setPayload, setStatus, settingsRepository],
  );

  const applySavedSettings = useCallback(
    (saved: UserSettings): void => {
      setPayload((current) =>
        current ? { ...current, settings: saved } : current,
      );
      if (isExtensionContext()) {
        void load({ clearStatusOnSuccess: false });
      }
    },
    [load, setPayload],
  );

  return {
    applySavedSettings,
    filters,
    importFile,
    navigateToView,
    onEnablePremium,
    onExportData,
    onImportData,
    onOpenProblem,
    onResetStudyHistory,
    onSetActiveFocus,
    onToggleMode,
    payload,
    refresh,
    route: getDashboardRoute(view),
    rows,
    setFilters,
    setImportFile,
    setStatus,
    status,
    view,
  };
}
