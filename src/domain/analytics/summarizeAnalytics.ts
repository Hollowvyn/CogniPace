import { getStudyStateSummary } from "./studyState";
import { AppData, AnalyticsSummary, StudyState } from "./types";
import { startOfDay, ymd } from "./utils";

function collectAllStates(data: AppData): Array<[string, StudyState]> {
  return Object.entries(data.studyStatesBySlug);
}

function computeStreak(data: AppData): number {
  const reviewDays = new Set<string>();

  for (const [, state] of collectAllStates(data)) {
    for (const attempt of state.attemptHistory) {
      reviewDays.add(ymd(new Date(attempt.reviewedAt)));
    }
  }

  let streak = 0;
  let cursor = startOfDay(new Date());

  while (reviewDays.has(ymd(cursor))) {
    streak += 1;
    cursor = new Date(cursor.getTime() - 24 * 60 * 60 * 1000);
  }

  return streak;
}

function computeRetentionProxy(data: AppData): number {
  const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;
  let positive = 0;
  let negative = 0;

  for (const [, state] of collectAllStates(data)) {
    for (const attempt of state.attemptHistory) {
      if (new Date(attempt.reviewedAt).getTime() < cutoff) {
        continue;
      }
      if (attempt.rating >= 2) {
        positive += 1;
      } else {
        negative += 1;
      }
    }
  }

  const total = positive + negative;
  return total === 0 ? 0 : positive / total;
}

function dueByDay(
  data: AppData,
  days = 14
): Array<{ date: string; count: number }> {
  const map = new Map<string, number>();
  const now = startOfDay(new Date());

  for (let offset = 0; offset < days; offset += 1) {
    const day = new Date(now.getTime() + offset * 24 * 60 * 60 * 1000);
    map.set(ymd(day), 0);
  }

  for (const [, state] of collectAllStates(data)) {
    const summary = getStudyStateSummary(state, now);
    if (!summary.nextReviewAt || summary.suspended) {
      continue;
    }

    const key = ymd(new Date(summary.nextReviewAt));
    if (!map.has(key)) {
      continue;
    }

    map.set(key, (map.get(key) ?? 0) + 1);
  }

  return Array.from(map.entries()).map(([date, count]) => ({ date, count }));
}

export function summarizeAnalytics(data: AppData): AnalyticsSummary {
  const states = collectAllStates(data);
  const summaries = states.map(([slug, studyState]) => ({
    slug,
    studyState,
    summary: getStudyStateSummary(studyState),
  }));
  const totalReviews = summaries.reduce(
    (sum, item) => sum + item.summary.reviewCount,
    0
  );
  const phaseCounts = summaries.reduce<AnalyticsSummary["phaseCounts"]>(
    (counts, item) => {
      counts[item.summary.phase] += 1;
      return counts;
    },
    {
      New: 0,
      Learning: 0,
      Review: 0,
      Relearning: 0,
      Suspended: 0,
    }
  );

  const weakestProblems = summaries
    .map(({ slug, summary }) => ({
      slug,
      title: data.problemsBySlug[slug]?.title ?? slug,
      lapses: summary.lapses,
      difficulty: summary.difficulty ?? 0,
    }))
    .sort((a, b) => {
      if (b.lapses !== a.lapses) {
        return b.lapses - a.lapses;
      }
      return b.difficulty - a.difficulty;
    })
    .slice(0, 10);

  return {
    streakDays: computeStreak(data),
    totalReviews,
    phaseCounts,
    retentionProxy: computeRetentionProxy(data),
    weakestProblems,
    dueByDay: dueByDay(data),
  };
}
