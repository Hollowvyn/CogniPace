import { sendMessage } from "../shared/runtime";
import { QueueItem } from "../shared/types";
import { isProblemPage } from "../shared/utils";

const MAX_FOCUS_ITEMS = 3;

interface CurriculumItem {
  topic: string;
  slug: string;
  title: string;
  url: string;
  isInLibrary: boolean;
}

interface DashboardData {
  queue: {
    dueCount: number;
    newCount: number;
    reinforcementCount: number;
    items: QueueItem[];
  };
  analytics: {
    streakDays: number;
  };
  curriculum: {
    topic: string | null;
    completed: boolean;
    items: CurriculumItem[];
  };
}

let dueCandidates: QueueItem[] = [];
let focusItems: QueueItem[] = [];
let focusTopic: string | null = null;
let curriculumItems: CurriculumItem[] = [];
let curriculumTopic: string | null = null;
let curriculumCompleted = false;

function byId<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) {
    throw new Error(`Missing element: ${id}`);
  }
  return node as T;
}

function formatNextReview(iso?: string): string {
  if (!iso) {
    return "Not scheduled";
  }
  return new Date(iso).toLocaleString();
}

function pickRandomItems<T>(items: T[], count: number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const swapIndex = Math.floor(Math.random() * (i + 1));
    const current = copy[i];
    copy[i] = copy[swapIndex];
    copy[swapIndex] = current;
  }
  return copy.slice(0, Math.min(count, copy.length));
}

function chooseFocusItems(items: QueueItem[]): { items: QueueItem[]; topic: string | null } {
  if (items.length === 0) {
    return { items: [], topic: null };
  }

  const topicBuckets = new Map<string, QueueItem[]>();
  for (const item of items) {
    const topicCandidates = [...(item.problem.topics ?? []), ...(item.studyState.tags ?? [])]
      .map((topic) => topic.trim())
      .filter(Boolean);
    const uniqueTopics = Array.from(new Set(topicCandidates));
    for (const topic of uniqueTopics) {
      const current = topicBuckets.get(topic) ?? [];
      current.push(item);
      topicBuckets.set(topic, current);
    }
  }

  const eligibleBuckets = Array.from(topicBuckets.entries()).filter(([, bucket]) => bucket.length >= 2);
  if (eligibleBuckets.length > 0) {
    const maxBucketSize = Math.max(...eligibleBuckets.map(([, bucket]) => bucket.length));
    const strongestBuckets = eligibleBuckets.filter(([, bucket]) => bucket.length === maxBucketSize);
    const [topic, bucket] = strongestBuckets[Math.floor(Math.random() * strongestBuckets.length)];
    return { items: pickRandomItems(bucket, MAX_FOCUS_ITEMS), topic };
  }

  return { items: pickRandomItems(items, MAX_FOCUS_ITEMS), topic: null };
}

function regenerateFocusItems(): void {
  const selection = chooseFocusItems(dueCandidates);
  focusItems = selection.items;
  focusTopic = selection.topic;
}

async function openProblemFromExtension(url: string, slug: string): Promise<void> {
  await sendMessage("QUEUE_AUTO_TIMER_START", { slug });
  chrome.tabs.create({ url });
}

async function startCurriculumProblem(item: CurriculumItem): Promise<void> {
  const response = await sendMessage("ADD_PROBLEM_BY_INPUT", {
    input: item.slug,
    sourceSet: "Blind75",
    topics: [item.topic],
    markAsStarted: true
  });

  if (!response.ok) {
    byId<HTMLElement>("error").textContent = response.error ?? "Failed to add curriculum problem.";
  } else {
    byId<HTMLElement>("error").textContent = "";
  }

  await openProblemFromExtension(item.url, item.slug);
  void refresh();
}

