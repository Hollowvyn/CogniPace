/**
 * UI-side Settings Repository — the abstraction the screen + hook
 * call. View → useDI().settingsRepository → SettingsClient →
 * UPDATE_SETTINGS → SettingsDataSource → SQLite.
 *
 * The Repository is the swap seam for Phase 9's data-flow library
 * decision. Curated methods exist only when they earn their keep —
 * speculative single-line patch builders stay deleted until a caller
 * materializes.
 */
import {
  cloneUserSettings,
  createInitialUserSettings,
  sanitizeStoredUserSettings,
  type StudyMode,
  type UserSettings,
  type UserSettingsPatch,
} from "../../domain/model";
import { settingsClient, type SettingsClient } from "../../messaging/client";

export interface SettingsRepository {
  /** Apply a (possibly partial) settings patch. Returns the round-
   *  tripped settings as persisted (charter lesson #6). */
  update(patch: UserSettingsPatch): Promise<UserSettings>;
  /** Toggle the "skip premium-locked problems" filter. */
  setSkipPremium(skipPremium: boolean): Promise<UserSettings>;
  /** Switch between the two study modes. */
  setStudyMode(mode: StudyMode): Promise<UserSettings>;
  /** Sanitize a full draft from the settings editor, then persist. */
  saveDraft(draft: UserSettings): Promise<UserSettings>;
  /** Replace the persisted settings with the canonical defaults. */
  resetToDefaults(): Promise<UserSettings>;
}

export class DefaultSettingsRepository implements SettingsRepository {
  constructor(private readonly client: SettingsClient) {}

  update(patch: UserSettingsPatch): Promise<UserSettings> {
    return this.client.update(patch);
  }

  setSkipPremium(skipPremium: boolean): Promise<UserSettings> {
    return this.update({ questionFilters: { skipPremium } });
  }

  setStudyMode(mode: StudyMode): Promise<UserSettings> {
    return this.update({ studyMode: mode });
  }

  saveDraft(draft: UserSettings): Promise<UserSettings> {
    return this.update(sanitizeStoredUserSettings(cloneUserSettings(draft)));
  }

  resetToDefaults(): Promise<UserSettings> {
    return this.update(createInitialUserSettings());
  }
}

/** Production singleton over the runtime client. React code goes
 *  through `useDI().settingsRepository`; non-React callers (SW boot,
 *  scripts) use this directly. */
export const settingsRepository: SettingsRepository =
  new DefaultSettingsRepository(settingsClient);
