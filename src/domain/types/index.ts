/**
 * Domain types barrel. Phase 7 migrated each domain type into its
 * owning feature; this barrel keeps the legacy import surface working
 * during the transition. New code imports from @features/<x> directly.
 */
export { STORAGE_SCHEMA_VERSION } from "./STORAGE_SCHEMA_VERSION";

export type { AppData } from "./AppData";

// Problems + taxonomy + catalog types migrated to @features/problems.
export type {
  Problem,
  Difficulty,
  SourceSet,
  Topic,
  Company,
  CuratedProblemInput,
  ProblemSnapshot,
} from "@features/problems";

// Study types migrated to @features/study.
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

// Settings cross-feature re-exports.
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

// Tracks + sub-types migrated to @features/tracks.
export type {
  Track,
  TrackGroup,
  TrackGroupProblem,
  TrackWithGroups,
  TrackGroupWithProblems,
  TrackProgress,
} from "@features/tracks";

export type {
  ProblemSlug,
  TopicId,
  CompanyId,
  TrackId,
  TrackGroupId,
} from "@shared/ids";

export type { ActiveFocus } from "@features/tracks";
