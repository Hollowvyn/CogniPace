import { sendMessage } from "../shared/runtime";
import { formatClock, startOfDay, ymd } from "../shared/utils";
import { AnalyticsSummary, Problem, StudyState, TodayQueue, UserSettings } from "../shared/types";

interface StudyPlanSummary {
  id: string;
  name: string;
  description: string;
  sourceSet: string;
  topicCount: number;
  problemCount: number;
}

interface DashboardPayload {
  queue: TodayQueue;
  analytics: AnalyticsSummary;
  settings: UserSettings;
  studyPlans: StudyPlanSummary[];
  curatedSetNames: string[];
  problems: Array<{ problem: Problem; studyState: StudyState | null }>;
  curriculum: {
    planId: string;
    planName: string;
    sourceSet: string;
    topic: string | null;
    completed: boolean;
    items: Array<{
      slug: string;
      title: string;
      url: string;
      isInLibrary: boolean;
    }>;
  };
}

let settings: UserSettings;
let studyPlans: StudyPlanSummary[] = [];
let currentQueue: TodayQueue | null = null;
let sessionQueue: SessionItem[] = [];
let sessionIndex = 0;
let sessionStartMs = 0;
let sessionItemStartMs = 0;
let sessionRatings: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };
let sessionTimeMs = 0;
let manualAdds = new Set<string>();
let lastPayload: DashboardPayload | null = null;

const DUE_VISIBLE_LIMIT = 6;
const SPEED_DAYS_SHORT = 14;
const SPEED_DAYS_LONG = 30;
const RECALL_LIMIT = 8;
const RETRIEVABILITY_THRESHOLD = 0.3;
const RECENT_LAPSE_DAYS = 14;
const OVERDUE_DAYS = 2;
const TOPICS_LIMIT = 8;

type WeakestSortKey = "problem" | "status" | "ease" | "lapses" | "rating" | "avgTime" | "nextDue";
type SortDirection = "asc" | "desc";

interface WeakestRow {
  slug: string;
  title: string;
  url: string;
  status: StudyState["status"];
  statusOrder: number;
  ease: number;
  stabilityDays: number;
  lapses: number;
  lastRating: number | null;
  avgTimeMs: number | null;
  nextDueAt: number | null;
  nextDueLabel: string;
}

let weakestRows: WeakestRow[] = [];
let weakestSort: { key: WeakestSortKey; direction: SortDirection } = { key: "lapses", direction: "desc" };

interface SessionItem {
  slug: string;
  title: string;
  url: string;
  difficulty: Problem["difficulty"];
  category: "due" | "new" | "manual";
}

function byId<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) {
    throw new Error(`Missing element: ${id}`);
  }
  return node as T;
}

function showStatus(message: string, isError = false): void {
  const status = byId<HTMLElement>("status");
  status.textContent = message;
  status.dataset.error = isError ? "true" : "false";
}

function showDataStatus(message: string, isError = false): void {
  const status = byId<HTMLElement>("data-status");
  status.textContent = message;
  status.dataset.error = isError ? "true" : "false";
}

function setSavedState(visible: boolean, message = "Saved"): void {
  const saved = byId<HTMLElement>("settings-saved");
  saved.textContent = visible ? message : "";
  saved.classList.toggle("visible", visible);
}

function updateSettingsVisibility(): void {
  document.querySelectorAll<HTMLElement>("[data-conditional]").forEach((element) => {
    const key = element.dataset.conditional;
    if (!key) {
      return;
    }
    const toggle = byId<HTMLInputElement>(key);
    element.classList.toggle("hidden", !toggle.checked);
  });
}

function setModalOpen(open: boolean): void {
  const modal = byId<HTMLElement>("data-modal");
  modal.dataset.open = open ? "true" : "false";
  modal.setAttribute("aria-hidden", open ? "false" : "true");
  if (open) {
    showDataStatus("");
  }
}

function renderAnalytics(payload: DashboardPayload): void {
  byId<HTMLElement>("metric-streak").textContent = String(payload.analytics.streakDays);
  byId<HTMLElement>("metric-total-reviews").textContent = String(payload.analytics.totalReviews);
  byId<HTMLElement>("metric-mastered").textContent = String(payload.analytics.masteredCount);
  byId<HTMLElement>("metric-retention").textContent = `${Math.round(payload.analytics.retentionProxy * 100)}%`;
}

function statusOrder(status: StudyState["status"]): number {
  if (status === "NEW") return 0;
  if (status === "LEARNING") return 1;
  if (status === "REVIEWING") return 2;
  if (status === "MASTERED") return 3;
  return 4;
}

function formatStatus(status: StudyState["status"]): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

function formatNextDue(iso?: string): { label: string; ts: number | null } {
  if (!iso) {
    return { label: "-", ts: null };
  }
  const ts = new Date(iso).getTime();
  const now = Date.now();
  if (ts <= now) {
    return { label: "Due", ts };
  }
  return { label: ymd(new Date(ts)), ts };
}

function formatRating(value: number | null): string {
  if (value === null || Number.isNaN(value)) {
    return "-";
  }
  return String(value);
}

function formatAvgTime(avgTimeMs: number | null): string {
  if (!avgTimeMs || avgTimeMs <= 0) {
    return "-";
  }
  return formatClock(avgTimeMs);
}

function computeAverage(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  const total = values.reduce((sum, value) => sum + value, 0);
  return total / values.length;
}

function buildWeakestRows(payload: DashboardPayload): WeakestRow[] {
  const rows: WeakestRow[] = [];

  for (const entry of payload.problems) {
    if (!entry.studyState) {
      continue;
    }
    const state = entry.studyState;
    const attempts = state.attemptHistory ?? [];
    const times = attempts.map((attempt) => attempt.solveTimeMs).filter((ms): ms is number => typeof ms === "number");
    const avgTimeMs = computeAverage(times);
    const lastRating = state.lastRating ?? attempts[attempts.length - 1]?.rating ?? null;
    const due = formatNextDue(state.nextReviewAt);

    rows.push({
      slug: entry.problem.leetcodeSlug,
      title: entry.problem.title || entry.problem.leetcodeSlug,
      url: entry.problem.url,
      status: state.status,
      statusOrder: statusOrder(state.status),
      ease: state.ease,
      stabilityDays: state.intervalDays,
      lapses: state.lapses,
      lastRating: lastRating ?? null,
      avgTimeMs,
      nextDueAt: due.ts,
      nextDueLabel: due.label
    });
  }

  return rows;
}

