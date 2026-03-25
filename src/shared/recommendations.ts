import { RecommendedProblemView, TodayQueue } from "./types";

export function buildRecommendedCandidates(
  queue: TodayQueue,
  activeCourseNextSlug?: string | null,
  nowMs = Date.now()
): RecommendedProblemView[] {
  const candidates = queue.items
    .filter((item, index) => item.category === "due" || item.category === "reinforcement" || index === 0)
    .slice(0, 12)
    .map((item) => {
      const dueAt = item.studyState.nextReviewAt ? new Date(item.studyState.nextReviewAt).getTime() : null;
      const overdueDays =
        dueAt !== null && dueAt < nowMs ? Math.floor((nowMs - dueAt) / (24 * 60 * 60 * 1000)) : 0;
      const reason: RecommendedProblemView["reason"] =
        item.category === "due"
          ? overdueDays >= 1
            ? "Overdue"
            : "Due now"
          : "Review focus";

      return {
        slug: item.slug,
        title: item.problem.title || item.slug,
        url: item.problem.url,
        difficulty: item.problem.difficulty,
        reason,
        nextReviewAt: item.studyState.nextReviewAt,
        daysOverdue: overdueDays > 0 ? overdueDays : undefined,
        alsoCourseNext: activeCourseNextSlug === item.slug
      } satisfies RecommendedProblemView;
    });

  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    if (seen.has(candidate.slug)) {
      return false;
    }
    seen.add(candidate.slug);
    return true;
  });
}
