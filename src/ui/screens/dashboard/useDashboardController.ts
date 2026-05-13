/** Dashboard-local controller for route state, filters, and runtime
 * mutations that haven't migrated to a feature yet. Settings-screen
 * state (draft, save, discard, reset) now lives inside
 * `features/settings/ui/hooks/useSettingsScreen` — the dashboard just
 * passes the persisted snapshot through and surfaces status. Other
 * cross-feature concerns (backup export/import, study-history reset)
 * stay here until Phase 7. */
import { useDI } from "@app/di";
import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useDeferredValue,
} from "react";

import { openProblemPage } from "../../../data/repositories/problemSessionRepository";
import { resetStudyHistory } from "../../../data/repositories/settingsRepository";
import { setActiveFocus } from "../../../data/repositories/v7ActionRepository";
import { createMockAppShellPayload } from "../../mockData";
import {
  buildDashboardUrl,
  getDashboardRoute,
  readDashboardViewFromSearch,
  DashboardView,
} from "../../navigation/dashboardRoutes";
import {
  createDefaultLibraryFilters,
  filterLibraryRows,
  LibraryFilters,
} from "../../presentation/library";
import {
  isExtensionContext,
  useAppShellQuery,
} from "../../state/useAppShellQuery";

import type { ActiveFocus } from "../../../domain/active-focus/model";
import type { ExportPayload } from "@features/backup";
import type { UserSettings } from "@features/settings";

function isImportPayloadCandidate(value: unknown): value is ExportPayload {
  return Boolean(value) && typeof value === "object";
}

/** Coordinates dashboard screen state while keeping transport concerns in repositories. */
export function useDashboardController() {
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
    async <T extends { ok: boolean; error?: string }>(
      action: Promise<T>,
      successMessage?: string
    ): Promise<boolean> => {
      const response = await action;
      if (!response.ok) {
        setStatus({
          message: response.error ?? "Action failed.",
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
      chapterId?: string;
      courseId?: string;
    }): Promise<void> => {
      const response = await openProblemPage(target);
      if (!response.ok) {
        setStatus({
          message: response.error ?? "Failed to open problem.",
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
        message: err instanceof Error ? err.message : "Action failed.",
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
        message: err instanceof Error ? err.message : "Action failed.",
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
        message: err instanceof Error ? err.message : "Failed to export data.",
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
        message: err instanceof Error ? err.message : "Failed to import data.",
        isError: true,
      });
    }
  }, [backupRepository, importFile, load, setStatus]);

  const onSetActiveFocus = useCallback(
    async (focus: ActiveFocus): Promise<void> => {
      const response = await setActiveFocus(focus);
      if (!response.ok) {
        setStatus({
          message: response.error ?? "Failed to update active track.",
          isError: true,
        });
        return;
      }
      const savedSettings = response.data?.settings;
      if (savedSettings) {
        setPayload((current) =>
          current ? { ...current, settings: savedSettings } : current,
        );
      }
      if (isExtensionContext()) {
        await load({ clearStatusOnSuccess: false });
      }
    },
    [load, setPayload, setStatus],
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
