/**
 * Legacy RPC senders.
 *
 * `updateSettings` was removed in Phase 6 — every caller now goes
 * through `@features/settings` (the Repository + curated usecases).
 * `resetStudyHistory` stays here until the Study feature migrates
 * in Phase 7, at which point it moves into
 * `features/study/messaging/client.ts`.
 */
import { api } from "@app/api";

/** Clears all local study history while preserving settings, tracks,
 *  and the problem library. Moves to features/study in Phase 7.
 *  Throws on failure; returns `{ reset: true }` on success. */
export async function resetStudyHistory() {
  return api.resetStudyHistory({});
}
