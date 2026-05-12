/** Usecases for the settings feature.
 *
 * Two flavors:
 *
 *   - Curated, single-field actions (`setActiveTrack`,
 *     `setDailyTarget`, `setSkipPremium`, `setStudyMode`): one
 *     semantic action per file. Each owns the patch shape so UI
 *     surfaces never assemble a full `UserSettings` for one toggle.
 *
 *   - Bulk operations (`saveSettings`, `resetSettings`): used by the
 *     settings editor screen where the user free-form edits many
 *     fields and commits them in one shot. These own the sanitize /
 *     defaults logic so the View doesn't.
 *
 * UDF chain: View → Hook → Usecase → Repository → Client → SW →
 * DataSource → DB. Each usecase accepts a `SettingsRepository`.
 */
export { setActiveTrack } from "./setActiveTrack";
export { setDailyTarget } from "./setDailyTarget";
export { setSkipPremium } from "./setSkipPremium";
export { setStudyMode } from "./setStudyMode";
export { saveSettings } from "./saveSettings";
export { resetSettings } from "./resetSettings";
