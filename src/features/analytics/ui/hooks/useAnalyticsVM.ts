/** AnalyticsScreen's ViewModel — read-only. Today the dashboard shell
 *  owns the shared app-shell query and passes the snapshot through; the
 *  VM derives the chart-friendly fields. When analytics grows its own
 *  data path, the VM gains its own query and the screen stops needing
 *  the payload prop. */
import type { AnalyticsSummary } from "../../domain/model";
import type { AppShellPayload } from "@features/app-shell";

export interface AnalyticsDuePoint {
  date: string;
  count: number;
}

export interface AnalyticsScreenModel {
  retentionProxy: number;
  retentionProxyPct: number;
  streakDays: number;
  totalReviews: number;
  weakest: AnalyticsSummary["weakestProblems"];
  dueByDay: AnalyticsDuePoint[];
  maxDuePerDay: number;
}

export function useAnalyticsVM(
  payload: AppShellPayload | null,
): AnalyticsScreenModel {
  const analytics = payload?.analytics;
  const weakest = analytics?.weakestProblems ?? [];
  const dueByDay = analytics?.dueByDay ?? [];
  const retentionProxy = analytics?.retentionProxy ?? 0;
  return {
    retentionProxy,
    retentionProxyPct: Math.round(retentionProxy * 100),
    streakDays: analytics?.streakDays ?? 0,
    totalReviews: analytics?.totalReviews ?? 0,
    weakest,
    dueByDay,
    maxDuePerDay: Math.max(1, ...dueByDay.map((point) => point.count)),
  };
}
