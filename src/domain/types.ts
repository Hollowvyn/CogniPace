/**
 * Shared primitives + AppData root.
 *
 * v7 is mid-cutover: new aggregate fields (`topicsById`, `companiesById`,
 * `studySetsById`, ...) live alongside the v6 ones (`coursesById`,
 * `courseProgressById`, ...). Once handlers migrate to v7 the legacy
 * fields will be removed (Phase 8 of the refactor plan).
 *
 * Aggregate-specific shapes live in their own folders (`problems/`,
 * `topics/`, `companies/`, `sets/`, `study-state/`); this file re-exports
 * them for back-compat with consumers that imported from `domain/types`.
 */
import type { UserSettings } from "./settings/model";

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
} from "./settings/model";

export type {
  ProblemSlug,
  TopicId,
  CompanyId,
  StudySetId,
  SetGroupId,
} from "./common/ids";

export type { Topic } from "./topics/model";
export type { Company } from "./companies/model";
export type {
  StudySet,
  StudySetKind,
  SetGroup,
  StudySetFilter,
  CompanyFilter,
  TopicFilter,
  DifficultyFilter,
  CustomFilter,
  CourseStudySetConfig,
  BaseStudySetConfig,
} from "./sets/model";
export type { StudySetProgress, SetGroupProgress } from "./sets/progress";
export type { ActiveFocus } from "./active-focus/model";

/**
 * Storage schema version. v7 introduces topicsById, companiesById,
 * studySetsById, studySetProgressById; v6 fields stay during the cutover.
 */
export const STORAGE_SCHEMA_VERSION = 7;

export type Difficulty = "Easy" | "Medium" | "Hard" | "Unknown";

export type StudyPhase =
  | "New"
  | "Learning"
  | "Review"
  | "Relearning"
  | "Suspended";

export type Rating = 0 | 1 | 2 | 3;

export type ReviewMode = "RECALL" | "FULL_SOLVE";

export interface ReviewLogFields {
  interviewPattern?: string;
  timeComplexity?: string;
  spaceComplexity?: string;
  languages?: string;
  notes?: string;
}

export type SourceSet =
  | "Blind75"
  | "LeetCode150"
  | "LeetCode75"
  | "ByteByteGo101"
  | "NeetCode150"
  | "NeetCode250"
  | "Grind75"
  | "Custom";

/**
 * v7 Problem — `topicIds`/`companyIds` reference the new entity registries.
 * `id` and `leetcodeSlug` are kept (deprecated) so existing v6 callers
 * keep typechecking; new code uses `slug` only.
 *
 * @see {@link "../problems/model"} for the canonical type definition.
 */
export interface Problem {
  /** @deprecated Use `slug`. Retained equal to `slug` for v6 callers. */
  id: string;
  /** @deprecated Use `slug`. Retained equal to `slug` for v6 callers. */
  leetcodeSlug: string;
  slug: string;
  leetcodeId?: string;
  title: string;
  difficulty: Difficulty;
  isPremium?: boolean;
  url: string;
  /** @deprecated v6 string topics. Use `topicIds`. */
  topics: string[];
  /** v7 — FK references to Topic registry. */
  topicIds: string[];
  /** v7 — FK references to Company registry. */
  companyIds: string[];
  /** @deprecated v6 set-membership string. Use StudySet.groups instead. */
  sourceSet: string[];
  userEdits?: { [key: string]: true | undefined };
  createdAt: string;
  updatedAt: string;
}

export interface AttemptHistoryEntry {
  reviewedAt: string;
  rating: Rating;
  solveTimeMs?: number;
  mode: ReviewMode;
  logSnapshot?: ReviewLogFields;
}

export type FsrsCardState = "New" | "Learning" | "Review" | "Relearning";

export interface FsrsCardSnapshot {
  due: string;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  learningSteps: number;
  reps: number;
  lapses: number;
  state: FsrsCardState;
  lastReview?: string;
}

export interface StudyState extends ReviewLogFields {
  suspended: boolean;
  bestTimeMs?: number;
  lastSolveTimeMs?: number;
  lastRating?: Rating;
  confidence?: number;
  tags: string[];
  attemptHistory: AttemptHistoryEntry[];
  fsrsCard?: FsrsCardSnapshot;
  /** Optional in v6 callers; required in v7-aware code. */
  createdAt?: string;
  /** Optional in v6 callers; required in v7-aware code. */
  updatedAt?: string;
}

export interface CourseQuestionRef {
  slug: string;
  title: string;
  url: string;
  difficulty?: Difficulty;
  chapterId: string;
  chapterTitle: string;
  order: number;
}

export interface CourseChapter {
  id: string;
  title: string;
  order: number;
  questionSlugs: string[];
}

