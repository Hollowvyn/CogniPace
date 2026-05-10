/** Dashboard-local controller for route state, filters, settings draft, and runtime mutations. */
import {
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  downloadBackupJson,
  exportData,
  importData,
} from "../../../data/repositories/backupRepository";
import { openProblemPage } from "../../../data/repositories/problemSessionRepository";
import {
  resetStudyHistory,
  updateSettings,
} from "../../../data/repositories/settingsRepository";
import { setActiveFocus } from "../../../data/repositories/v7ActionRepository";
import {
  areUserSettingsEqual,
  cloneUserSettings,
  createInitialUserSettings,
  UserSettings,
} from "../../../domain/settings";
import { sanitizeStoredUserSettings } from "../../../domain/settings/sanitize";
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

function isImportPayloadCandidate(
  value: unknown
): value is Parameters<typeof importData>[0] {
  return Boolean(value) && typeof value === "object";
}

/** Coordinates dashboard screen state while keeping transport concerns in repositories. */
export function useDashboardController() {
  const mockPayload = useMemo(() => createMockAppShellPayload(), []);
  const { load, payload, setPayload, setStatus, status } =
    useAppShellQuery(mockPayload);
  const [view, setView] = useState<DashboardView>(() =>
    readDashboardViewFromSearch(window.location.search)
  );
  const [filters, setFilters] = useState<LibraryFilters>(
    createDefaultLibraryFilters()
  );
  const [settingsDraftState, setSettingsDraftState] =
    useState<UserSettings | null>(null);
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

  const draftSettings = useMemo(() => {
    const source = settingsDraftState ?? payload?.settings;
    return source ? cloneUserSettings(source) : null;
  }, [payload?.settings, settingsDraftState]);

  const hasSettingsChanges =
    payload?.settings && draftSettings
      ? !areUserSettingsEqual(draftSettings, payload.settings)
      : false;
  const isDefaultSettingsDraft = draftSettings
    ? areUserSettingsEqual(draftSettings, createInitialUserSettings())
    : true;

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
    await runMutation(
      updateSettings({
        questionFilters: { skipPremium: false },
      }),
      "Premium questions enabled.",
    );
  }, [runMutation]);

  const onToggleMode = useCallback(async (): Promise<void> => {
    const nextMode =
      payload?.settings.studyMode === "studyPlan" ? "freestyle" : "studyPlan";
    if (!nextMode) {
      return;
    }

    await runMutation(
      updateSettings({ studyMode: nextMode }),
      "Study mode updated."
    );
  }, [payload?.settings.studyMode, runMutation]);

  const updateSettingsDraft = useCallback(
    (updater: (current: UserSettings) => UserSettings) => {
      setSettingsDraftState((current) =>
        updater(
          cloneUserSettings(
            current ?? payload?.settings ?? createInitialUserSettings()
          )
        )
      );
    },
    [payload?.settings, setSettingsDraftState]
  );

  const onSaveSettings = useCallback(async (): Promise<void> => {
    if (!hasSettingsChanges || !draftSettings) {
      return;
    }

    const nextSettings = sanitizeStoredUserSettings(cloneUserSettings(draftSettings));
    const response = await updateSettings(nextSettings);
    if (!response.ok) {
      setStatus({
        message: response.error ?? "Action failed.",
        isError: true,
      });
      return;
    }

    const savedSettings = response.data?.settings ?? nextSettings;
    setPayload((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        settings: cloneUserSettings(savedSettings),
      };
    });
    setSettingsDraftState(null);
    setStatus({
      message: "Settings saved.",
      isError: false,
    });
    if (isExtensionContext()) {
      await load({ clearStatusOnSuccess: false });
    }
  }, [
    draftSettings,
    hasSettingsChanges,
    load,
    setPayload,
    setSettingsDraftState,
    setStatus,
  ]);

  const onDiscardSettings = useCallback((): void => {
    setSettingsDraftState(null);
  }, [setSettingsDraftState]);

  const onResetSettingsToDefaults = useCallback(async (): Promise<void> => {
    const nextSettings = createInitialUserSettings();
    const response = await updateSettings(nextSettings);
    if (!response.ok) {
      setStatus({
        message: response.error ?? "Failed to reset settings.",
        isError: true,
      });
      return;
    }

    setPayload((current) => {
      if (!current) {
        return current;
      }
      return {
        ...current,
        settings: cloneUserSettings(nextSettings),
      };
    });
    setSettingsDraftState(null);
    setStatus({
      message: "Settings reset to defaults.",
      isError: false,
    });
    if (isExtensionContext()) {
      await load({ clearStatusOnSuccess: false });
    }
  }, [load, setPayload, setSettingsDraftState, setStatus]);

  const onResetStudyHistory = useCallback(async (): Promise<void> => {
    await runMutation(resetStudyHistory(), "Study history reset.");
  }, [runMutation]);

  const onExportData = useCallback(async (): Promise<void> => {
    const response = await exportData();
    if (!response.ok || !response.data) {
      setStatus({
        message: response.error ?? "Failed to export data.",
        isError: true,
      });
      return;
    }

    downloadBackupJson(response.data);
    setStatus({
      message: "Backup exported.",
      isError: false,
    });
  }, [setStatus]);

  const onImportData = useCallback(async (): Promise<void> => {
    if (!importFile) {
      setStatus({
        message: "Choose a backup file first.",
        isError: true,
      });
      return;
    }

    const text = await importFile.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      setStatus({
        message: "Invalid JSON backup file.",
        isError: true,
      });
      return;
    }

    if (!isImportPayloadCandidate(parsed)) {
      setStatus({
        message: "Backup payload is malformed.",
        isError: true,
      });
      return;
    }

    await runMutation(importData(parsed), "Backup imported.");
  }, [importFile, runMutation, setStatus]);


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
          current
            ? { ...current, settings: cloneUserSettings(savedSettings) }
            : current,
        );
      }
      if (isExtensionContext()) {
        await load({ clearStatusOnSuccess: false });
      }
    },
    [load, setPayload, setStatus],
  );

  return {
    draftSettings,
    filters,
    hasSettingsChanges,
    importFile,
    isDefaultSettingsDraft,
    navigateToView,
    onEnablePremium,
    onExportData,
    onDiscardSettings,
    onImportData,
    onOpenProblem,
    onSaveSettings,
    onResetSettingsToDefaults,
    onResetStudyHistory,
    onSetActiveFocus,
    onToggleMode,
    payload,
    refresh,
    route: getDashboardRoute(view),
    rows,
    setFilters,
    setImportFile,
    setSettingsDraftState,
    status,
    updateSettingsDraft,
    view,
  };
}