function renderFocusList(): void {
  const list = byId<HTMLUListElement>("focus-list");
  const caption = byId<HTMLElement>("focus-caption");
  const shuffleButton = byId<HTMLButtonElement>("shuffle-focus-btn");
  list.innerHTML = "";

  if (dueCandidates.length === 0) {
    shuffleButton.disabled = true;

    if (curriculumItems.length > 0) {
      caption.textContent = curriculumTopic
        ? `Path mode: ${curriculumTopic}. Work these in order.`
        : "Path mode: work these in order.";

      for (const item of curriculumItems) {
        const li = document.createElement("li");
        li.className = "focus-item";

        const titleButton = document.createElement("button");
        titleButton.className = "link-btn";
        titleButton.textContent = item.title;
        titleButton.onclick = () => {
          void startCurriculumProblem(item);
        };

        const meta = document.createElement("div");
        meta.className = "meta";
        meta.textContent = `${item.topic} · ${item.isInLibrary ? "In your queue" : "Starter problem"}`;

        li.appendChild(titleButton);
        li.appendChild(meta);
        list.appendChild(li);
      }
      return;
    }

    if (curriculumCompleted) {
      caption.textContent = "Curriculum complete. No due or overdue problems right now.";
    } else {
      caption.textContent = "No due or overdue problems right now.";
    }

    const empty = document.createElement("li");
    empty.className = "queue-empty";
    empty.textContent = curriculumCompleted
      ? "You completed the starter path. Keep reviewing to maintain mastery."
      : "You are clear. New problems will appear here once reviews are due.";
    list.appendChild(empty);
    return;
  }

  shuffleButton.disabled = dueCandidates.length <= 1;
  caption.textContent = focusTopic
    ? `Topic focus: ${focusTopic}. Random due picks (up to ${MAX_FOCUS_ITEMS}).`
    : `Random due picks (up to ${MAX_FOCUS_ITEMS}).`;

  for (const item of focusItems) {
    const li = document.createElement("li");
    li.className = "focus-item";

    const titleButton = document.createElement("button");
    titleButton.className = "link-btn";
    titleButton.textContent = item.problem.title;
    titleButton.onclick = () => {
      void openProblemFromExtension(item.problem.url, item.problem.leetcodeSlug);
    };

    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = `${item.problem.difficulty} · Next: ${formatNextReview(item.studyState.nextReviewAt)}`;

    li.appendChild(titleButton);
    li.appendChild(meta);
    list.appendChild(li);
  }
}

async function refresh(): Promise<void> {
  const response = await sendMessage("GET_DASHBOARD_DATA", {});
  if (!response.ok) {
    byId<HTMLElement>("error").textContent = response.error ?? "Failed to load queue";
    return;
  }

  byId<HTMLElement>("error").textContent = "";
  const data = response.data as DashboardData;

  dueCandidates = data.queue.items.filter((item) => item.category === "due");
  curriculumItems = data.curriculum?.items ?? [];
  curriculumTopic = data.curriculum?.topic ?? null;
  curriculumCompleted = data.curriculum?.completed ?? false;

  byId<HTMLElement>("due-count").textContent = String(data.queue.dueCount);
  byId<HTMLElement>("streak-count").textContent = String(data.analytics.streakDays);

  const nextDue = dueCandidates.find((item) => item.studyState.nextReviewAt);
  byId<HTMLElement>("next-review").textContent = nextDue
    ? formatNextReview(nextDue.studyState.nextReviewAt)
    : "-";

  regenerateFocusItems();
  renderFocusList();
}

async function addInputProblem(): Promise<void> {
  const inputEl = byId<HTMLInputElement>("manual-input");
  const input = inputEl.value.trim();
  if (!input) {
    return;
  }

  const response = await sendMessage("ADD_PROBLEM_BY_INPUT", { input });
  if (!response.ok) {
    byId<HTMLElement>("error").textContent = response.error ?? "Failed to add problem";
    return;
  }

  inputEl.value = "";
  await refresh();
}

async function addCurrentProblem(): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) {
    byId<HTMLElement>("error").textContent = "No active tab URL.";
    return;
  }

  if (!isProblemPage(tab.url)) {
    byId<HTMLElement>("error").textContent = "Current tab is not a LeetCode problem.";
    return;
  }

  const response = await sendMessage("ADD_PROBLEM_BY_INPUT", { input: tab.url });
  if (!response.ok) {
    byId<HTMLElement>("error").textContent = response.error ?? "Current tab is not a LeetCode problem.";
    return;
  }

  await refresh();
}

function bindEvents(): void {
  byId<HTMLButtonElement>("manual-add-btn").onclick = () => {
    void addInputProblem();
  };

  byId<HTMLButtonElement>("add-current-btn").onclick = () => {
    void addCurrentProblem();
  };

  byId<HTMLButtonElement>("open-dashboard-btn").onclick = () => {
    chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") });
  };

  byId<HTMLButtonElement>("refresh-btn").onclick = () => {
    void refresh();
  };

  byId<HTMLButtonElement>("shuffle-focus-btn").onclick = () => {
    regenerateFocusItems();
    renderFocusList();
  };

  byId<HTMLInputElement>("manual-input").addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      void addInputProblem();
    }
  });
}

bindEvents();
void refresh();
