/** UI-facing read models assembled by domain and background use cases. */
import type {
  AnalyticsSummary,
  Difficulty,
  Problem,
  StudyMode,
  StudyPhase,
  StudyState,
  TodayQueue,
  UserSettings,
} from "./types";

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
  studyStateSummary: import("./types").StudyStateSummary | null;
  courses: LibraryCourseReference[];
}

// ---------- v7 hydrated views ----------
//
// View consumers (popup / dashboard / overlay) get the entity surface
// pre-hydrated: Topic and Company names are resolved server-side and
// `editedFields` is flattened from `Problem.userEdits` so components
// don't need access to the canonical registry maps.

export interface TopicLabel {
  id: string;
  name: string;
}

export interface CompanyLabel {
  id: string;
  name: string;
}

/**
 * UI-friendly view of a Problem. Identical to the entity except topic
 * and company FKs are pre-joined to display labels and `editedFields`
 * is a flat list (the underlying flag map is awkward to iterate).
 */
export interface ProblemView {
  slug: string;
  title: string;
  difficulty: import("./types").Difficulty;
  isPremium: boolean;
  url: string;
  leetcodeId?: string;
  topics: TopicLabel[];
  companies: CompanyLabel[];
  editedFields: import("./problems/model").EditableProblemField[];
}

/** Discriminated UI shape for a StudySet. Each case carries the data the
 * matching component renderer needs without forcing it to match across
 * variants. */
export type StudySetView =
  | {
      kind: "flat";
      id: string;
      name: string;
      description?: string;
      enabled: boolean;
      problems: ProblemView[];
    }
  | {
      kind: "grouped";
      id: string;
      name: string;
      description?: string;
      enabled: boolean;
      groups: Array<{
        id: string;
        name: string;
        prerequisiteGroupIds: string[];
        unlocked: boolean;
        problems: ProblemView[];
      }>;
    }
  | {
      kind: "derived";
      id: string;
      name: string;
      description?: string;
      enabled: boolean;
      filterDescription: string;
      problems: ProblemView[];
    };

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

export interface PopupShellPayload {
  settings: UserSettings;
  popup: PopupViewData;
  activeCourse: ActiveCourseView | null;
}

export interface AppShellPayload extends PopupShellPayload {
  queue: TodayQueue;
  analytics: AnalyticsSummary;
  recommendedCandidates: RecommendedProblemView[];
  courses: CourseCardView[];
  library: LibraryProblemRow[];
  courseOptions: CourseOption[];
}

export interface SaveReviewResultResponse {
  studyState: StudyState;
  nextReviewAt?: string;
  phase: StudyPhase;
  lastRating?: import("./types").Rating;
}

export interface ProblemContextResponse {
  problem: Problem | null;
  studyState: StudyState | null;
}

export interface ProblemMutationResponse {
  problem: Problem;
  studyState: StudyState;
}

export interface CourseMutationResponse extends ProblemMutationResponse {
  course: ActiveCourseView | null;
}

export interface CourseActivationResponse {
  activeCourseId: string;
  activeCourse: ActiveCourseView | null;
}

export interface CourseChapterActivationResponse {
  activeCourse: ActiveCourseView | null;
}

export interface CourseLaunchTrackingResponse {
  tracked: true;
  activeCourse: ActiveCourseView | null;
}

export interface ImportSummaryResponse {
  setName: string;
  count: number;
  added: number;
  updated: number;
}

export interface SettingsUpdateResponse {
  settings: UserSettings;
}

export interface OpenedResponse {
  opened: true;
}

export interface ImportedResponse {
  imported: true;
}

export interface StudyStateMutationResponse {
  studyState: StudyState;
}

export interface StudyHistoryResetResponse {
  reset: true;
}

export interface PopupModeLabel {
  currentMode: StudyMode;
}
