/** UI-presentation helpers for the problems feature. Maps problem-domain
 *  values (Difficulty, RecommendedReason, StudyPhase, retrievability)
 *  to display strings and to the design-system Tone vocabulary. */
import { getStudyPhaseLabel } from "@libs/fsrs/studyState";

import type { Difficulty, RecommendedReason } from "../../domain/model";
import type { Tone } from "@design-system/atoms/tone";
import type { StudyPhase } from "@features/study";


/** Formats an ISO date for display with a screen-specific fallback. */
export function formatDisplayDate(
  iso?: string,
  fallback = "Not scheduled",
): string {
  if (!iso) return fallback;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleDateString();
}

/** Maps difficulty to the shared tone system used by chips and badges. */
export function difficultyTone(difficulty: Difficulty): Tone {
  if (difficulty === "Easy") return "info";
  if (difficulty === "Hard") return "danger";
  return "accent";
}

/** Maps recommendation reason to the shared tone system. */
export function recommendedTone(reason: RecommendedReason): Tone {
  if (reason === "Overdue") return "danger";
  if (reason === "Review focus") return "info";
  return "accent";
}

/** Formats a study phase with a screen-specific fallback. */
export function formatStudyPhase(
  phase?: StudyPhase | null,
  fallback = "NEW",
): string {
  if (!phase) return fallback;
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