export interface CourseDefinition {
  id: string;
  name: string;
  description: string;
  sourceSet: string;
  chapterIds: string[];
  chaptersById: Record<string, CourseChapter>;
  questionRefsBySlug: Record<string, CourseQuestionRef>;
  createdAt: string;
  updatedAt: string;
}

export interface CourseQuestionProgress {
  slug: string;
  addedToLibraryAt?: string;
  lastOpenedAt?: string;
  lastReviewedAt?: string;
  completedAt?: string;
}

export interface CourseChapterProgress {
  chapterId: string;
  currentQuestionSlug?: string;
  completedAt?: string;
  questionProgressBySlug: Record<string, CourseQuestionProgress>;
}

export interface CourseProgress {
  courseId: string;
  activeChapterId: string;
  startedAt: string;
  lastInteractedAt: string;
  chapterProgressById: Record<string, CourseChapterProgress>;
}

/**
 * v7 AppData — carries both v6 and v7 aggregate fields during the
 * cutover. Once handlers all migrate, the v6 course fields will be
 * removed (refactor plan, Phase 8).
 */
export interface AppData {
  schemaVersion: number;
  /** Problem aggregate (carries v6 + v7 fields per Problem). */
  problemsBySlug: Record<string, Problem>;
  /** StudyState aggregate, sparse — only present after first review. */
  studyStatesBySlug: Record<string, StudyState>;
  /** v7 — Topic registry (curated seed + user customs). */
  topicsById: Record<string, import("./topics/model").Topic>;
  /** v7 — Company registry. */
  companiesById: Record<string, import("./companies/model").Company>;
  /** v7 — StudySet aggregate (courses + flat + derived). */
  studySetsById: Record<string, import("./sets/model").StudySet>;
  /** v7 — User-curated ordering across all StudySets. */
  studySetOrder: string[];
  /** v7 — Per-StudySet progress, lazily created when first focused. */
  studySetProgressById: Record<string, import("./sets/progress").StudySetProgress>;
  /** @deprecated v6 — collapsed into studySetsById in v7. */
  coursesById: Record<string, CourseDefinition>;
  /** @deprecated v6 — replaced by studySetOrder in v7. */
  courseOrder: string[];
  /** @deprecated v6 — replaced by studySetProgressById in v7. */
  courseProgressById: Record<string, CourseProgress>;
  settings: UserSettings;
  /** Set by the v6→v7 migration; surfaces in support diagnostics. */
  lastMigrationAt?: string;
}

export interface QueueItem {
  slug: string;
  problem: Problem;
  studyState: StudyState;
  studyStateSummary: StudyStateSummary;
  due: boolean;
  category: "due" | "new" | "reinforcement";
}

export interface TodayQueue {
  generatedAt: string;
  dueCount: number;
  newCount: number;
  reinforcementCount: number;
  items: QueueItem[];
}

export interface AnalyticsSummary {
  streakDays: number;
  totalReviews: number;
  phaseCounts: Record<StudyPhase, number>;
  retentionProxy: number;
  weakestProblems: Array<{
    slug: string;
    title: string;
    lapses: number;
    difficulty: number;
  }>;
  dueByDay: Array<{
    date: string;
    count: number;
  }>;
}

export interface StudyStateSummary {
  phase: StudyPhase;
  nextReviewAt?: string;
  lastReviewedAt?: string;
  reviewCount: number;
  lapses: number;
  difficulty?: number;
  stability?: number;
  scheduledDays?: number;
  suspended: boolean;
  isStarted: boolean;
  isDue: boolean;
  isOverdue: boolean;
  overdueDays: number;
  /** Current probability of recall (0-1). Decays over time based on stability. */
  retrievability?: number;
}

export interface CuratedProblemInput {
  slug: string;
  title?: string;
  difficulty?: Difficulty;
  isPremium?: boolean;
  tags?: string[];
}

export interface ExportPayload {
  version?: number;
  problems: Problem[];
  studyStatesBySlug: Record<string, StudyState>;
  settings?: Partial<UserSettings>;
  coursesById?: Record<string, CourseDefinition>;
  courseOrder?: string[];
  courseProgressById?: Record<string, CourseProgress>;
  /** v7 — present once import/export migrates to aggregateRegistry. */
  topicsById?: Record<string, import("./topics/model").Topic>;
  companiesById?: Record<string, import("./companies/model").Company>;
  studySetsById?: Record<string, import("./sets/model").StudySet>;
  studySetOrder?: string[];
  studySetProgressById?: Record<string, import("./sets/progress").StudySetProgress>;
}

export interface ProblemSnapshot {
  problem: Problem;
  studyState: StudyState;
}
