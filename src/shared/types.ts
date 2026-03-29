export const STORAGE_SCHEMA_VERSION = 3;

export type Difficulty = "Easy" | "Medium" | "Hard" | "Unknown";

export type StudyPhase = "New" | "Learning" | "Review" | "Relearning" | "Suspended";

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

export type RecommendedReason = "Due now" | "Overdue" | "Review focus";

export interface RecommendedProblemView {
  slug: string;
  title: string;
  url: string;
  difficulty: Difficulty;
  reason: RecommendedReason;
  nextReviewAt?: string;
  daysOverdue?: number;
  alsoCourseNext?: boolean;
}

export type CourseQuestionStatusView =
  | "CURRENT"
  | "LOCKED"
  | "QUEUED"
  | "READY"
  | "DUE_NOW";

export interface CourseQuestionView {
  slug: string;
  title: string;
  url: string;
  difficulty: Difficulty;
  chapterId: string;
  chapterTitle: string;
  status: CourseQuestionStatusView;
  reviewPhase?: StudyPhase;
  nextReviewAt?: string;
  inLibrary: boolean;
  isCurrent: boolean;
}

export type CourseChapterStatusView = "COMPLETE" | "CURRENT" | "UPCOMING";

export interface CourseChapterView {
  id: string;
  title: string;
  order: number;
  status: CourseChapterStatusView;
  totalQuestions: number;
  completedQuestions: number;
  questions: CourseQuestionView[];
}

export interface CourseCardView {
  id: string;
  name: string;
  description: string;
  sourceSet: string;
  active: boolean;
  totalQuestions: number;
  completedQuestions: number;
  completionPercent: number;
  dueCount: number;
  totalChapters: number;
  completedChapters: number;
  nextQuestionTitle?: string;
  nextChapterTitle?: string;
}

export interface ActiveCourseView extends CourseCardView {
  activeChapterId: string | null;
  activeChapterTitle: string | null;
  nextQuestion: CourseQuestionView | null;
  chapters: CourseChapterView[];
}

export interface LibraryCourseReference {
  courseId: string;
  courseName: string;
  chapterId: string;
  chapterTitle: string;
}

export interface LibraryProblemRow {
  problem: Problem;
  studyState: StudyState | null;
  studyStateSummary: StudyStateSummary | null;
  courses: LibraryCourseReference[];
}

export interface CourseOption {
  id: string;
  name: string;
  chapterOptions: Array<{
    id: string;
    title: string;
  }>;
}

export interface PopupViewData {
  dueCount: number;
  streakDays: number;
  recommended: RecommendedProblemView | null;
  recommendedCandidates: RecommendedProblemView[];
  courseNext: CourseQuestionView | null;
  activeCourse: CourseCardView | null;
}

export interface AppShellPayload {
  queue: TodayQueue;
  analytics: AnalyticsSummary;
  settings: UserSettings;
  popup: PopupViewData;
  recommendedCandidates: RecommendedProblemView[];
  courses: CourseCardView[];
  activeCourse: ActiveCourseView | null;
  library: LibraryProblemRow[];
  courseOptions: CourseOption[];
}

export interface MessageRequestMap {
  UPSERT_PROBLEM_FROM_PAGE: {
    slug: string;
    title?: string;
    difficulty?: Difficulty;
    url?: string;
    topics?: string[];
    solvedDetected?: boolean;
  };
  GET_PROBLEM_CONTEXT: {
    slug: string;
  };
  RATE_PROBLEM: {
    slug: string;
    rating: Rating;
    solveTimeMs?: number;
    mode?: ReviewMode;
    notesSnapshot?: string;
  };
  SAVE_REVIEW_RESULT: {
    slug: string;
    rating: Rating;
    solveTimeMs?: number;
    mode?: ReviewMode;
    notes?: string;
    courseId?: string;
    chapterId?: string;
    source?: "overlay" | "dashboard";
  };
  OPEN_EXTENSION_PAGE: {
    path: string;
  };
  UPDATE_NOTES: {
    slug: string;
    notes: string;
  };
  UPDATE_TAGS: {
    slug: string;
    tags: string[];
  };
  GET_TODAY_QUEUE: Record<string, never>;
  GET_DASHBOARD_DATA: Record<string, never>;
  GET_APP_SHELL_DATA: Record<string, never>;
  SWITCH_ACTIVE_COURSE: {
    courseId: string;
  };
  SET_ACTIVE_COURSE_CHAPTER: {
    courseId: string;
    chapterId: string;
  };
  TRACK_COURSE_QUESTION_LAUNCH: {
    slug: string;
    courseId?: string;
    chapterId?: string;
  };
  IMPORT_CURATED_SET: {
    setName: string;
  };
  IMPORT_CUSTOM_SET: {
    setName?: string;
    items: CuratedProblemInput[];
  };
  EXPORT_DATA: Record<string, never>;
  IMPORT_DATA: ExportPayload;
  UPDATE_SETTINGS: Partial<UserSettings> & {
    activeStudyPlanId?: string;
  };
  ADD_PROBLEM_BY_INPUT: {
    input: string;
    sourceSet?: string;
    topics?: string[];
    markAsStarted?: boolean;
  };
  ADD_PROBLEM_TO_COURSE: {
    courseId: string;
    chapterId: string;
    input: string;
    markAsStarted?: boolean;
  };
  SUSPEND_PROBLEM: {
    slug: string;
    suspend: boolean;
  };
  RESET_PROBLEM_SCHEDULE: {
    slug: string;
    keepNotes?: boolean;
  };
}

export type MessageType = keyof MessageRequestMap;

export interface RuntimeMessage<T extends MessageType = MessageType> {
  type: T;
  payload: MessageRequestMap[T];
}
