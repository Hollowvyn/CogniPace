import { sendMessage } from "../shared/runtime";
import { Problem, StudyState, UserSettings } from "../shared/types";

interface ProblemRow {
  problem: Problem;
  studyState: StudyState | null;
}

interface DashboardPayload {
  problems: ProblemRow[];
  queue: {
    dueCount: number;
    newCount: number;
    reinforcementCount: number;
    items: Array<{ slug: string }>;
  };
  analytics: {
    streakDays: number;
    totalReviews: number;
    masteredCount: number;
    retentionProxy: number;
    weakestProblems: Array<{ slug: string; title: string; lapses: number; ease: number }>;
    dueByDay: Array<{ date: string; count: number }>;
  };
  settings: UserSettings;
  curatedSetNames: string[];
}

let rows: ProblemRow[] = [];
let settings: UserSettings;

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
        await loadDashboard();
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
        await loadDashboard();
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

function renderAnalytics(payload: DashboardPayload): void {
  byId<HTMLElement>("metric-streak").textContent = String(payload.analytics.streakDays);
  byId<HTMLElement>("metric-total-reviews").textContent = String(payload.analytics.totalReviews);
  byId<HTMLElement>("metric-mastered").textContent = String(payload.analytics.masteredCount);
  byId<HTMLElement>("metric-retention").textContent = `${Math.round(payload.analytics.retentionProxy * 100)}%`;

  const weakest = byId<HTMLUListElement>("weakest-list");
  weakest.innerHTML = "";
  for (const item of payload.analytics.weakestProblems) {
    const li = document.createElement("li");
    li.textContent = `${item.title} (${item.slug}) · lapses ${item.lapses} · ease ${item.ease.toFixed(2)}`;
    weakest.appendChild(li);
  }

  const due = byId<HTMLUListElement>("due-by-day-list");
  due.innerHTML = "";
  for (const item of payload.analytics.dueByDay) {
    const li = document.createElement("li");
    li.textContent = `${item.date}: ${item.count}`;
    due.appendChild(li);
  }
}

function populateFilters(payload: DashboardPayload): void {
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

  const curated = byId<HTMLSelectElement>("curated-select");
  curated.innerHTML = "";
  for (const setName of payload.curatedSetNames) {
    const option = document.createElement("option");
    option.value = setName;
    option.textContent = setName;
    curated.appendChild(option);
  }
}

function populateSettingsForm(current: UserSettings): void {
  const setsContainer = byId<HTMLDivElement>("sets-enabled");
  setsContainer.innerHTML = "";
  for (const [setName, enabled] of Object.entries(current.setsEnabled)) {
    const label = document.createElement("label");
    label.innerHTML = `<input type="checkbox" data-set-toggle="${escapeHtml(setName)}" ${
      enabled ? "checked" : ""
    } /> ${escapeHtml(setName)}`;
    setsContainer.appendChild(label);
  }

  byId<HTMLInputElement>("settings-daily-new").value = String(current.dailyNewLimit);
  byId<HTMLInputElement>("settings-daily-review").value = String(current.dailyReviewLimit);
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
}

async function importCuratedSet(): Promise<void> {
  const setName = byId<HTMLSelectElement>("curated-select").value;
  const response = await sendMessage("IMPORT_CURATED_SET", { setName });
  if (!response.ok) {
    showStatus(response.error ?? "Curated import failed", true);
    return;
  }

  showStatus(`Imported ${setName}.`);
  await loadDashboard();
}

async function importCustomSet(): Promise<void> {
  const setName = byId<HTMLInputElement>("custom-set-name").value.trim();
  const raw = byId<HTMLTextAreaElement>("custom-set-json").value.trim();
  if (!raw) {
    showStatus("Paste a JSON array of slugs or objects.", true);
    return;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    showStatus("Invalid JSON in custom import.", true);
    return;
  }

  if (!Array.isArray(parsed)) {
    showStatus("Custom import expects a JSON array.", true);
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
    return;
  }

  const response = await sendMessage("IMPORT_CUSTOM_SET", {
    setName: setName || undefined,
    items
  });

  if (!response.ok) {
    showStatus(response.error ?? "Custom import failed", true);
    return;
  }

  showStatus(`Imported ${items.length} custom items.`);
  await loadDashboard();
}

async function exportData(): Promise<void> {
  const response = await sendMessage("EXPORT_DATA", {});
  if (!response.ok) {
    showStatus(response.error ?? "Export failed", true);
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
}

async function importFullData(file: File): Promise<void> {
  const text = await file.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    showStatus("Invalid JSON file.", true);
    return;
  }

  const response = await sendMessage("IMPORT_DATA", parsed as never);
  if (!response.ok) {
    showStatus(response.error ?? "Import failed", true);
    return;
  }

  showStatus("Full data imported.");
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
  await loadDashboard();
}

async function loadDashboard(): Promise<void> {
  const response = await sendMessage("GET_DASHBOARD_DATA", {});
  if (!response.ok) {
    showStatus(response.error ?? "Failed to load dashboard", true);
    return;
  }

  const payload = response.data as DashboardPayload;
  rows = payload.problems;
  settings = payload.settings;

  populateFilters(payload);
  populateSettingsForm(settings);
  renderAnalytics(payload);
  renderTable();

  byId<HTMLElement>("queue-summary").textContent =
    `Due ${payload.queue.dueCount} · New ${payload.queue.newCount} · Reinforcement ${payload.queue.reinforcementCount}`;
}

function bindEvents(): void {
  byId<HTMLInputElement>("filter-query").addEventListener("input", () => renderTable());
  byId<HTMLInputElement>("filter-topic").addEventListener("input", () => renderTable());
  byId<HTMLSelectElement>("filter-set").addEventListener("change", () => renderTable());
  byId<HTMLSelectElement>("filter-difficulty").addEventListener("change", () => renderTable());
  byId<HTMLSelectElement>("filter-due").addEventListener("change", () => renderTable());

  byId<HTMLButtonElement>("curated-import-btn").onclick = () => {
    void importCuratedSet();
  };

  byId<HTMLButtonElement>("custom-import-btn").onclick = () => {
    void importCustomSet();
  };

  byId<HTMLButtonElement>("export-btn").onclick = () => {
    void exportData();
  };

  byId<HTMLInputElement>("full-import-file").addEventListener("change", (event) => {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    void importFullData(file);
    input.value = "";
  });

  byId<HTMLButtonElement>("save-settings-btn").onclick = () => {
    void saveSettings();
  };

  byId<HTMLButtonElement>("refresh-btn").onclick = () => {
    void loadDashboard();
  };
}

bindEvents();
void loadDashboard();
