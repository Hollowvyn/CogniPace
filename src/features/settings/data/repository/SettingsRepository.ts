/**
 * UI-side Settings Repository — the abstraction the screen calls.
 *
 * Layering (Android-style; plan §"MVI invariant"):
 *
 *   View
 *     → Hook (ViewModel — useDI().settingsRepository)
 *       → Repository  (this file: interface + class)
 *         → MessagingClient (settingsClient — typed sendMessage)
 *           → SW boundary
 *             → Handler (updateSettings)
 *               → DataSource (SettingsDataSource — Drizzle I/O)
 *                 → SQLite
 *
 * For a feature this size, single-aggregate actions ("set the active
 * track", "save the editor draft", "reset to defaults") live as
 * methods on the Repository — there's no Usecase layer because no
 * action composes across multiple repositories. When a future feature
 * needs cross-repo composition, *that* feature earns back a
 * `domain/usecases/` folder. Settings does not.
 *
 * The Repository is also the seam for the Phase 9 data-flow library
 * decision: swapping in a cached / optimistic / TanStack-backed
 * implementation means writing a new class that implements
 * `SettingsRepository`, no consumer changes.
 */

import {
  cloneUserSettings,
  createInitialUserSettings,
  sanitizeStoredUserSettings,
  type StudyMode,
  type UserSettings,
  type UserSettingsPatch,
} from "../../domain/model";
import {
  settingsClient,
  type SettingsClient,
} from "../../messaging/client";

import type { ActiveFocus } from "../../../../domain/active-focus/model";
import type { TrackGroupId, TrackId } from "@shared/ids";

/** The contract every consumer codes against. Tests and alternate
 *  implementations (cached, optimistic, in-memory) implement this. */
export interface SettingsRepository {
  /** Apply a (possibly partial) settings patch. Returns the round-
   *  tripped settings as persisted (charter lesson #6). */
  update(patch: UserSettingsPatch): Promise<UserSettings>;

  /** Set the active Track (and optional group), or clear focus by
   *  passing `null`. */
  setActiveTrack(
    args: { id: TrackId; groupId?: TrackGroupId } | null,
  ): Promise<UserSettings>;

  /** Set the daily-question goal. Throws on non-positive inputs so
   *  callers can rely on a finite, positive integer being persisted. */
  setDailyTarget(count: number): Promise<UserSettings>;

  /** Toggle the "skip premium-locked problems" filter. */
  setSkipPremium(skipPremium: boolean): Promise<UserSettings>;

  /** Switch between the two study modes. */
  setStudyMode(mode: StudyMode): Promise<UserSettings>;

  /** Sanitize a full draft from the settings editor, then persist. */
  saveDraft(draft: UserSettings): Promise<UserSettings>;

  /** Replace the persisted settings with the canonical defaults. */
  resetToDefaults(): Promise<UserSettings>;
}

/** Default implementation over the runtime messaging client. The
 *  client is constructor-injected so tests / Phase 9 implementations
 *  can swap the transport without touching this class. */
export class DefaultSettingsRepository implements SettingsRepository {
  constructor(private readonly client: SettingsClient) {}

  update(patch: UserSettingsPatch): Promise<UserSettings> {
    return this.client.update(patch);
  }

  setActiveTrack(
    args: { id: TrackId; groupId?: TrackGroupId } | null,
  ): Promise<UserSettings> {
    const activeFocus: ActiveFocus =
      args === null
        ? null
        : { kind: "track", id: args.id, groupId: args.groupId };
    return this.update({ activeFocus });
  }

  setDailyTarget(count: number): Promise<UserSettings> {
    if (!Number.isFinite(count) || count < 1) {
      throw new Error(
        `setDailyTarget: count must be a positive integer (got ${String(count)})`,
      );
    }
    return this.update({ dailyQuestionGoal: Math.floor(count) });
  }

  setSkipPremium(skipPremium: boolean): Promise<UserSettings> {
    return this.update({ questionFilters: { skipPremium } });
  }

  setStudyMode(mode: StudyMode): Promise<UserSettings> {
    return this.update({ studyMode: mode });
  }

  saveDraft(draft: UserSettings): Promise<UserSettings> {
    const sanitized = sanitizeStoredUserSettings(cloneUserSettings(draft));
    return this.update(sanitized);
  }

  resetToDefaults(): Promise<UserSettings> {
    return this.update(createInitialUserSettings());
  }
}

/** Default singleton over the production client. Non-React callers
 *  (SW boot, scripts) use this directly; React code goes through
 *  `useDI().settingsRepository` so tests can inject a fake. */
export const settingsRepository: SettingsRepository =
  new DefaultSettingsRepository(settingsClient);