function compareNumber(a: number | null, b: number | null, direction: SortDirection): number {
  const aValue = a ?? (direction === "asc" ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY);
  const bValue = b ?? (direction === "asc" ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY);
  if (aValue === bValue) {
    return 0;
  }
  return direction === "asc" ? aValue - bValue : bValue - aValue;
}

function compareString(a: string, b: string, direction: SortDirection): number {
  const result = a.localeCompare(b);
  return direction === "asc" ? result : -result;
}

function sortedWeakestRows(): WeakestRow[] {
  const { key, direction } = weakestSort;
  return [...weakestRows].sort((a, b) => {
    switch (key) {
      case "problem":
        return compareString(a.title, b.title, direction);
      case "status":
        return compareNumber(a.statusOrder, b.statusOrder, direction);
      case "ease": {
        const easeCompare = compareNumber(a.ease, b.ease, direction);
        if (easeCompare !== 0) {
          return easeCompare;
        }
        return compareNumber(a.stabilityDays, b.stabilityDays, direction);
      }
      case "lapses":
        return compareNumber(a.lapses, b.lapses, direction);
      case "rating":
        return compareNumber(a.lastRating, b.lastRating, direction);
      case "avgTime":
        return compareNumber(a.avgTimeMs, b.avgTimeMs, direction);
      case "nextDue":
        return compareNumber(a.nextDueAt, b.nextDueAt, direction);
      default:
        return 0;
    }
  });
}

function renderWeakestTable(): void {
  const body = byId<HTMLTableSectionElement>("weakest-table-body");
  const empty = byId<HTMLElement>("weakest-empty");
  body.innerHTML = "";

  const rows = sortedWeakestRows();
  updateSortButtons();
  if (rows.length === 0) {
    empty.textContent = "No review history yet.";
    return;
  }
  empty.textContent = "";

  for (const row of rows) {
    const tr = document.createElement("tr");

    const problemCell = document.createElement("td");
    const link = document.createElement("a");
    link.href = row.url;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = row.title;
    problemCell.appendChild(link);
    tr.appendChild(problemCell);

    const statusCell = document.createElement("td");
    statusCell.textContent = formatStatus(row.status);
    tr.appendChild(statusCell);

    const easeCell = document.createElement("td");
    easeCell.textContent = row.stabilityDays > 0 ? `${row.ease.toFixed(2)} / ${Math.round(row.stabilityDays)}d` : "-";
    tr.appendChild(easeCell);

    const lapsesCell = document.createElement("td");
    lapsesCell.textContent = String(row.lapses);
    tr.appendChild(lapsesCell);

    const ratingCell = document.createElement("td");
    ratingCell.textContent = formatRating(row.lastRating);
    tr.appendChild(ratingCell);

    const timeCell = document.createElement("td");
    timeCell.textContent = formatAvgTime(row.avgTimeMs);
    tr.appendChild(timeCell);

    const dueCell = document.createElement("td");
    dueCell.textContent = row.nextDueLabel;
    tr.appendChild(dueCell);

    body.appendChild(tr);
  }

}

function updateSortButtons(): void {
  document.querySelectorAll<HTMLButtonElement>("[data-sort]").forEach((button) => {
    const key = button.dataset.sort as WeakestSortKey | undefined;
    if (!key) {
      return;
    }
    const isActive = key === weakestSort.key;
    button.classList.toggle("active", isActive);
    button.classList.toggle("asc", isActive && weakestSort.direction === "asc");
    button.classList.toggle("desc", isActive && weakestSort.direction === "desc");
  });
}

function renderForecast(payload: DashboardPayload): void {
  const container = byId<HTMLDivElement>("forecast-bars");
  const summary = byId<HTMLElement>("forecast-summary");
  container.innerHTML = "";

  const items = payload.analytics.dueByDay;
  if (!items.length) {
    summary.textContent = "No forecast data";
    return;
  }

  const counts = items.map((item) => item.count);
  const max = Math.max(...counts, 1);
  const avg = counts.reduce((sum, count) => sum + count, 0) / counts.length;
  const spikeThreshold = Math.max(3, Math.round(avg * 1.5));
  const spikes = items.filter((item) => item.count >= spikeThreshold).length;

  summary.textContent = `Avg ${avg.toFixed(1)} / day${spikes ? ` - ${spikes} spike${spikes > 1 ? "s" : ""}` : ""}`;

  for (const item of items) {
    const row = document.createElement("div");
    row.className = "bar-row";
    if (item.count >= spikeThreshold && item.count > 0) {
      row.classList.add("spike");
    }

    const label = document.createElement("span");
    label.textContent = item.date.slice(5);

    const bar = document.createElement("div");
    bar.className = "bar";
    const fill = document.createElement("div");
    fill.className = "bar-fill";
    fill.style.width = `${Math.round((item.count / max) * 100)}%`;
    bar.appendChild(fill);

    const value = document.createElement("span");
    value.className = "bar-value";
    value.textContent = String(item.count);

    row.appendChild(label);
    row.appendChild(bar);
    row.appendChild(value);
    container.appendChild(row);
  }
}

