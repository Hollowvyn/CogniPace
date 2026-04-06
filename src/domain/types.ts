export const STORAGE_SCHEMA_VERSION = 3;

export type Difficulty = "Easy" | "Medium" | "Hard" | "Unknown";

export type StudyPhase =
  | "New"
  | "Learning"
  | "Review"
  | "Relearning"
  | "Suspended";

export type ReviewOrder = "dueFirst" | "mixByDifficulty" | "weakestFirst";

export type StudyMode = "freestyle" | "studyPlan";

export type Rating = 0 | 1 | 2 | 3;

export type ReviewMode = "RECALL" | "FULL_SOLVE";

export type SourceSet =
  | "Blind75"
  | "LeetCode150"
  | "LeetCode75"
  | "ByteByteGo101"
  | "NeetCode150"
  | "NeetCode250"
  | "Grind75"
  | "Custom";

export interface Problem {
  id: string;
  leetcodeSlug: string;
  leetcodeId?: string;
  title: string;
  difficulty: Difficulty;
  url: string;
  topics: string[];
  sourceSet: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AttemptHistoryEntry {
  reviewedAt: string;
  rating: Rating;
  solveTimeMs?: number;
  mode: ReviewMode;
  notesSnapshot?: string;
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

export interface StudyState {
  suspended: boolean;
  bestTimeMs?: number;
  lastSolveTimeMs?: number;
  lastRating?: Rating;
  confidence?: number;
  notes?: string;
  tags: string[];
  attemptHistory: AttemptHistoryEntry[];
  fsrsCard?: FsrsCardSnapshot;
}

export interface QuietHours {
  startHour: number;
  endHour: number;
}

export interface UserSettings {
  dailyNewLimit: number;
  dailyReviewLimit: number;
  reviewOrder: ReviewOrder;
  studyMode: StudyMode;
  activeCourseId: string;
  setsEnabled: Record<string, boolean>;
  requireSolveTime: boolean;
  autoDetectSolved: boolean;
  notifications: boolean;
  quietHours: QuietHours;
  /** Target retention rate (0-1). Cards become due when retrievability drops below this. Default 0.85 */
  targetRetention: number;
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

export interface AppData {
  schemaVersion: number;
  problemsBySlug: Record<string, Problem>;
  studyStatesBySlug: Record<string, StudyState>;
  coursesById: Record<string, CourseDefinition>;
  courseOrder: string[];
  courseProgressById: Record<string, CourseProgress>;
  settings: UserSettings;
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
  tags?: string[];
}

export interface ExportPayload {
  version?: number;
  problems: Problem[];
  studyStatesBySlug: Record<string, StudyState>;
  settings?: Partial<UserSettings> & {
    activeStudyPlanId?: string;
  };
  coursesById?: Record<string, CourseDefinition>;
  courseOrder?: string[];
  courseProgressById?: Record<string, CourseProgress>;
}

export interface ProblemSnapshot {
  problem: Problem;
  studyState: StudyState;
}
