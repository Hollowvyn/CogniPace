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
  /** Round-trip is persisted-then-readback (charter lesson #6) — the
   *  returned snapshot is the next read, not the caller's argument. */
  update(patch: UserSettingsPatch): Promise<UserSettings>;
  setSkipPremium(skipPremium: boolean): Promise<UserSettings>;
  setStudyMode(mode: StudyMode): Promise<UserSettings>;
  saveDraft(draft: UserSettings): Promise<UserSettings>;
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

/** Production singleton. React code goes through `useDI().settingsRepository`
 *  so tests can inject a fake; non-React callers (SW boot, scripts) use this. */
export const settingsRepository: SettingsRepository =
  new DefaultSettingsRepository(settingsClient);
