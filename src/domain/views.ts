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

export interface PopupModeLabel {
  currentMode: StudyMode;
}