function renderTopics(payload: DashboardPayload): void {
  const body = byId<HTMLTableSectionElement>("topics-table-body");
  const empty = byId<HTMLElement>("topics-empty");
  body.innerHTML = "";

  const topicMap = new Map<string, { lapses: number; reviews: number; ratingSum: number; ratingCount: number; timeSum: number; timeCount: number }>();

  for (const entry of payload.problems) {
    const state = entry.studyState;
    if (!state) {
      continue;
    }

    const tags = Array.isArray(state.tags) ? state.tags : [];
    const topics = new Set<string>([...(entry.problem.topics ?? []), ...tags].filter(Boolean));
    if (topics.size === 0) {
      continue;
    }

    const attempts = state.attemptHistory ?? [];
    const ratings = attempts.map((attempt) => attempt.rating);
    const times = attempts.map((attempt) => attempt.solveTimeMs).filter((ms): ms is number => typeof ms === "number");

    for (const topic of topics) {
      const entryStats = topicMap.get(topic) ?? {
        lapses: 0,
        reviews: 0,
        ratingSum: 0,
        ratingCount: 0,
        timeSum: 0,
        timeCount: 0
      };
      entryStats.lapses += state.lapses;
      entryStats.reviews += state.reviewCount;
      entryStats.ratingSum += ratings.reduce((sum, rating) => sum + rating, 0);
      entryStats.ratingCount += ratings.length;
      entryStats.timeSum += times.reduce((sum, time) => sum + time, 0);
      entryStats.timeCount += times.length;
      topicMap.set(topic, entryStats);
    }
  }

  const rows = Array.from(topicMap.entries())
    .map(([topic, stats]) => {
      const lapsesRate = stats.reviews > 0 ? stats.lapses / stats.reviews : 0;
      const avgRating = stats.ratingCount > 0 ? stats.ratingSum / stats.ratingCount : null;
      const avgTime = stats.timeCount > 0 ? stats.timeSum / stats.timeCount : null;
      return { topic, lapsesRate, avgRating, avgTime, reviews: stats.reviews };
    })
    .sort((a, b) => b.lapsesRate - a.lapsesRate);

  if (rows.length === 0) {
    empty.textContent = "No topic performance data yet.";
    return;
  }
  empty.textContent = "";

  for (const row of rows) {
    const tr = document.createElement("tr");

    const topicCell = document.createElement("td");
    topicCell.textContent = row.topic;
    tr.appendChild(topicCell);

    const lapseCell = document.createElement("td");
    lapseCell.textContent = `${(row.lapsesRate * 100).toFixed(1)}%`;
    tr.appendChild(lapseCell);

    const ratingCell = document.createElement("td");
    ratingCell.textContent = row.avgRating === null ? "-" : row.avgRating.toFixed(2);
    tr.appendChild(ratingCell);

    const timeCell = document.createElement("td");
    timeCell.textContent = formatAvgTime(row.avgTime);
    tr.appendChild(timeCell);

    const reviewCell = document.createElement("td");
    reviewCell.textContent = String(row.reviews);
    tr.appendChild(reviewCell);

    body.appendChild(tr);
  }
}

function collectSolveTimes(payload: DashboardPayload): Array<{ date: string; solveTimeMs: number }> {
  const entries: Array<{ date: string; solveTimeMs: number }> = [];
  for (const entry of payload.problems) {
    const state = entry.studyState;
    if (!state) {
      continue;
    }
    for (const attempt of state.attemptHistory ?? []) {
      if (typeof attempt.solveTimeMs !== "number") {
        continue;
      }
      entries.push({ date: ymd(new Date(attempt.reviewedAt)), solveTimeMs: attempt.solveTimeMs });
    }
  }
  return entries;
}

function buildSpeedSeries(entries: Array<{ date: string; solveTimeMs: number }>, days: number) {
  const now = startOfDay(new Date());
  const buckets = new Map<string, { total: number; count: number }>();

  for (let offset = 0; offset < days; offset += 1) {
    const day = new Date(now.getTime() - (days - 1 - offset) * 24 * 60 * 60 * 1000);
    buckets.set(ymd(day), { total: 0, count: 0 });
  }

  for (const entry of entries) {
    const bucket = buckets.get(entry.date);
    if (!bucket) {
      continue;
    }
    bucket.total += entry.solveTimeMs;
    bucket.count += 1;
  }

  return Array.from(buckets.entries()).map(([date, stats]) => ({
    date,
    avgTimeMs: stats.count > 0 ? stats.total / stats.count : null,
    count: stats.count
  }));
}

function renderSpeedBars(containerId: string, series: Array<{ date: string; avgTimeMs: number | null }>): void {
  const container = byId<HTMLDivElement>(containerId);
  container.innerHTML = "";

  const max = Math.max(
    ...series.map((item) => item.avgTimeMs ?? 0),
    1
  );

  for (const item of series) {
    const row = document.createElement("div");
    row.className = "bar-row";

    const label = document.createElement("span");
    label.textContent = item.date.slice(5);

    const bar = document.createElement("div");
    bar.className = "bar";
    const fill = document.createElement("div");
    fill.className = "bar-fill";
    const width = item.avgTimeMs ? Math.round((item.avgTimeMs / max) * 100) : 0;
    fill.style.width = `${width}%`;
    bar.appendChild(fill);

    const value = document.createElement("span");
    value.className = "bar-value";
    value.textContent = formatAvgTime(item.avgTimeMs);

    row.appendChild(label);
    row.appendChild(bar);
    row.appendChild(value);
    container.appendChild(row);
  }
}

function renderSpeed(payload: DashboardPayload): void {
  const entries = collectSolveTimes(payload);
  const summary = byId<HTMLElement>("speed-summary");

  if (entries.length === 0) {
    summary.textContent = "No solve-time data yet.";
    byId<HTMLDivElement>("speed-14").innerHTML = "";
    byId<HTMLDivElement>("speed-30").innerHTML = "";
    return;
  }

  const series14 = buildSpeedSeries(entries, SPEED_DAYS_SHORT);
  const series30 = buildSpeedSeries(entries, SPEED_DAYS_LONG);
  renderSpeedBars("speed-14", series14);
  renderSpeedBars("speed-30", series30);

  const avg14 = computeAverage(series14.map((item) => item.avgTimeMs ?? 0).filter((value) => value > 0));
  const avg30 = computeAverage(series30.map((item) => item.avgTimeMs ?? 0).filter((value) => value > 0));

  summary.textContent = `14-day avg ${formatAvgTime(avg14)} - 30-day avg ${formatAvgTime(avg30)}`;
}

function renderAnalyticsTabs(payload: DashboardPayload): void {
  weakestRows = buildWeakestRows(payload);
  renderWeakestTable();
  renderForecast(payload);
  renderTopics(payload);
  renderSpeed(payload);
}

