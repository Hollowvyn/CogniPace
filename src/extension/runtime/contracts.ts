/** Runtime message contracts shared by the extension UI and background router. */
import type { UserSettingsPatch } from "../../domain/settings";
import type {
  CuratedProblemInput,
  Difficulty,
  ExportPayload,
  Rating,
  ReviewLogFields,
  ReviewMode,
  TodayQueue,
} from "../../domain/types";
import type { ActiveFocus } from "../../domain/active-focus/model";
import type {
  CompanyFilter,
  CustomFilter,
  DifficultyFilter,
  TopicFilter,
} from "../../domain/sets/model";
import type {
  AppShellPayload,
  CourseActivationResponse,
  CourseChapterActivationResponse,
  CourseLaunchTrackingResponse,
  CourseMutationResponse,
  ImportedResponse,
  ImportSummaryResponse,
  OpenedResponse,
  PopupShellPayload,
  ProblemContextResponse,
  ProblemMutationResponse,
  SaveReviewResultResponse,
  SettingsUpdateResponse,
  StudyHistoryResetResponse,
  StudyStateMutationResponse,
} from "../../domain/views";

export interface MessageRequestMap {
  UPSERT_PROBLEM_FROM_PAGE: {
    slug: string;
    title?: string;
    difficulty?: Difficulty;
    isPremium?: boolean;
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
    interviewPattern?: ReviewLogFields["interviewPattern"];
    timeComplexity?: ReviewLogFields["timeComplexity"];
    spaceComplexity?: ReviewLogFields["spaceComplexity"];
    languages?: ReviewLogFields["languages"];
    notes?: ReviewLogFields["notes"];
    courseId?: string;
    chapterId?: string;
    source?: "overlay" | "dashboard";
  };
  SAVE_OVERLAY_LOG_DRAFT: {
    slug: string;
    interviewPattern?: ReviewLogFields["interviewPattern"];
    timeComplexity?: ReviewLogFields["timeComplexity"];
    spaceComplexity?: ReviewLogFields["spaceComplexity"];
    languages?: ReviewLogFields["languages"];
    notes?: ReviewLogFields["notes"];
  };
  OVERRIDE_LAST_REVIEW_RESULT: {
    slug: string;
    rating: Rating;
    solveTimeMs?: number;
    mode?: ReviewMode;
    interviewPattern?: ReviewLogFields["interviewPattern"];
    timeComplexity?: ReviewLogFields["timeComplexity"];
    spaceComplexity?: ReviewLogFields["spaceComplexity"];
    languages?: ReviewLogFields["languages"];
    notes?: ReviewLogFields["notes"];
    courseId?: string;
    chapterId?: string;
    source?: "overlay" | "dashboard";
  };
  OPEN_EXTENSION_PAGE: {
    path: string;
  };
  OPEN_PROBLEM_PAGE: {
    slug: string;
    courseId?: string;
    chapterId?: string;
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
  GET_POPUP_SHELL_DATA: Record<string, never>;
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
  RESET_STUDY_HISTORY: Record<string, never>;
  UPDATE_SETTINGS: UserSettingsPatch;
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
  // v7 — additive surface for the Question-as-SSoT refactor.
  EDIT_PROBLEM: {
    slug: string;
    patch: {
      title?: string;
      difficulty?: Difficulty;
      url?: string;
      isPremium?: boolean;
      leetcodeId?: string;
      topicIds?: string[];
      companyIds?: string[];
    };
    markUserEdit?: boolean;
  };
  CREATE_CUSTOM_TOPIC: {
    name: string;
    description?: string;
  };
  CREATE_CUSTOM_COMPANY: {
    name: string;
    description?: string;
  };
  ASSIGN_TOPIC_TO_PROBLEM: {
    slug: string;
    topicId: string;
    /** When false, removes the assignment instead. */
    assigned?: boolean;
  };
  ASSIGN_COMPANY_TO_PROBLEM: {
    slug: string;
    companyId: string;
    assigned?: boolean;
  };
  CREATE_STUDY_SET:
    | {
        kind: "custom";
        name: string;
        description?: string;
        filter?: CustomFilter;
        problemSlugs?: string[];
      }
    | {
        kind: "company";
        name: string;
        description?: string;
        filter: CompanyFilter;
      }
    | {
        kind: "topic";
        name: string;
        description?: string;
        filter: TopicFilter;
      }
    | {
        kind: "difficulty";
        name: string;
        description?: string;
        filter: DifficultyFilter;
      };
  UPDATE_STUDY_SET: {
    id: string;
    name?: string;
    description?: string;
    enabled?: boolean;
  };
  DELETE_STUDY_SET: {
    id: string;
  };
  SET_ACTIVE_FOCUS: {
    focus: ActiveFocus;
  };
  CONSUME_PRE_V7_BACKUP: Record<string, never>;
}

export type MessageType = keyof MessageRequestMap;

export interface RuntimeMessage<T extends MessageType = MessageType> {
  type: T;
  payload: MessageRequestMap[T];
}

export interface MessageResponseMap {
  UPSERT_PROBLEM_FROM_PAGE: ProblemMutationResponse;
  GET_PROBLEM_CONTEXT: ProblemContextResponse;
  RATE_PROBLEM: SaveReviewResultResponse;
  SAVE_REVIEW_RESULT: SaveReviewResultResponse;
  SAVE_OVERLAY_LOG_DRAFT: StudyStateMutationResponse;
  OVERRIDE_LAST_REVIEW_RESULT: SaveReviewResultResponse;
  OPEN_EXTENSION_PAGE: OpenedResponse;
  OPEN_PROBLEM_PAGE: OpenedResponse;
  UPDATE_NOTES: StudyStateMutationResponse;
  UPDATE_TAGS: StudyStateMutationResponse;
  GET_TODAY_QUEUE: TodayQueue;
  GET_DASHBOARD_DATA: AppShellPayload;
  GET_APP_SHELL_DATA: AppShellPayload;
  GET_POPUP_SHELL_DATA: PopupShellPayload;
  SWITCH_ACTIVE_COURSE: CourseActivationResponse;
  SET_ACTIVE_COURSE_CHAPTER: CourseChapterActivationResponse;
  TRACK_COURSE_QUESTION_LAUNCH: CourseLaunchTrackingResponse;
  IMPORT_CURATED_SET: ImportSummaryResponse;
  IMPORT_CUSTOM_SET: ImportSummaryResponse;
  EXPORT_DATA: ExportPayload;
  IMPORT_DATA: ImportedResponse;
  RESET_STUDY_HISTORY: StudyHistoryResetResponse;
  UPDATE_SETTINGS: SettingsUpdateResponse;
  ADD_PROBLEM_BY_INPUT: ProblemMutationResponse & { slug: string };
  ADD_PROBLEM_TO_COURSE: CourseMutationResponse;
  SUSPEND_PROBLEM: StudyStateMutationResponse;
  RESET_PROBLEM_SCHEDULE: StudyStateMutationResponse;
  EDIT_PROBLEM: ProblemMutationResponse;
  CREATE_CUSTOM_TOPIC: { ok: true; id: string };
  CREATE_CUSTOM_COMPANY: { ok: true; id: string };
  ASSIGN_TOPIC_TO_PROBLEM: ProblemMutationResponse;
  ASSIGN_COMPANY_TO_PROBLEM: ProblemMutationResponse;
  CREATE_STUDY_SET: { ok: true; id: string };
  UPDATE_STUDY_SET: { ok: true };
  DELETE_STUDY_SET: { ok: true };
  SET_ACTIVE_FOCUS: SettingsUpdateResponse;
  CONSUME_PRE_V7_BACKUP: { backup: unknown | null };
}
