/**
 * Drizzle schema barrel. One file per table; relations live alongside
 * the table they're rooted on. Drizzle uses thunks for FK references
 * (`references: () => other.col`) and for relations, so the cycles
 * between problems ↔ studyStates, tracks ↔ trackGroups, etc. are safe
 * — module-load order does not need to be topological.
 *
 * Drizzle-kit (drizzle.config.ts) reads this barrel to generate the
 * SQL migrations under ./migrations/. Never hand-edit those migrations.
 */
export { topics, topicsRelations } from "./topics";
export { companies } from "./companies";
export { problems, problemsRelations } from "./problems";
export { studyStates, studyStatesRelations } from "./studyStates";
export { attemptHistory, attemptHistoryRelations } from "./attemptHistory";
export { tracks, tracksRelations } from "./tracks";
export { trackGroups, trackGroupsRelations } from "./trackGroups";
export {
  trackGroupProblems,
  trackGroupProblemsRelations,
} from "./trackGroupProblems";
export { settingsKv } from "./settingsKv";
