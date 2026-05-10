/**
 * UI-side action repository for the v7 message surface. Each function is
 * a thin sendMessage wrapper — UI components import these rather than
 * constructing payload objects inline.
 */
import type { ActiveFocus } from "../../domain/active-focus/model";
import type {
  CompanyFilter,
  CustomFilter,
  DifficultyFilter,
  TopicFilter,
} from "../../domain/sets/model";
import type { Difficulty } from "../../domain/types";
import { sendMessage } from "../../extension/runtime/client";

export interface EditProblemPatch {
  title?: string;
  difficulty?: Difficulty;
  url?: string;
  isPremium?: boolean;
  leetcodeId?: string;
  topicIds?: string[];
  companyIds?: string[];
}

/**
 * Apply a user-driven edit to a Problem. Touched fields are flagged in
 * `userEdits` so re-imports preserve them. Pass `markUserEdit: false`
 * for system-driven edits that should not stick across imports.
 */
export async function editProblem(input: {
  slug: string;
  patch: EditProblemPatch;
  markUserEdit?: boolean;
}) {
  return sendMessage("EDIT_PROBLEM", input);
}

/** Create (or upsert) a custom Topic; returns its canonical id. */
export async function createCustomTopic(input: {
  name: string;
  description?: string;
}) {
  return sendMessage("CREATE_CUSTOM_TOPIC", input);
}

/** Create (or upsert) a custom Company; returns its canonical id. */
export async function createCustomCompany(input: {
  name: string;
  description?: string;
}) {
  return sendMessage("CREATE_CUSTOM_COMPANY", input);
}

/** Toggle a Topic assignment on a Problem. */
export async function assignTopicToProblem(input: {
  slug: string;
  topicId: string;
  /** Default true. Pass false to remove the assignment. */
  assigned?: boolean;
}) {
  return sendMessage("ASSIGN_TOPIC_TO_PROBLEM", input);
}

/** Toggle a Company assignment on a Problem. */
export async function assignCompanyToProblem(input: {
  slug: string;
  companyId: string;
  assigned?: boolean;
}) {
  return sendMessage("ASSIGN_COMPANY_TO_PROBLEM", input);
}

/** Create a custom StudySet (flat, with explicit slugs or a filter). */
export async function createCustomStudySet(input: {
  name: string;
  description?: string;
  filter?: CustomFilter;
  problemSlugs?: string[];
}) {
  return sendMessage("CREATE_STUDY_SET", { kind: "custom", ...input });
}

/** Create a derived company-filtered StudySet. */
export async function createCompanyStudySet(input: {
  name: string;
  description?: string;
  filter: CompanyFilter;
}) {
  return sendMessage("CREATE_STUDY_SET", { kind: "company", ...input });
}

/** Create a derived topic-filtered StudySet. */
export async function createTopicStudySet(input: {
  name: string;
  description?: string;
  filter: TopicFilter;
}) {
  return sendMessage("CREATE_STUDY_SET", { kind: "topic", ...input });
}

/** Create a derived difficulty-filtered StudySet. */
export async function createDifficultyStudySet(input: {
  name: string;
  description?: string;
  filter: DifficultyFilter;
}) {
  return sendMessage("CREATE_STUDY_SET", { kind: "difficulty", ...input });
}

/** Update a StudySet's metadata. */
export async function updateStudySet(input: {
  id: string;
  name?: string;
  description?: string;
  enabled?: boolean;
}) {
  return sendMessage("UPDATE_STUDY_SET", input);
}

/** Delete a non-curated StudySet. */
export async function deleteStudySet(id: string) {
  return sendMessage("DELETE_STUDY_SET", { id });
}

/** Set (or clear) the user's currently active focus. */
export async function setActiveFocus(focus: ActiveFocus) {
  return sendMessage("SET_ACTIVE_FOCUS", { focus });
}

/**
 * Read the v6 sidecar backup written during migration. The message
 * clears the storage key on the way out so callers should download the
 * blob immediately.
 */
export async function consumePreV7Backup() {
  return sendMessage("CONSUME_PRE_V7_BACKUP", {});
}

/**
 * Toggle the suspended state on a problem's StudyState. Used by the
 * expanded row's Suspend / Resume button.
 */
export async function suspendProblem(input: { slug: string; suspend: boolean }) {
  return sendMessage("SUSPEND_PROBLEM", input);
}

/**
 * Reset a problem's FSRS schedule. Used by the expanded row's
 * "Reset schedule" button.
 */
export async function resetProblemSchedule(input: {
  slug: string;
  keepNotes?: boolean;
}) {
  return sendMessage("RESET_PROBLEM_SCHEDULE", input);
}