function setActiveTab(tabKey: string): void {
  const panels = document.querySelectorAll<HTMLElement>(".tab-panel");
  panels.forEach((panel) => {
    panel.classList.toggle("active", panel.id === `tab-${tabKey}`);
  });

  document.querySelectorAll<HTMLButtonElement>(".tab-button").forEach((button) => {
    const isActive = button.dataset.tab === tabKey;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", isActive ? "true" : "false");
  });
}

function renderToday(queue: TodayQueue): void {
  currentQueue = queue;
  const manualCount = manualAdds.size;
  byId<HTMLElement>("queue-summary").textContent =
    `Due ${queue.dueCount} - New ${queue.newCount} - Reinforcement ${queue.reinforcementCount}` +
    (manualCount > 0 ? ` - Added ${manualCount}` : "");
  byId<HTMLElement>("today-due-count").textContent = String(queue.dueCount);
  byId<HTMLElement>("today-new-count").textContent = String(queue.newCount);
  byId<HTMLElement>("today-reinforce-count").textContent = String(queue.reinforcementCount);
  byId<HTMLElement>("today-manual-count").textContent = String(manualAdds.size);

  const dueItems = queue.items.filter((item) => item.category === "due");
  const dueList = byId<HTMLUListElement>("due-list");
  const overflow = byId<HTMLElement>("due-overflow");
  dueList.innerHTML = "";

  if (dueItems.length === 0) {
    const li = document.createElement("li");
    li.textContent = "No reviews due right now.";
    li.classList.add("empty");
    dueList.appendChild(li);
    overflow.textContent = "";
    return;
  }

  for (const item of dueItems.slice(0, DUE_VISIBLE_LIMIT)) {
    const li = document.createElement("li");
    const link = document.createElement("a");
    link.href = item.problem.url;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = item.problem.title || item.slug;

    const tag = document.createElement("span");
    tag.className = "tag";
    tag.textContent = item.problem.difficulty;

    li.appendChild(link);
    li.appendChild(tag);
    dueList.appendChild(li);
  }

  const remaining = Math.max(0, dueItems.length - DUE_VISIBLE_LIMIT);
  overflow.textContent = remaining > 0 ? `+${remaining} more due today.` : "";
}

function buildSessionQueue(payload: DashboardPayload): SessionItem[] {
  const dueItems = payload.queue.items.filter((item) => item.category === "due");
  const newItems = payload.queue.items
    .filter((item) => item.category === "new")
    .slice(0, payload.settings.dailyNewLimit);

  const manualItems = payload.problems
    .filter((entry) => manualAdds.has(entry.problem.leetcodeSlug))
    .map((entry) => ({
      slug: entry.problem.leetcodeSlug,
      title: entry.problem.title || entry.problem.leetcodeSlug,
      url: entry.problem.url,
      difficulty: entry.problem.difficulty,
      category: "manual" as const
    }));

  const base = [...dueItems, ...newItems].map((item) => ({
    slug: item.slug,
    title: item.problem.title || item.slug,
    url: item.problem.url,
    difficulty: item.problem.difficulty,
    category: item.category
  }));

  const existing = new Set(base.map((item) => item.slug));
  const extras = manualItems.filter((item) => !existing.has(item.slug));
  return [...base, ...extras];
}

interface RecallRow {
  slug: string;
  title: string;
  url: string;
  reasons: string[];
  score: number;
}

function difficultyScore(difficulty: Problem["difficulty"]): number {
  if (difficulty === "Hard") return 8;
  if (difficulty === "Medium") return 6;
  if (difficulty === "Easy") return 3;
  return 5;
}

function computeRetrievability(state: StudyState): number | null {
  if (!state.lastReviewedAt || state.intervalDays <= 0) {
    return null;
  }
  const daysSince = (Date.now() - new Date(state.lastReviewedAt).getTime()) / (24 * 60 * 60 * 1000);
  const interval = Math.max(1, state.intervalDays);
  const value = 1 - daysSince / interval;
  return Math.max(0, Math.min(1, value));
}

function buildRecallRows(payload: DashboardPayload, limit = RECALL_LIMIT): RecallRow[] {
  const now = Date.now();
  const rows: RecallRow[] = [];

  for (const entry of payload.problems) {
    const state = entry.studyState;
    if (!state || state.status === "SUSPENDED") {
      continue;
    }

    const reasons: string[] = [];
    let score = 0;

    const retrievability = computeRetrievability(state);
    if (retrievability !== null && retrievability < RETRIEVABILITY_THRESHOLD) {
      reasons.push("Low recall");
      score += 4;
    }

    if (state.ease <= 2 && state.lastReviewedAt) {
      const daysSince = (now - new Date(state.lastReviewedAt).getTime()) / (24 * 60 * 60 * 1000);
      if (daysSince <= RECENT_LAPSE_DAYS) {
        reasons.push("Recent lapse");
        score += 3;
      }
    }

    if (difficultyScore(entry.problem.difficulty) >= 7) {
      reasons.push("High difficulty");
      score += 2;
    }

    if (state.nextReviewAt) {
      const overdueDays = (now - new Date(state.nextReviewAt).getTime()) / (24 * 60 * 60 * 1000);
      if (overdueDays > OVERDUE_DAYS) {
        reasons.push("Overdue");
        score += 5;
      }
    }

    if (reasons.length === 0) {
      continue;
    }

    rows.push({
      slug: entry.problem.leetcodeSlug,
      title: entry.problem.title || entry.problem.leetcodeSlug,
      url: entry.problem.url,
      reasons,
      score
    });
  }

  const sorted = rows
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.title.localeCompare(b.title);
    });

  return sorted.slice(0, limit);
}

