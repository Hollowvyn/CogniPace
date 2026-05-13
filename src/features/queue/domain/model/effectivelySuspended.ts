/**
 * Single predicate for "this problem should not be queued / shown as
 * available." Replaces the two prior settings (`skipIgnored` /
 * `skipPremium`) with one derived flag the queue and the UI both read.
 *
 * - `studyState.suspended` is the SSoT for the user's per-problem
 *   decision (FSRS-aligned, set via the Suspend action).
 * - `settings.questionFilters.skipPremium` reframes premium gating as
 *   "treat premium as suspended" — the runtime check is identical.
 */
import type { Problem } from "../../../../domain/types/Problem";
import type { StudyState } from "../../../../domain/types/StudyState";
import type { UserSettings } from "@features/settings";

type EffectivelySuspendedReason = "manual" | "premium" | "both";

interface EffectivelySuspendedFlag {
  suspended: boolean;
  reason?: EffectivelySuspendedReason;
}

export function effectivelySuspendedFlag(
  problem: Pick<Problem, "isPremium">,
  studyState: Pick<StudyState, "suspended"> | null | undefined,
  settings: Pick<UserSettings, "questionFilters">,
): EffectivelySuspendedFlag {
  const manual = studyState?.suspended === true;
  const premium =
    settings.questionFilters.skipPremium && problem.isPremium === true;
  if (manual && premium) return { suspended: true, reason: "both" };
  if (manual) return { suspended: true, reason: "manual" };
  if (premium) return { suspended: true, reason: "premium" };
  return { suspended: false };
}

export function isEffectivelySuspended(
  problem: Pick<Problem, "isPremium">,
  studyState: Pick<StudyState, "suspended"> | null | undefined,
  settings: Pick<UserSettings, "questionFilters">,
): boolean {
  return effectivelySuspendedFlag(problem, studyState, settings).suspended;
}
