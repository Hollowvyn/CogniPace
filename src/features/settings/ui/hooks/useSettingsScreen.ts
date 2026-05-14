import { useDI } from "@app/di";
import { useCallback, useMemo, useState } from "react";

import {
  areUserSettingsEqual,
  cloneUserSettings,
  createInitialUserSettings,
  type UserSettings,
} from "../../domain/model";

export type SettingsIntentResult =
  | { readonly ok: true; readonly settings: UserSettings }
  | { readonly ok: false; readonly error: string };

export interface SettingsScreenModel {
  readonly draftSettings: UserSettings | null;
  readonly hasChanges: boolean;
  readonly isDefaultDraft: boolean;
  readonly updateDraft: (
    updater: (current: UserSettings) => UserSettings,
  ) => void;
  readonly saveDraft: () => Promise<SettingsIntentResult>;
  readonly discardDraft: () => void;
  readonly resetToDefaults: () => Promise<SettingsIntentResult>;
}

export interface UseSettingsScreenArgs {
  readonly currentSettings: UserSettings | null;
}

export function useSettingsScreen(
  args: UseSettingsScreenArgs,
): SettingsScreenModel {
  const { currentSettings } = args;
  const { settingsRepository } = useDI();
  const [draftState, setDraftState] = useState<UserSettings | null>(null);

  // Project on read so the View always sees a consistent snapshot
  // regardless of which input (parent prop vs. local draft) is fresher.
  const draftSettings = useMemo(() => {
    const source = draftState ?? currentSettings;
    return source ? cloneUserSettings(source) : null;
  }, [currentSettings, draftState]);

  const hasChanges =
    currentSettings && draftSettings
      ? !areUserSettingsEqual(draftSettings, currentSettings)
      : false;

  const isDefaultDraft = draftSettings
    ? areUserSettingsEqual(draftSettings, createInitialUserSettings())
    : true;

  const updateDraft = useCallback(
    (updater: (current: UserSettings) => UserSettings) => {
      setDraftState((current) =>
        updater(
          cloneUserSettings(
            current ?? currentSettings ?? createInitialUserSettings(),
          ),
        ),
      );
    },
    [currentSettings],
  );

  const saveDraft = useCallback(async (): Promise<SettingsIntentResult> => {
    if (!hasChanges || !draftSettings) {
      return {
        ok: true,
        settings: currentSettings ?? createInitialUserSettings(),
      };
    }
    try {
      const saved = await settingsRepository.saveDraft(draftSettings);
      setDraftState(null);
      return { ok: true, settings: saved };
    } catch (err) {
      return {
        ok: false,
        error: (err as Error).message || "Failed to save settings.",
      };
    }
  }, [currentSettings, draftSettings, hasChanges, settingsRepository]);

  const discardDraft = useCallback(() => {
    setDraftState(null);
  }, []);

  const resetToDefaults =
    useCallback(async (): Promise<SettingsIntentResult> => {
      try {
        const saved = await settingsRepository.resetToDefaults();
        setDraftState(null);
        return { ok: true, settings: saved };
      } catch (err) {
        return {
          ok: false,
          error: (err as Error).message || "Failed to reset settings.",
        };
      }
    }, [settingsRepository]);

  return {
    draftSettings,
    hasChanges,
    isDefaultDraft,
    updateDraft,
    saveDraft,
    discardDraft,
    resetToDefaults,
  };
}
