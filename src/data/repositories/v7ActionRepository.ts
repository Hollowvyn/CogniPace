/**
 * UI-side action repository for the v7 message surface. Each function is
 * a thin sendMessage wrapper — UI components import these rather than
 * constructing payload objects inline.
 */
import { sendMessage } from "@libs/runtime-rpc/client";

import type { Difficulty } from "@features/problems";

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

/** Create a user-defined Track (slim — no kind, no filter). */
export async function createTrack(input: {
  name: string;
  description?: string;
}) {
  return sendMessage("CREATE_TRACK", input);
}

/** Update a Track's metadata. */
export async function updateTrack(input: {
  id: string;
  name?: string;
  description?: string;
  enabled?: boolean;
}) {
  return sendMessage("UPDATE_TRACK", input);
}

/** Delete a non-curated Track. FK CASCADE wipes its groups + memberships. */
export async function deleteTrack(id: string) {
  return sendMessage("DELETE_TRACK", { id });
}

// setActiveFocus moved to settingsRepository.setActiveTrack — there's
// now a single outlet for every settings field through UPDATE_SETTINGS.

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
