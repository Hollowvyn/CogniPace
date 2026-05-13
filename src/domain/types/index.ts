/**
 * Domain types barrel. One model per file under this folder; the
 * grab-bag `src/domain/types.ts` was split in Phase 5. Cross-feature
 * re-exports (settings, IDs, topics, companies, tracks, active-focus)
 * live here for back-compat — Phase 6+ migrates each to its owning
 * feature folder and tightens these re-exports incrementally.
 */
export { STORAGE_SCHEMA_VERSION } from "./STORAGE_SCHEMA_VERSION";

export type { Difficulty } from "./Difficulty";
export type { StudyPhase } from "./StudyPhase";
export type { Rating } from "./Rating";
export type { ReviewMode } from "./ReviewMode";
export type { ReviewLogFields } from "./ReviewLogFields";
export type { SourceSet } from "./SourceSet";
export type { FsrsCardState } from "./FsrsCardState";
export type { FsrsCardSnapshot } from "./FsrsCardSnapshot";

export type { Problem } from "./Problem";
export type { AttemptHistoryEntry } from "./AttemptHistoryEntry";
export type { StudyState } from "./StudyState";
export type { StudyStateSummary } from "./StudyStateSummary";

export type { AppData } from "./AppData";
export type { QueueItem } from "./QueueItem";
export type { TodayQueue } from "./TodayQueue";
export type { AnalyticsSummary } from "./AnalyticsSummary";
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
