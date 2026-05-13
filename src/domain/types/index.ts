/**
 * Domain types barrel. One model per file under this folder; the
 * grab-bag `src/domain/types.ts` was split in Phase 5. Cross-feature
 * re-exports (settings, IDs, topics, companies, tracks, active-focus)
 * live here for back-compat — Phase 6+ migrates each to its owning
 * feature folder and tightens these re-exports incrementally.
 */
export { STORAGE_SCHEMA_VERSION } from "./STORAGE_SCHEMA_VERSION";

export type { Difficulty } from "./Difficulty";
export type { SourceSet } from "./SourceSet";

export type { Problem } from "./Problem";

// Study types migrated to @features/study in Phase 7; re-exported here
// for transitional callers. New code imports from @features/study directly.
export type {
  StudyState,
  StudyStateSummary,
  AttemptHistoryEntry,
  StudyPhase,
  Rating,
  ReviewMode,
  ReviewLogFields,
  FsrsCardState,
  FsrsCardSnapshot,
} from "@features/study";

export type { AppData } from "./AppData";
export type { CuratedProblemInput } from "./CuratedProblemInput";
export type { ProblemSnapshot } from "./ProblemSnapshot";

// Cross-feature re-exports — same surface the grab-bag exposed. Phase
// 6+ will migrate each to its owning feature folder and tighten these.
export type {
  DifficultyGoalSettings,
  ExperimentalSettings,
  MemoryReviewSettings,
  NotificationSettings,
  QuestionFilterSettings,
  ReviewOrder,
  StudyMode,
  TimingSettings,
  UserSettings,
  UserSettingsPatch,
} from "@features/settings";

export type {
  ProblemSlug,
  TopicId,
  CompanyId,
  TrackId,
  TrackGroupId,
} from "@shared/ids";

export type { Topic } from "../topics/model";
export type { Company } from "../companies/model";
export type {
  Track,
  TrackGroup,
  TrackGroupProblem,
  TrackWithGroups,
  TrackGroupWithProblems,
} from "../tracks/model";
export type { TrackProgress } from "../tracks/progress";
export type { ActiveFocus } from "../active-focus/model";