function renderRecallFocus(payload: DashboardPayload): RecallRow[] {
  const body = byId<HTMLTableSectionElement>("recall-table-body");
  const empty = byId<HTMLElement>("recall-empty");
  body.innerHTML = "";

  const rows = buildRecallRows(payload, RECALL_LIMIT);
  if (rows.length === 0) {
    empty.textContent = "No recall focus items yet.";
    return [];
  }
  empty.textContent = "";

  for (const row of rows) {
    const tr = document.createElement("tr");

    const problemCell = document.createElement("td");
    const link = document.createElement("a");
    link.href = row.url;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = row.title;
    problemCell.appendChild(link);
    tr.appendChild(problemCell);

    const whyCell = document.createElement("td");
    const chipRow = document.createElement("div");
    chipRow.className = "chip-row";
    row.reasons.forEach((reason) => {
      const chip = document.createElement("span");
      chip.className = "chip alert";
      chip.textContent = reason;
      chipRow.appendChild(chip);
    });
    whyCell.appendChild(chipRow);
    tr.appendChild(whyCell);

    const actionCell = document.createElement("td");
    const button = document.createElement("button");
    button.className = "secondary small";
    button.textContent = manualAdds.has(row.slug) ? "Added" : "Add to today";
    button.disabled = manualAdds.has(row.slug);
    button.dataset.addSlug = row.slug;
    actionCell.appendChild(button);
    tr.appendChild(actionCell);

    body.appendChild(tr);
  }

  return rows;
}

function renderTopicsCard(payload: DashboardPayload, recallRows: RecallRow[]): void {
  const list = byId<HTMLUListElement>("topics-list");
  const empty = byId<HTMLElement>("topics-empty");
  list.innerHTML = "";

  const recallSet = new Set(buildRecallRows(payload, Number.MAX_SAFE_INTEGER).map((row) => row.slug));
  const topicMap = new Map<string, { total: number; mastered: number; dueToday: number; recallCount: number }>();
  const now = Date.now();

  for (const entry of payload.problems) {
    const topics = entry.problem.topics ?? [];
    if (topics.length === 0) {
      continue;
    }
    const state = entry.studyState;

    for (const topic of topics) {
      const stats = topicMap.get(topic) ?? { total: 0, mastered: 0, dueToday: 0, recallCount: 0 };
      stats.total += 1;
      if (state?.status === "MASTERED") {
        stats.mastered += 1;
      }
      if (state?.status !== "SUSPENDED" && state?.nextReviewAt && new Date(state.nextReviewAt).getTime() <= now) {
        stats.dueToday += 1;
      }
      if (recallSet.has(entry.problem.leetcodeSlug)) {
        stats.recallCount += 1;
      }
      topicMap.set(topic, stats);
    }
  }

  const rows = Array.from(topicMap.entries())
    .map(([topic, stats]) => ({ topic, ...stats }))
    .sort((a, b) => {
      if (b.recallCount !== a.recallCount) {
        return b.recallCount - a.recallCount;
      }
      if (b.dueToday !== a.dueToday) {
        return b.dueToday - a.dueToday;
      }
      return a.topic.localeCompare(b.topic);
    })
    .slice(0, TOPICS_LIMIT);

  if (rows.length === 0) {
    empty.textContent = "No topic data yet.";
    return;
  }
  empty.textContent = "";

  for (const row of rows) {
    const li = document.createElement("li");
    li.className = "topic-item";
    li.dataset.topic = row.topic;

    const meta = document.createElement("div");
    meta.className = "topic-meta";
    const title = document.createElement("strong");
    title.textContent = row.topic;
    const stats = document.createElement("div");
    stats.className = "topic-stats";
    stats.textContent = `Total ${row.total} - Due ${row.dueToday} - Recall ${row.recallCount}`;
    meta.appendChild(title);
    meta.appendChild(stats);

    const progressWrap = document.createElement("div");
    const progress = document.createElement("div");
    progress.className = "progress";
    const fill = document.createElement("div");
    fill.className = "progress-fill";
    const percent = row.total > 0 ? Math.round((row.mastered / row.total) * 100) : 0;
    fill.style.width = `${percent}%`;
    progress.appendChild(fill);
    const progressLabel = document.createElement("div");
    progressLabel.className = "sub";
    progressLabel.textContent = `${row.mastered} / ${row.total} mastered`;
    progressWrap.appendChild(progress);
    progressWrap.appendChild(progressLabel);

    li.appendChild(meta);
    li.appendChild(progressWrap);
    list.appendChild(li);
  }
}

function setSessionModalOpen(open: boolean): void {
  const modal = byId<HTMLElement>("session-modal");
  modal.dataset.open = open ? "true" : "false";
  modal.setAttribute("aria-hidden", open ? "false" : "true");
}

function formatSessionProgress(): string {
  if (sessionQueue.length === 0) {
    return "0 / 0";
  }
  return `${Math.min(sessionIndex + 1, sessionQueue.length)} / ${sessionQueue.length}`;
}

function renderSessionList(): void {
  const list = byId<HTMLUListElement>("session-list");
  list.innerHTML = "";

  if (sessionQueue.length === 0) {
    const li = document.createElement("li");
    li.textContent = "No due or new items in today's queue.";
    li.classList.add("empty");
    list.appendChild(li);
    return;
  }

  sessionQueue.forEach((item, index) => {
    const li = document.createElement("li");
    if (index === sessionIndex) {
      li.classList.add("active");
    } else if (index < sessionIndex) {
      li.classList.add("done");
    }

    const title = document.createElement("span");
    title.textContent = item.title;

    const tag = document.createElement("span");
    tag.className = "tag";
    if (item.category === "due") {
      tag.textContent = "Due";
    } else if (item.category === "new") {
      tag.textContent = "New";
    } else {
      tag.textContent = "Added";
    }

    li.appendChild(title);
    li.appendChild(tag);
    list.appendChild(li);
  });
}

function renderSessionFocus(): void {
  const title = byId<HTMLElement>("session-problem-title");
  const meta = byId<HTMLElement>("session-problem-meta");
  const tag = byId<HTMLElement>("session-problem-tag");
  const progress = byId<HTMLElement>("session-progress");

  progress.textContent = formatSessionProgress();

  const item = sessionQueue[sessionIndex];
  if (!item) {
    title.textContent = "Session complete";
    meta.textContent = "You finished today's queue.";
    tag.textContent = "";
    return;
  }

  title.textContent = item.title;
  const categoryLabel = item.category === "due" ? "Due now" : item.category === "new" ? "New item" : "Manual add";
  meta.textContent = `${item.difficulty} - ${categoryLabel}`;
  tag.textContent = item.difficulty;
  sessionItemStartMs = Date.now();
}

