/** UI-only presentation helpers for study-state and recommendation labels. */
import { getStudyPhaseLabel } from "../../domain/fsrs/studyState";
import {
  CourseQuestionStatusView,
  Difficulty,
  RecommendedReason,
  StudyPhase,
} from "../../shared/types";

export type Tone = "default" | "accent" | "info" | "success" | "danger";

/** Formats an ISO date for display with a screen-specific fallback. */
export function formatDisplayDate(
  iso?: string,
  fallback = "Not scheduled"
): string {
  if (!iso) {
    return fallback;
  }

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  return date.toLocaleDateString();
}

/** Maps difficulty to the shared tone system used by chips and badges. */
export function difficultyTone(difficulty: Difficulty): Tone {
  if (difficulty === "Easy") {
    return "info";
  }
  if (difficulty === "Hard") {
    return "danger";
  }
  return "accent";
}

/** Maps recommendation reason to the shared tone system. */
export function recommendedTone(reason: RecommendedReason): Tone {
  if (reason === "Overdue") {
    return "danger";
  }
  if (reason === "Review focus") {
    return "info";
  }
  return "accent";
}

/** Maps course-question status into the shared tone system. */
export function questionStatusTone(status: CourseQuestionStatusView): Tone {
  if (status === "DUE_NOW" || status === "CURRENT" || status === "READY") {
    return "accent";
  }
  if (status === "LOCKED") {
    return "default";
  }
  return "success";
}

/** Formats enum-like values for simple human-readable labels. */
export function labelForStatus(value: string): string {
  return value.replace(/_/g, " ");
}

/** Formats a study phase with a screen-specific fallback. */
export function formatStudyPhase(
  phase?: StudyPhase | null,
  fallback = "NEW"
): string {
  if (!phase) {
    return fallback;
  }

  return getStudyPhaseLabel(phase);
}
