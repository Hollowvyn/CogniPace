/**
 * Peak-by-date scheduling overlay for company-pool practice.
 *
 * When the user sets an `InterviewTarget`, the recommendation system
 * shifts from "long-term retention via FSRS" toward "cover this pool by
 * interview day." This module provides the pure-domain primitives:
 *
 *   - `daysUntilTarget` — whole-day delta from `now` to the target date.
 *   - `isInterviewTargetActive` — true when target exists, dates parse,
 *     and the interview hasn't passed.
 *   - `coverageQuotaForToday` — `ceil(uncovered / max(1, daysLeft))`,
 *     i.e. the number of pool problems the user needs to *touch* today
 *     to finish coverage by interview day.
 *   - `resolveEffectiveDailyGoal` — `max(userDailyGoal, coverageQuota)`
 *     when the overlay is active, otherwise the unchanged daily goal.
 *
 * Domain code stays pure: callers thread `now` in, no `Date.now()`.
 */
import type { InterviewTarget } from "../settings/model";

/** Returns whole days remaining from `now` to `target.date` (negative if
 * the interview already passed; zero on the day of). */
export function daysUntilTarget(target: InterviewTarget, now: Date): number {
  const interviewMs = Date.parse(target.date);
  if (!Number.isFinite(interviewMs)) return -Infinity;
  const dayMs = 24 * 60 * 60 * 1000;
  const interviewDay = Math.floor(interviewMs / dayMs);
  const nowDay = Math.floor(now.getTime() / dayMs);
  return interviewDay - nowDay;
}

/** True when the overlay should drive scheduling decisions. */
export function isInterviewTargetActive(
  target: InterviewTarget | null | undefined,
  now: Date,
): target is InterviewTarget {
  if (!target) return false;
  const days = daysUntilTarget(target, now);
  return Number.isFinite(days) && days >= 0;
}

/** Returns whether the active focus matches the interview target's
 * company. The overlay is inert when the user is focused elsewhere. */
export function isInterviewTargetForCompany(
  target: InterviewTarget | null | undefined,
  companyId: string | null | undefined,
): target is InterviewTarget {
  if (!target || !companyId) return false;
  return target.companyId === companyId;
}

/** How many pool problems the user should *touch* today to finish
 * coverage by interview day. Day-of-interview returns the remaining
 * uncovered count (no division by zero). */
export function coverageQuotaForToday(input: {
  uncoveredCount: number;
  target: InterviewTarget;
  now: Date;
}): number {
  const { uncoveredCount, target, now } = input;
  if (uncoveredCount <= 0) return 0;
  const days = daysUntilTarget(target, now);
  if (!Number.isFinite(days) || days < 0) return 0;
  const denominator = Math.max(1, days + 1);
  return Math.ceil(uncoveredCount / denominator);
}

/** Effective daily question goal for queue building. Returns the
 * user-configured goal unless the interview target is active for the
 * pool's company, in which case it bumps to at least `coverageQuota`. */
export function resolveEffectiveDailyGoal(input: {
  userDailyGoal: number;
  uncoveredCount: number;
  target: InterviewTarget | null | undefined;
  companyId: string | null | undefined;
  now: Date;
}): number {
  const { userDailyGoal, uncoveredCount, target, companyId, now } = input;
  if (!isInterviewTargetActive(target, now)) return userDailyGoal;
  if (!isInterviewTargetForCompany(target, companyId)) return userDailyGoal;
  const quota = coverageQuotaForToday({ uncoveredCount, target, now });
  return Math.max(userDailyGoal, quota);
}
