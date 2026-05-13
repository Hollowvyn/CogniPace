/** UI-only presentation helpers for study-state and recommendation labels. */
import { Difficulty, RecommendedReason } from "@features/problems";
import { StudyPhase } from "@features/study";
import { TrackQuestionStatusView } from "@features/tracks";
import { getStudyPhaseLabel } from "@libs/fsrs/studyState";


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
export function questionStatusTone(status: TrackQuestionStatusView): Tone {
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

/**
 * Maps the FSRS retrievability score (0-1, "current probability of recall")
 * to the shared tone system. Used by the Library Retention column and the
 * expanded-row Retrievability tile.
 *
 *   ≥ 0.85  → success (high retention)
 *   ≥ 0.70  → accent (moderate retention; warn-leaning)
 *   <  0.70 → danger (low retention)
 *   undef.  → default (no FSRS card yet)
 */
export function retrievalTone(retrievability?: number): Tone {
  if (retrievability === undefined || Number.isNaN(retrievability)) {
    return "default";
  }
  if (retrievability >= 0.85) return "success";
  if (retrievability >= 0.7) return "accent";
  return "danger";
}

/** Formats retrievability as a percent string ("92%"); em-dash when absent. */
export function formatRetention(retrievability?: number): string {
  if (retrievability === undefined || Number.isNaN(retrievability)) {
    return "—";
  }
  return `${Math.round(retrievability * 100)}%`;
}
