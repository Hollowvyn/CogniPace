/**
 * Settings-feature message contracts. Phase 6 owns the UPDATE_SETTINGS
 * wire shape; the shared `@libs/runtime-rpc/contracts` still aggregates
 * every feature's messages into the global MessageRequestMap /
 * MessageResponseMap. Phase 8 inverts that — features register their
 * contracts up into the router.
 *
 * The wire shape itself is unchanged from previous phases: the new
 * curated usecases (`setActiveTrack`, `setDailyTarget`, `setStudyMode`)
 * compose patches client-side and dispatch through UPDATE_SETTINGS, so
 * no new wire messages are needed for this phase.
 */
export type { UserSettingsPatch } from "../domain/model/UserSettings";
export type { SettingsUpdateResponse } from "../../../domain/views/SettingsUpdateResponse";
