/**
 * Legacy RPC senders.
 *
 * `updateSettings` was removed in Phase 6 — every caller now goes
 * through `@features/settings` (the Repository + curated usecases).
 * `resetStudyHistory` stays here until the Study feature migrates
 * in Phase 7, at which point it moves into
 * `features/study/messaging/client.ts`.
 */
import { sendMessage } from "@libs/runtime-rpc/client";

/** Clears all local study history while preserving settings, tracks,
 *  and the problem library. Moves to features/study in Phase 7. */
export async function resetStudyHistory() {
  return sendMessage("RESET_STUDY_HISTORY", {});
}
