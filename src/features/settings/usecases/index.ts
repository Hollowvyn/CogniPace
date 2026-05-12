/** Curated usecases — each function expresses one semantic action and
 * encapsulates the patch shape the SW expects. UI surfaces call these
 * via `useDI().settingsClient` and never assemble a UserSettings
 * payload directly. */
export { setActiveTrack } from "./setActiveTrack";
export { setDailyTarget } from "./setDailyTarget";
export { setStudyMode } from "./setStudyMode";
