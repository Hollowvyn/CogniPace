export type Difficulty = "Easy" | "Medium" | "Hard" | "Unknown";

export type StudyStatus =
  | "NEW"
  | "LEARNING"
  | "REVIEWING"
  | "MASTERED"
  | "SUSPENDED";

export type ScheduleIntensity = "chill" | "normal" | "aggressive";

export type ReviewOrder = "dueFirst" | "mixByDifficulty" | "weakestFirst";

export type Rating = 0 | 1 | 2 | 3;

export type ReviewMode = "RECALL" | "FULL_SOLVE";

export type SourceSet =
  | "Blind75"
  | "NeetCode150"
  | "Grind75"
  | "LeetCode75"
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

export interface StudyState {
  status: StudyStatus;
  lastReviewedAt?: string;
  nextReviewAt?: string;
  reviewCount: number;
  lapses: number;
  ease: number;
  intervalDays: number;
  bestTimeMs?: number;
  lastSolveTimeMs?: number;
  lastRating?: Rating;
  confidence?: number;
  notes?: string;
  tags: string[];
  attemptHistory: AttemptHistoryEntry[];
}

export interface QuietHours {
  startHour: number;
  endHour: number;
}

export interface UserSettings {
  dailyNewLimit: number;
  dailyReviewLimit: number;
  reviewOrder: ReviewOrder;
  setsEnabled: Record<string, boolean>;
  scheduleIntensity: ScheduleIntensity;
  requireSolveTime: boolean;
  autoDetectSolved: boolean;
  notifications: boolean;
  quietHours: QuietHours;
  slowSolveDowngradeEnabled: boolean;
  slowSolveThresholdMs: number;
}

export interface AppData {
  problemsBySlug: Record<string, Problem>;
  studyStatesBySlug: Record<string, StudyState>;
  settings: UserSettings;
}

export interface QueueItem {
  slug: string;
  problem: Problem;
  studyState: StudyState;
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
  masteredCount: number;
  retentionProxy: number;
  weakestProblems: Array<{
    slug: string;
    title: string;
    lapses: number;
    ease: number;
  }>;
  dueByDay: Array<{
    date: string;
    count: number;
  }>;
}

export interface CuratedProblemInput {
  slug: string;
  title?: string;
  difficulty?: Difficulty;
  tags?: string[];
}

export interface ExportPayload {
  problems: Problem[];
  studyStatesBySlug: Record<string, StudyState>;
  settings: UserSettings;
}

export interface ProblemSnapshot {
  problem: Problem;
  studyState: StudyState;
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
  QUEUE_AUTO_TIMER_START: {
    slug: string;
  };
  CONSUME_AUTO_TIMER_START: {
    slug: string;
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
  UPDATE_SETTINGS: Partial<UserSettings>;
  ADD_PROBLEM_BY_INPUT: {
    input: string;
    sourceSet?: string;
    topics?: string[];
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
