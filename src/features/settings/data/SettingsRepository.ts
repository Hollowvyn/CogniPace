/**
 * UI-side Settings repository — the abstraction usecases call.
 *
 * Layering (Android-style; plan §"MVI invariant"):
 *
 *   Hook → Usecase → Repository → MessagingClient → SW boundary
 *                                                       │
 *                                                       ▼
 *                                           Handler → DataSource → DB
 *
 * The Repository is what hides the *transport* from the usecase. Today
 * the only implementation is a passthrough over `settingsClient` —
 * future work (the Phase 9 data-flow library decision) slots in here
 * without touching usecases or hooks:
 *
 *   - in-memory cache between renders
 *   - optimistic updates + reconciliation on tick
 *   - retry / coalescing across rapid edits
 *   - swap to TanStack Query or a per-feature Zustand store
 *
 * The SW-side data access lives in `SettingsDataSource.ts` next to
 * this file; the boundary lint keeps the two sides separate via the
 * `index.ts` (UI) vs `server.ts` (SW) barrels.
 */
import {
  settingsClient,
  type SettingsClient,
} from "../messaging/client";

import type { UserSettings, UserSettingsPatch } from "../domain/UserSettings";

/** The contract usecases code against. Implementations decide
 *  *how* the data moves; usecases only care that it does. */
export interface SettingsRepository {
  /** Apply a (possibly partial) settings patch. Resolves to the
   *  round-tripped settings as persisted (charter lesson #6). */
  update(patch: UserSettingsPatch): Promise<UserSettings>;
}

/** Build a Repository over a given transport client. Exposed for
 *  tests + future composition (e.g. a cached repository that wraps
 *  this one). Production code uses the default `settingsRepository`. */
export function createSettingsRepository(
  client: SettingsClient,
): SettingsRepository {
  return {
    async update(patch) {
      return client.update(patch);
    },
  };
}

/** Default UI-side instance over the runtime messaging client. */
export const settingsRepository: SettingsRepository =
  createSettingsRepository(settingsClient);
