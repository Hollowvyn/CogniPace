/**
 * `useSettingsScreen` — the settings feature's ViewModel hook.
 *
 * MVI invariant (plan §"MVI invariant"): the screen owns its own
 * state (draft) and intents (update, save, discard, reset). The View
 * is a function of this model. Callers from outside the feature
 * pass `currentSettings` (the persisted snapshot they want the draft
 * to start from) and react to the intent results — they never reach
 * into the draft.
 *
 * Save/reset go through `settingsClient.update(patch)` so the SW
 * receives the same wire shape as before; the bus broadcasts a tick
 * on success and any other surface (popup, overlay) refreshes on
 * its own.
 */
import { useCallback, useMemo, useState } from "react";

import { areUserSettingsEqual } from "../../domain/equality";
import { createInitialUserSettings } from "../../domain/seed";
import { cloneUserSettings } from "../../domain/update";
import { settingsClient } from "../../messaging/client";
import { resetSettings } from "../../usecases/resetSettings";
import { saveSettings } from "../../usecases/saveSettings";

import type { UserSettings } from "../../domain/UserSettings";

/** Discriminated result returned by intent functions. Consumers narrow
 * on `ok` before reading `settings` or `error`. */
export type SettingsIntentResult =
  | { readonly ok: true; readonly settings: UserSettings }
  | { readonly ok: false; readonly error: string };

export interface SettingsScreenModel {
  /** Cloned draft seeded from `currentSettings`; mutations are local
   *  until `saveDraft` succeeds. `null` while the parent is still
   *  hydrating the snapshot. */
  readonly draftSettings: UserSettings | null;
  /** True when the draft diverges from `currentSettings`. */
  readonly hasChanges: boolean;
  /** True when the draft matches the default initial snapshot. */
  readonly isDefaultDraft: boolean;
  /** Apply an updater to the draft. The View calls this from every
   *  section's input handler. */
  readonly updateDraft: (
    updater: (current: UserSettings) => UserSettings,
  ) => void;
  /** Send the current draft to the SW. Throws are caught and returned
   *  as `{ ok: false, error }` so the View can surface a toast. */
  readonly saveDraft: () => Promise<SettingsIntentResult>;
  /** Drop the local draft, snapping back to `currentSettings`. */
  readonly discardDraft: () => void;
  /** Replace the persisted settings with the default snapshot. */
  readonly resetToDefaults: () => Promise<SettingsIntentResult>;
}

export interface UseSettingsScreenArgs {
  /** The currently persisted settings — the source of truth the draft
   *  diverges from. Pass `null` while still loading. */
  readonly currentSettings: UserSettings | null;
}

export function useSettingsScreen(
  args: UseSettingsScreenArgs,
): SettingsScreenModel {
  const { currentSettings } = args;
  const [draftState, setDraftState] = useState<UserSettings | null>(null);

  // Project the draft. Compute on read so the View always sees a
  // consistent snapshot regardless of which input (parent prop vs.
  // local state) is fresher.
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
      return { ok: true, settings: currentSettings ?? createInitialUserSettings() };
    }
    try {
      // Hook → usecase → client → SW → repo. The usecase owns the
      // sanitize step so the View can't ship an unsanitized draft.
      const saved = await saveSettings(settingsClient, draftSettings);
      setDraftState(null);
      return { ok: true, settings: saved };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Failed to save settings.",
      };
    }
  }, [currentSettings, draftSettings, hasChanges]);

  const discardDraft = useCallback(() => {
    setDraftState(null);
  }, []);

  const resetToDefaults =
    useCallback(async (): Promise<SettingsIntentResult> => {
      try {
        // Hook → usecase → client → SW → repo. The usecase owns where
        // the "defaults" come from (the seed file) so the View can't
        // ship a half-correct factory reset.
        const saved = await resetSettings(settingsClient);
        setDraftState(null);
        return { ok: true, settings: saved };
      } catch (err) {
        return {
          ok: false,
          error:
            err instanceof Error ? err.message : "Failed to reset settings.",
        };
      }
    }, []);

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