function renderSessionSummary(streakDays: number): void {
  const summary = byId<HTMLElement>("session-summary");
  const body = byId<HTMLElement>("session-body");
  const ratings = byId<HTMLElement>("session-ratings");
  const time = byId<HTMLElement>("session-time");
  const streak = byId<HTMLElement>("session-streak");

  body.classList.add("hidden");
  summary.classList.remove("hidden");

  ratings.innerHTML = "";
  const ratingLabels: Record<number, string> = { 3: "Easy", 2: "Good", 1: "Hard", 0: "Again" };
  [3, 2, 1, 0].forEach((value) => {
    const row = document.createElement("div");
    row.textContent = `${ratingLabels[value]}: ${sessionRatings[value] ?? 0}`;
    ratings.appendChild(row);
  });

  time.textContent = formatClock(sessionTimeMs);
  streak.textContent = `${streakDays} day${streakDays === 1 ? "" : "s"}`;
}

function resetSessionSummary(): void {
  byId<HTMLElement>("session-body").classList.remove("hidden");
  byId<HTMLElement>("session-summary").classList.add("hidden");
}

async function finishSession(): Promise<void> {
  sessionTimeMs = Date.now() - sessionStartMs;
  const response = await sendMessage("GET_DASHBOARD_DATA", {});
  if (response.ok) {
    const payload = response.data as DashboardPayload;
    renderSessionSummary(payload.analytics.streakDays);
  } else {
    renderSessionSummary(0);
  }
  await loadDashboard();
}

async function rateSessionItem(rating: number): Promise<void> {
  const item = sessionQueue[sessionIndex];
  if (!item) {
    return;
  }

  const solveTimeMs = Math.max(0, Date.now() - sessionItemStartMs);
  const response = await sendMessage("RATE_PROBLEM", {
    slug: item.slug,
    rating,
    solveTimeMs,
    mode: "RECALL"
  });

  if (!response.ok) {
    showStatus(response.error ?? "Failed to rate problem", true);
    return;
  }

  sessionRatings[rating] = (sessionRatings[rating] ?? 0) + 1;
  sessionIndex += 1;

  if (sessionIndex >= sessionQueue.length) {
    await finishSession();
    return;
  }

  renderSessionList();
  renderSessionFocus();
}

