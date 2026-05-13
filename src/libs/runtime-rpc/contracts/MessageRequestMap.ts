/** Runtime-message payload contract — UI side sends, SW side receives. */
import type {
  CuratedProblemInput,
  Difficulty,
  Rating,
  ReviewLogFields,
  ReviewMode,
} from "../../../domain/types";
import type { ExportPayload } from "@features/backup/server";
import type { UserSettingsPatch } from "@features/settings/server";
import type { ActiveFocus } from "@features/tracks";

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
  CREATE_TRACK: {
    name: string;
    description?: string;
  };
  UPDATE_TRACK: {
    id: string;
    name?: string;
    description?: string;
    enabled?: boolean;
  };
  DELETE_TRACK: {
    id: string;
  };
  SET_ACTIVE_FOCUS: {
    focus: ActiveFocus;
  };
  CONSUME_PRE_V7_BACKUP: Record<string, never>;
}
