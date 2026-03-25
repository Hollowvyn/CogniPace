import { sendMessage } from "../shared/runtime";
import { Problem, StudyState } from "../shared/types";

interface ProblemRow {
  problem: Problem;
  studyState: StudyState | null;
}

interface DatabasePayload {
  problems: ProblemRow[];
}

let rows: ProblemRow[] = [];
let sortMode: "none" | "dueFirst" = "none";

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

function formatDate(iso?: string): string {
  if (!iso) {
    return "-";
  }
  return new Date(iso).toLocaleString();
}

function getCurrentFilters(): {
  query: string;
  set: string;
  difficulty: string;
  due: string;
  topic: string;
} {
  return {
    query: byId<HTMLInputElement>("filter-query").value.trim().toLowerCase(),
    set: byId<HTMLSelectElement>("filter-set").value,
    difficulty: byId<HTMLSelectElement>("filter-difficulty").value,
    due: byId<HTMLSelectElement>("filter-due").value,
    topic: byId<HTMLInputElement>("filter-topic").value.trim().toLowerCase()
  };
}

function matchesDueFilter(row: ProblemRow, due: string): boolean {
  const state = row.studyState;
  if (due === "all") {
    return true;
  }
  if (due === "due") {
    return !!state?.nextReviewAt && new Date(state.nextReviewAt).getTime() <= Date.now();
  }
  if (due === "new") {
    return !state || state.status === "NEW" || state.reviewCount === 0;
  }
  if (due === "mastered") {
    return state?.status === "MASTERED";
  }
  if (due === "suspended") {
    return state?.status === "SUSPENDED";
  }
  return state?.status === due.toUpperCase();
}

function renderTable(): void {
  const filters = getCurrentFilters();
  const tbody = byId<HTMLTableSectionElement>("problems-body");
  tbody.innerHTML = "";

  const filtered = rows.filter((row) => {
    if (filters.query) {
      const haystack = `${row.problem.title} ${row.problem.leetcodeSlug}`.toLowerCase();
      if (!haystack.includes(filters.query)) {
        return false;
      }
    }

    if (filters.set !== "all" && !row.problem.sourceSet.includes(filters.set)) {
      return false;
    }

    if (filters.difficulty !== "all" && row.problem.difficulty !== filters.difficulty) {
      return false;
    }

    if (!matchesDueFilter(row, filters.due)) {
      return false;
    }

    if (filters.topic) {
      const topics = row.problem.topics.join(" ").toLowerCase();
      const tags = row.studyState?.tags?.join(" ").toLowerCase() ?? "";
      if (!topics.includes(filters.topic) && !tags.includes(filters.topic)) {
        return false;
      }
    }

    return true;
  });

  if (sortMode === "dueFirst") {
    const now = Date.now();
    filtered.sort((a, b) => {
      const aDueAt = a.studyState?.nextReviewAt ? new Date(a.studyState.nextReviewAt).getTime() : Number.MAX_SAFE_INTEGER;
      const bDueAt = b.studyState?.nextReviewAt ? new Date(b.studyState.nextReviewAt).getTime() : Number.MAX_SAFE_INTEGER;
      const aBucket = aDueAt <= now ? 0 : 1;
      const bBucket = bDueAt <= now ? 0 : 1;
      if (aBucket !== bBucket) {
        return aBucket - bBucket;
      }
      return aDueAt - bDueAt;
    });
  }

  byId<HTMLElement>("table-count").textContent = `${filtered.length} / ${rows.length}`;

  for (const row of filtered) {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td><a href="${row.problem.url}" target="_blank" data-problem-link="true">${escapeHtml(row.problem.title)}</a><div class="sub">${escapeHtml(
      row.problem.leetcodeSlug
    )}</div></td>
      <td>${row.problem.difficulty}</td>
      <td>${escapeHtml(row.problem.sourceSet.join(", ") || "Custom")}</td>
      <td>${row.studyState?.status ?? "NEW"}</td>
      <td>${formatDate(row.studyState?.nextReviewAt)}</td>
      <td>${row.studyState?.lapses ?? 0}</td>
      <td class="actions"></td>
    `;

    const actionCell = tr.querySelector<HTMLTableCellElement>(".actions");
    if (actionCell) {
      const suspend = document.createElement("button");
      const isSuspended = row.studyState?.status === "SUSPENDED";
      suspend.textContent = isSuspended ? "Unsuspend" : "Suspend";
      suspend.onclick = async () => {
        const response = await sendMessage("SUSPEND_PROBLEM", {
          slug: row.problem.leetcodeSlug,
          suspend: !isSuspended
        });
        if (!response.ok) {
          showStatus(response.error ?? "Failed to update suspend state", true);
          return;
        }
        await loadDatabase();
      };

      const reset = document.createElement("button");
      reset.textContent = "Reset";
      reset.onclick = async () => {
        const keepNotes = window.confirm("Keep notes and tags while resetting schedule?");
        const response = await sendMessage("RESET_PROBLEM_SCHEDULE", {
          slug: row.problem.leetcodeSlug,
          keepNotes
        });
        if (!response.ok) {
          showStatus(response.error ?? "Failed to reset", true);
          return;
        }
        await loadDatabase();
      };

      actionCell.appendChild(suspend);
      actionCell.appendChild(reset);
    }

    const link = tr.querySelector<HTMLAnchorElement>('a[data-problem-link="true"]');
    if (link) {
      link.addEventListener("click", () => {
        void sendMessage("QUEUE_AUTO_TIMER_START", { slug: row.problem.leetcodeSlug });
      });
    }

    tbody.appendChild(tr);
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function populateFilters(payload: DatabasePayload): void {
  const setSelect = byId<HTMLSelectElement>("filter-set");
  const existing = new Set<string>(["all"]);
  setSelect.innerHTML = '<option value="all">All sets</option>';

  for (const row of payload.problems) {
    for (const set of row.problem.sourceSet) {
      if (existing.has(set)) {
        continue;
      }
      existing.add(set);
      const option = document.createElement("option");
      option.value = set;
      option.textContent = set;
      setSelect.appendChild(option);
    }
  }
}

function applyQueryFilters(): void {
  const params = new URLSearchParams(window.location.search);
  const topic = params.get("topic");
  const sort = params.get("sort");
  if (topic) {
    byId<HTMLInputElement>("filter-topic").value = topic;
  }
  if (sort === "dueFirst") {
    sortMode = "dueFirst";
  }
}

async function loadDatabase(): Promise<void> {
  const response = await sendMessage("GET_DASHBOARD_DATA", {});
  if (!response.ok) {
    showStatus(response.error ?? "Failed to load problem database", true);
    return;
  }

  const payload = response.data as DatabasePayload;
  rows = payload.problems;
  populateFilters(payload);
  applyQueryFilters();
  renderTable();
  showStatus(`Loaded ${rows.length} problems.`);
}

function bindEvents(): void {
  byId<HTMLInputElement>("filter-query").addEventListener("input", () => renderTable());
  byId<HTMLInputElement>("filter-topic").addEventListener("input", () => renderTable());
  byId<HTMLSelectElement>("filter-set").addEventListener("change", () => renderTable());
  byId<HTMLSelectElement>("filter-difficulty").addEventListener("change", () => renderTable());
  byId<HTMLSelectElement>("filter-due").addEventListener("change", () => renderTable());

  byId<HTMLButtonElement>("refresh-btn").onclick = () => {
    void loadDatabase();
  };

  byId<HTMLButtonElement>("open-dashboard-btn").onclick = () => {
    window.location.href = chrome.runtime.getURL("dashboard.html");
  };
}

bindEvents();
void loadDatabase();