function renderStudyPlan(payload: DashboardPayload): void {
  const curriculum = payload.curriculum;
  const summary = payload.studyPlans.find((plan) => plan.id === curriculum.planId);

  const status = byId<HTMLElement>("study-plan-status");
  const name = byId<HTMLElement>("study-plan-name");
  const meta = byId<HTMLElement>("study-plan-meta");
  const topic = byId<HTMLElement>("study-plan-topic");
  const items = byId<HTMLUListElement>("study-plan-items");

  name.textContent = curriculum.planName;
  const metaParts = [curriculum.sourceSet];
  if (summary?.problemCount) {
    metaParts.unshift(`${summary.problemCount} problems`);
  }
  meta.textContent = metaParts.join(" - ");

  if (curriculum.completed) {
    status.textContent = "Complete";
  } else if (settings.studyMode !== "studyPlan") {
    status.textContent = "Freestyle";
  } else {
    status.textContent = "Active";
  }

  if (curriculum.completed) {
    topic.textContent = "All topics completed.";
  } else if (!curriculum.topic) {
    topic.textContent = `Enable ${curriculum.sourceSet} to resume this plan.`;
  } else {
    topic.textContent = `Next topic: ${curriculum.topic}`;
  }

  items.innerHTML = "";

  if (curriculum.items.length === 0) {
    const li = document.createElement("li");
    if (curriculum.completed) {
      li.textContent = "Plan complete. Pick a new plan to keep momentum.";
    } else if (settings.studyMode !== "studyPlan") {
      li.textContent = "Switch to Study plan mode to follow this path.";
    } else {
      li.textContent = "No upcoming steps yet.";
    }
    li.classList.add("empty");
    items.appendChild(li);
    return;
  }

  curriculum.items.forEach((item, index) => {
    const li = document.createElement("li");
    const link = document.createElement("a");
    link.href = item.url;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = item.title || item.slug;

    li.appendChild(link);

    if (index === 0) {
      const tag = document.createElement("span");
      tag.className = "tag";
      tag.textContent = "Next";
      li.appendChild(tag);
    }

    items.appendChild(li);
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function populateCuratedSetOptions(payload: DashboardPayload): void {
  const curated = byId<HTMLSelectElement>("curated-select");
  curated.innerHTML = "";
  for (const setName of payload.curatedSetNames) {
    const option = document.createElement("option");
    option.value = setName;
    option.textContent = setName;
    curated.appendChild(option);
  }
}

function populateStudyPlanOptions(current: UserSettings, plans: StudyPlanSummary[]): void {
  const select = byId<HTMLSelectElement>("settings-active-plan");
  select.innerHTML = "";

  for (const plan of plans) {
    const option = document.createElement("option");
    option.value = plan.id;
    option.textContent = `${plan.name} (${plan.problemCount})`;
    select.appendChild(option);
  }

  if (plans.length === 0) {
    select.disabled = true;
    return;
  }

  const activeExists = plans.some((plan) => plan.id === current.activeStudyPlanId);
  select.value = activeExists ? current.activeStudyPlanId : plans[0].id;
  select.disabled = current.studyMode !== "studyPlan";
}

function populateSettingsForm(current: UserSettings, plans: StudyPlanSummary[]): void {
  const setsContainer = byId<HTMLDivElement>("sets-enabled");
  setsContainer.innerHTML = "";
  for (const [setName, enabled] of Object.entries(current.setsEnabled)) {
    const label = document.createElement("label");
    label.innerHTML = `<input type=\"checkbox\" data-set-toggle=\"${escapeHtml(setName)}\" ${
      enabled ? "checked" : ""
    } /> ${escapeHtml(setName)}`;
    setsContainer.appendChild(label);
  }

  byId<HTMLInputElement>("settings-daily-new").value = String(current.dailyNewLimit);
  byId<HTMLInputElement>("settings-daily-review").value = String(current.dailyReviewLimit);
  byId<HTMLSelectElement>("settings-study-mode").value = current.studyMode;
  byId<HTMLSelectElement>("settings-order").value = current.reviewOrder;
  byId<HTMLSelectElement>("settings-intensity").value = current.scheduleIntensity;
  byId<HTMLInputElement>("settings-require-time").checked = current.requireSolveTime;
  byId<HTMLInputElement>("settings-autodetect").checked = current.autoDetectSolved;
  byId<HTMLInputElement>("settings-notifications").checked = current.notifications;
  byId<HTMLInputElement>("settings-slow-downgrade").checked = current.slowSolveDowngradeEnabled;
  byId<HTMLInputElement>("settings-slow-threshold").value = String(
    Math.round(current.slowSolveThresholdMs / 60000)
  );

  byId<HTMLInputElement>("settings-quiet-start").value = String(current.quietHours.startHour);
  byId<HTMLInputElement>("settings-quiet-end").value = String(current.quietHours.endHour);

  populateStudyPlanOptions(current, plans);
  updateSettingsVisibility();
}

async function importCuratedSet(): Promise<void> {
  const setName = byId<HTMLSelectElement>("curated-select").value;
  const response = await sendMessage("IMPORT_CURATED_SET", { setName });
  if (!response.ok) {
    showStatus(response.error ?? "Curated import failed", true);
    showDataStatus(response.error ?? "Curated import failed", true);
    return;
  }

  showStatus(`Imported ${setName}.`);
  showDataStatus(`Imported ${setName}.`);
  await loadDashboard();
}

async function importCustomSet(): Promise<void> {
  const setName = byId<HTMLInputElement>("custom-set-name").value.trim();
  const raw = byId<HTMLTextAreaElement>("custom-set-json").value.trim();
  if (!raw) {
    showStatus("Paste a JSON array of slugs or objects.", true);
    showDataStatus("Paste a JSON array of slugs or objects.", true);
    return;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    showStatus("Invalid JSON in custom import.", true);
    showDataStatus("Invalid JSON in custom import.", true);
    return;
  }

  if (!Array.isArray(parsed)) {
    showStatus("Custom import expects a JSON array.", true);
    showDataStatus("Custom import expects a JSON array.", true);
    return;
  }

  const items = parsed
    .map((entry) => {
      if (typeof entry === "string") {
        return { slug: entry };
      }
      if (entry && typeof entry === "object" && typeof (entry as { slug?: unknown }).slug === "string") {
        return entry as { slug: string; title?: string; difficulty?: "Easy" | "Medium" | "Hard" | "Unknown"; tags?: string[] };
      }
      return null;
    })
    .filter(Boolean) as Array<{
    slug: string;
    title?: string;
    difficulty?: "Easy" | "Medium" | "Hard" | "Unknown";
    tags?: string[];
  }>;

  if (items.length === 0) {
    showStatus("No valid items found in custom import.", true);
    showDataStatus("No valid items found in custom import.", true);
    return;
  }

  const response = await sendMessage("IMPORT_CUSTOM_SET", {
    setName: setName || undefined,
    items
  });

  if (!response.ok) {
    showStatus(response.error ?? "Custom import failed", true);
    showDataStatus(response.error ?? "Custom import failed", true);
    return;
  }

  showStatus(`Imported ${items.length} custom items.`);
  showDataStatus(`Imported ${items.length} custom items.`);
  await loadDashboard();
}

function validateCustomJson(): void {
  const raw = byId<HTMLTextAreaElement>("custom-set-json").value.trim();
  if (!raw) {
    showDataStatus("Paste a JSON array to validate.", true);
    return;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      showDataStatus("Expected a JSON array.", true);
      return;
    }
    const validCount = parsed.filter((entry) =>
      typeof entry === "string" || (entry && typeof entry === "object" && typeof (entry as { slug?: unknown }).slug === "string")
    ).length;
    showDataStatus(`Valid JSON. ${validCount} item${validCount === 1 ? "" : "s"} detected.`);
  } catch {
    showDataStatus("Invalid JSON payload.", true);
  }
}

async function exportData(): Promise<void> {
  const response = await sendMessage("EXPORT_DATA", {});
  if (!response.ok) {
    showStatus(response.error ?? "Export failed", true);
    showDataStatus(response.error ?? "Export failed", true);
    return;
  }

  const blob = new Blob([JSON.stringify(response.data, null, 2)], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "leetcode-spaced-repetition-export.json";
  link.click();
  URL.revokeObjectURL(url);

  showStatus("Export downloaded.");
  showDataStatus("Export downloaded.");
}

async function importFullData(file: File): Promise<void> {
  const text = await file.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    showStatus("Invalid JSON file.", true);
    showDataStatus("Invalid JSON file.", true);
    return;
  }

  const response = await sendMessage("IMPORT_DATA", parsed as never);
  if (!response.ok) {
    showStatus(response.error ?? "Import failed", true);
    showDataStatus(response.error ?? "Import failed", true);
    return;
  }

  showStatus("Full data imported.");
  showDataStatus("Full data imported.");
  await loadDashboard();
}

async function saveSettings(): Promise<void> {
  const setsEnabled: Record<string, boolean> = {};
  document.querySelectorAll<HTMLInputElement>("[data-set-toggle]").forEach((input) => {
    const name = input.getAttribute("data-set-toggle");
    if (name) {
      setsEnabled[name] = input.checked;
    }
  });

  const payload = {
    dailyNewLimit: Number(byId<HTMLInputElement>("settings-daily-new").value) || 0,
    dailyReviewLimit: Number(byId<HTMLInputElement>("settings-daily-review").value) || 0,
    studyMode: byId<HTMLSelectElement>("settings-study-mode").value,
    activeStudyPlanId: byId<HTMLSelectElement>("settings-active-plan").value,
    reviewOrder: byId<HTMLSelectElement>("settings-order").value,
    scheduleIntensity: byId<HTMLSelectElement>("settings-intensity").value,
    requireSolveTime: byId<HTMLInputElement>("settings-require-time").checked,
    autoDetectSolved: byId<HTMLInputElement>("settings-autodetect").checked,
    notifications: byId<HTMLInputElement>("settings-notifications").checked,
    slowSolveDowngradeEnabled: byId<HTMLInputElement>("settings-slow-downgrade").checked,
    slowSolveThresholdMs:
      (Number(byId<HTMLInputElement>("settings-slow-threshold").value) || 0) * 60 * 1000,
    setsEnabled,
    quietHours: {
      startHour: Number(byId<HTMLInputElement>("settings-quiet-start").value) || 0,
      endHour: Number(byId<HTMLInputElement>("settings-quiet-end").value) || 0
    }
  };

  const response = await sendMessage("UPDATE_SETTINGS", payload as never);
  if (!response.ok) {
    showStatus(response.error ?? "Failed to save settings", true);
    return;
  }

  showStatus("Settings saved.");
  await loadDashboard({ preserveSavedState: true });
  setSavedState(true);
}

async function loadDashboard(options: { preserveSavedState?: boolean } = {}): Promise<void> {
  const response = await sendMessage("GET_DASHBOARD_DATA", {});
  if (!response.ok) {
    showStatus(response.error ?? "Failed to load dashboard", true);
    return;
  }

  const payload = response.data as DashboardPayload;
  lastPayload = payload;
  settings = payload.settings;
  studyPlans = payload.studyPlans ?? [];
  sessionQueue = buildSessionQueue(payload);

  populateCuratedSetOptions(payload);
  renderToday(payload.queue);
  const recallRows = renderRecallFocus(payload);
  renderTopicsCard(payload, recallRows);
}

function bindEvents(): void {
  byId<HTMLButtonElement>("curated-import-btn").onclick = () => {
    void importCuratedSet();
  };

  byId<HTMLButtonElement>("custom-validate-btn").onclick = () => {
    validateCustomJson();
  };

  byId<HTMLButtonElement>("custom-import-btn").onclick = () => {
    void importCustomSet();
  };

  byId<HTMLButtonElement>("export-btn").onclick = () => {
    void exportData();
  };

  let pendingImportFile: File | null = null;
  const importConfirmBtn = byId<HTMLButtonElement>("import-confirm-btn");
  byId<HTMLInputElement>("full-import-file").addEventListener("change", (event) => {
    const input = event.target as HTMLInputElement;
    pendingImportFile = input.files?.[0] ?? null;
    importConfirmBtn.disabled = !pendingImportFile;
    if (pendingImportFile) {
      showDataStatus(`Selected ${pendingImportFile.name}. Ready to import.`);
    }
  });
  importConfirmBtn.onclick = () => {
    if (!pendingImportFile) {
      showDataStatus("Pick a backup file before confirming.", true);
      return;
    }
    void importFullData(pendingImportFile);
    pendingImportFile = null;
    importConfirmBtn.disabled = true;
    byId<HTMLInputElement>("full-import-file").value = "";
  };

  byId<HTMLButtonElement>("recall-add-two-btn").onclick = () => {
    if (!lastPayload) {
      return;
    }
    const rows = buildRecallRows(lastPayload).filter((row) => !manualAdds.has(row.slug)).slice(0, 2);
    rows.forEach((row) => manualAdds.add(row.slug));
    void loadDashboard();
  };

  byId<HTMLTableSectionElement>("recall-table-body").addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    const button = target.closest<HTMLButtonElement>("[data-add-slug]");
    if (!button) {
      return;
    }
    const slug = button.dataset.addSlug;
    if (!slug) {
      return;
    }
    manualAdds.add(slug);
    void loadDashboard();
  });

  byId<HTMLUListElement>("topics-list").addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    const item = target.closest<HTMLElement>(".topic-item");
    if (!item) {
      return;
    }
    const topic = item.dataset.topic;
    if (!topic) {
      return;
    }
    const url = chrome.runtime.getURL(`database.html?topic=${encodeURIComponent(topic)}&sort=dueFirst`);
    chrome.tabs.create({ url });
  });

  byId<HTMLButtonElement>("refresh-btn").onclick = () => {
    void loadDashboard();
  };

  byId<HTMLButtonElement>("open-database-btn").onclick = () => {
    window.location.href = chrome.runtime.getURL("database.html");
  };

  byId<HTMLButtonElement>("start-session-btn").onclick = () => {
    if (sessionQueue.length === 0) {
      showStatus("No due or new items in today's queue yet.");
      return;
    }
    sessionIndex = 0;
    sessionStartMs = Date.now();
    sessionRatings = { 0: 0, 1: 0, 2: 0, 3: 0 };
    sessionTimeMs = 0;
    resetSessionSummary();
    renderSessionList();
    renderSessionFocus();
    setSessionModalOpen(true);
  };

  byId<HTMLButtonElement>("data-btn").onclick = () => {
    setModalOpen(true);
  };

  byId<HTMLButtonElement>("data-modal-close").onclick = () => {
    setModalOpen(false);
  };

  const modal = byId<HTMLElement>("data-modal");
  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      setModalOpen(false);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modal.dataset.open === "true") {
      setModalOpen(false);
    }
  });

  showDataStatus("");

  const sessionModal = byId<HTMLElement>("session-modal");
  byId<HTMLButtonElement>("session-close").onclick = () => {
    setSessionModalOpen(false);
  };
  byId<HTMLButtonElement>("session-close-summary").onclick = () => {
    setSessionModalOpen(false);
  };
  sessionModal.addEventListener("click", (event) => {
    if (event.target === sessionModal) {
      setSessionModalOpen(false);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && sessionModal.dataset.open === "true") {
      setSessionModalOpen(false);
    }
  });

  document.querySelectorAll<HTMLButtonElement>("[data-rating]").forEach((button) => {
    button.addEventListener("click", () => {
      const value = Number(button.dataset.rating);
      if (Number.isNaN(value)) {
        return;
      }
      void rateSessionItem(value);
    });
  });

  byId<HTMLButtonElement>("session-open-link").onclick = () => {
    const item = sessionQueue[sessionIndex];
    if (!item) {
      return;
    }
    chrome.tabs.create({ url: item.url });
  };

}

bindEvents();
void loadDashboard();
