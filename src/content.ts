import { sendMessage } from "./shared/runtime";
import { Difficulty, Rating, StudyState } from "./shared/types";
import { difficultyGoalMs, formatClock, normalizeSlug, parseDifficulty, slugToTitle } from "./shared/utils";

const OVERLAY_ID = "lcsr-overlay-root";
const AUTO_START_DELAY_MS = 5000;
const TIMER_TICK_MS = 250;
const JUDGE_TIMEOUT_MS = 2 * 60 * 1000;

const SUBMISSION_FAIL_TOKENS = [
  "wrong answer",
  "runtime error",
  "time limit exceeded",
  "memory limit exceeded",
  "output limit exceeded",
  "compile error",
  "presentation error"
];

let activeSlug = "";
let currentState: StudyState | null = null;
let currentTitle = "";
let currentDifficulty: Difficulty = "Unknown";
let timerGoalMs = difficultyGoalMs("Unknown");

let timerStartedAtMs: number | null = null;
let pausedElapsedMs = 0;
let timerTickHandle: number | null = null;
let autoStartHandle: number | null = null;
let judgeTimeoutHandle: number | null = null;
let awaitingJudgeResult = false;
let latestSubmitAtMs = 0;
let overlayCollapsed = false;
let selectedRating: Rating = 2;
let draftNotes = "";
let draftContextSlug = "";

function getProblemSlugFromUrl(url = window.location.href): string | null {
  const match = url.match(/\/problems\/([^/]+)\/?/);
  if (!match?.[1]) {
    return null;
  }
  const normalized = normalizeSlug(match[1]);
  return normalized || null;
}

function detectDifficulty(): Difficulty {
  const candidates = Array.from(document.querySelectorAll("span,div,p"))
    .map((node) => node.textContent?.trim() ?? "")
    .filter(Boolean);

  for (const text of candidates) {
    if (text === "Easy" || text === "Medium" || text === "Hard") {
      return parseDifficulty(text);
    }
  }

  return "Unknown";
}

function detectTitle(slug: string): string {
  const h1 = document.querySelector("h1");
  const title = h1?.textContent?.trim();
  return title || slugToTitle(slug);
}

function detectSolvedState(): boolean {
  const textBlob = document.body.innerText || "";
  return /\bsolved\b/i.test(textBlob) || /\baccepted\b/i.test(textBlob);
}

function ensureOverlay(): HTMLElement {
  const existing = document.getElementById(OVERLAY_ID);
  if (existing) {
    return existing;
  }

  const root = document.createElement("div");
  root.id = OVERLAY_ID;
  root.style.position = "fixed";
  root.style.right = "20px";
  root.style.bottom = "20px";
  root.style.zIndex = "2147483647";
  root.style.maxWidth = "360px";
  root.style.fontFamily = '"Inter", "Segoe UI", sans-serif';
  root.style.fontSize = "12px";
  root.style.lineHeight = "1.45";
  document.body.appendChild(root);
  return root;
}

function statusColor(status: StudyState["status"] | undefined): string {
  switch (status) {
    case "MASTERED":
      return "#22c55e";
    case "REVIEWING":
      return "#38bdf8";
    case "LEARNING":
      return "#f59e0b";
    case "SUSPENDED":
      return "#94a3b8";
    default:
      return "#a78bfa";
  }
}

function formatDate(iso?: string): string {
  if (!iso) {
    return "-";
  }

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString();
}

function isTimerRunning(): boolean {
  return timerStartedAtMs !== null;
}

function getElapsedMs(nowMs = Date.now()): number {
  return pausedElapsedMs + (timerStartedAtMs ? nowMs - timerStartedAtMs : 0);
}

function clearTimerTick(): void {
  if (timerTickHandle !== null) {
    window.clearInterval(timerTickHandle);
    timerTickHandle = null;
  }
}

function ensureTimerTick(): void {
  if (timerTickHandle !== null) {
    return;
  }

  timerTickHandle = window.setInterval(() => {
    updateTimerUi();
  }, TIMER_TICK_MS);
}

function clearAutoStartTimer(): void {
  if (autoStartHandle !== null) {
    window.clearTimeout(autoStartHandle);
    autoStartHandle = null;
  }
}

function clearJudgeTimeout(): void {
  if (judgeTimeoutHandle !== null) {
    window.clearTimeout(judgeTimeoutHandle);
    judgeTimeoutHandle = null;
  }
}

function setFeedback(message: string, isError = false): void {
  const root = document.getElementById(OVERLAY_ID);
  const feedback = root?.querySelector<HTMLElement>("#lcsr-feedback");
  if (!feedback) {
    return;
  }

  feedback.textContent = message;
  feedback.style.color = isError ? "#f87171" : "#93c5fd";
}

function updateTimerUi(): void {
  const root = document.getElementById(OVERLAY_ID);
  const timerValue = root?.querySelector<HTMLElement>("#lcsr-timer-value");
  const goalValue = root?.querySelector<HTMLElement>("#lcsr-goal-value");
  const timerHint = root?.querySelector<HTMLElement>("#lcsr-timer-hint");
  const startBtn = root?.querySelector<HTMLButtonElement>("#lcsr-timer-start");
  const pauseBtn = root?.querySelector<HTMLButtonElement>("#lcsr-timer-pause");
  const resetBtn = root?.querySelector<HTMLButtonElement>("#lcsr-timer-reset");

  if (!timerValue || !goalValue || !timerHint || !startBtn || !pauseBtn || !resetBtn) {
    return;
  }

  const elapsedMs = getElapsedMs();
  const remainingMs = timerGoalMs - elapsedMs;

  goalValue.textContent = formatClock(timerGoalMs);
  timerValue.textContent = remainingMs >= 0 ? formatClock(remainingMs) : `-${formatClock(-remainingMs)}`;
  timerValue.style.color = remainingMs >= 0 ? "#38bdf8" : "#f87171";

  if (awaitingJudgeResult) {
    timerHint.textContent = "Waiting for judge result...";
  } else if (autoStartHandle !== null && !isTimerRunning() && elapsedMs <= 0) {
    timerHint.textContent = "Opened from extension. Timer auto-starts in 5 seconds.";
  } else if (isTimerRunning()) {
    timerHint.textContent =
      remainingMs >= 0
        ? "Timer running. Submit and get Accepted before the goal."
        : "Over goal. Accepted still counts, but mastery requires under-goal solve.";
  } else if (elapsedMs > 0) {
    timerHint.textContent = "Timer paused. Resume or reset before your next submit.";
  } else {
    timerHint.textContent = "Start timer, submit, and get Accepted to log timed review.";
  }

  startBtn.disabled = isTimerRunning();
  pauseBtn.disabled = !isTimerRunning();
  resetBtn.disabled = !isTimerRunning() && elapsedMs <= 0;
}

function startTimer(showFeedback = true): void {
  clearAutoStartTimer();
  if (isTimerRunning()) {
    return;
  }

  timerStartedAtMs = Date.now();
  ensureTimerTick();
  updateTimerUi();

  if (showFeedback) {
    setFeedback("Timer started. Submit and get Accepted to log a timed review.");
  }
}

function pauseTimer(showFeedback = false): void {
  if (!isTimerRunning() || timerStartedAtMs === null) {
    return;
  }

  pausedElapsedMs += Date.now() - timerStartedAtMs;
  timerStartedAtMs = null;
  clearTimerTick();
  updateTimerUi();

  if (showFeedback) {
    setFeedback("Timer paused.");
  }
}

function resetTimer(showFeedback = false): void {
  timerStartedAtMs = null;
  pausedElapsedMs = 0;
  awaitingJudgeResult = false;
  clearJudgeTimeout();
  clearTimerTick();
  updateTimerUi();

  if (showFeedback) {
    setFeedback("Timer reset.");
  }
}

function resetRuntimeStateForNavigation(): void {
  clearAutoStartTimer();
  clearJudgeTimeout();
  clearTimerTick();
  timerStartedAtMs = null;
  pausedElapsedMs = 0;
  awaitingJudgeResult = false;
  latestSubmitAtMs = 0;
  draftContextSlug = "";
}

function scheduleAutoStartTimer(): void {
  clearAutoStartTimer();
  autoStartHandle = window.setTimeout(() => {
    autoStartHandle = null;
    if (!activeSlug || isTimerRunning() || getElapsedMs() > 0) {
      updateTimerUi();
      return;
    }

    startTimer(false);
    setFeedback("Timer auto-started. Submit and get Accepted to log this run.");
  }, AUTO_START_DELAY_MS);

  updateTimerUi();
  setFeedback("Opened from extension. Timer will auto-start in 5 seconds.");
}

function modeBadge(state: StudyState | null): string {
  return state?.reviewCount ? "REPEAT_REVIEW" : "FIRST_SOLVE";
}

function renderRatingButton(rating: Rating, label: string): string {
  const active = selectedRating === rating;
  return `
    <button
      data-rating="${rating}"
      style="
        min-height:64px;
        border-radius:4px;
        border:${active ? "1px solid #ffa116" : "1px solid rgba(161,141,122,0.12)"};
        background:${active ? "rgba(255,161,22,0.18)" : "rgba(255,255,255,0.04)"};
        color:${active ? "#ffc78b" : "#e5e2e1"};
        display:grid;
        gap:4px;
        place-items:center;
        font-weight:700;
        text-transform:uppercase;
        letter-spacing:0.08em;
        cursor:pointer;
      "
    >
      <span>${label}</span>
      <span style="font-size:10px;color:${active ? "#ffc78b" : "#8f857d"};">${
        rating === 0 ? "<1m" : rating === 1 ? "2d" : rating === 2 ? "4d" : "7d"
      }</span>
    </button>
  `;
}

function renderCollapsedOverlay(title: string, state: StudyState | null): string {
  return `
    <style>
      #${OVERLAY_ID} * { box-sizing: border-box; }
      #${OVERLAY_ID} button { font: inherit; }
    </style>
    <section
      style="
        min-width:320px;
        border-radius:6px;
        background:rgba(19,19,19,0.9);
        color:#e5e2e1;
        box-shadow:0 24px 64px rgba(0,0,0,0.45);
        backdrop-filter:blur(14px);
        overflow:hidden;
        border:1px solid rgba(161,141,122,0.18);
      "
    >
      <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-bottom:1px solid rgba(161,141,122,0.08);">
        <div style="font-family:'Space Grotesk','Segoe UI',sans-serif;font-weight:700;letter-spacing:0.08em;color:#ffa116;">TRACKING_SOLVE</div>
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#8f857d;">${escapeHtml(
            state?.status ?? "ACTIVE"
          )}</span>
          <button id="lcsr-expand-chip" style="width:28px;height:28px;border-radius:4px;background:rgba(255,161,22,0.1);color:#ffc78b;border:0;cursor:pointer;">▢</button>
        </div>
      </div>
      <div style="display:grid;gap:6px;padding:12px 14px;">
        <div style="font-size:20px;font-weight:700;letter-spacing:-0.03em;">${escapeHtml(title)}</div>
        <div style="display:flex;justify-content:space-between;gap:8px;color:#a99f96;">
          <span>${escapeHtml(currentDifficulty)}</span>
          <span>${formatClock(timerGoalMs)}</span>
        </div>
      </div>
    </section>
  `;
}

function renderOverlay(slug: string, title: string, state: StudyState | null, solvedDetected: boolean): void {
  const root = ensureOverlay();
  currentState = state;
  currentTitle = title;
  if (draftContextSlug !== slug) {
    draftNotes = state?.notes ?? "";
    selectedRating = (state?.lastRating ?? 2) as Rating;
    draftContextSlug = slug;
  }

  const status = state?.status ?? "NEW";
  const nextReview = state?.nextReviewAt ? formatDate(state.nextReviewAt) : "Not scheduled";
  const saveButtonLabel = state?.reviewCount ? "Save Review" : "Save First Solve";

  if (overlayCollapsed) {
    root.innerHTML = renderCollapsedOverlay(title, state);
    const expand = root.querySelector<HTMLButtonElement>("#lcsr-expand-chip");
    if (expand) {
      expand.onclick = () => {
        overlayCollapsed = false;
        renderOverlay(slug, title, state, solvedDetected);
      };
    }
    return;
  }

  root.innerHTML = `
    <style>
      #${OVERLAY_ID} * { box-sizing: border-box; }
      #${OVERLAY_ID} button,
      #${OVERLAY_ID} select,
      #${OVERLAY_ID} textarea {
        font: inherit;
      }
      #${OVERLAY_ID} textarea::placeholder {
        color: #6f6761;
      }
    </style>
    <section
      style="
        width:360px;
        border-radius:6px;
        background:rgba(19,19,19,0.92);
        color:#e5e2e1;
        box-shadow:0 24px 64px rgba(0,0,0,0.45);
        backdrop-filter:blur(14px);
        overflow:hidden;
        border:1px solid rgba(161,141,122,0.18);
      "
    >
      <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-bottom:1px solid rgba(161,141,122,0.08);background:rgba(0,0,0,0.18);">
        <div style="font-family:'Space Grotesk','Segoe UI',sans-serif;font-weight:700;letter-spacing:0.08em;color:#ffa116;">KINETIC_TERMINAL</div>
        <div style="display:flex;align-items:center;gap:8px;">
          <button id="lcsr-open-settings" style="width:28px;height:28px;border-radius:4px;background:rgba(255,255,255,0.04);color:#a99f96;border:0;cursor:pointer;">⚙</button>
          <button id="lcsr-collapse" style="width:28px;height:28px;border-radius:4px;background:rgba(255,255,255,0.04);color:#a99f96;border:0;cursor:pointer;">▁</button>
        </div>
      </div>
      <div style="display:grid;gap:16px;padding:14px;">
        <section style="display:grid;gap:8px;">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;">
            <div>
              <h1 style="margin:0;font-family:'Space Grotesk','Segoe UI',sans-serif;font-size:30px;line-height:0.95;letter-spacing:-0.04em;">${escapeHtml(
                title
              )}</h1>
              <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap;">
                <span style="padding:4px 8px;border-radius:999px;background:rgba(255,161,22,0.16);color:#ffc78b;font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;">${modeBadge(
                  state
                )}</span>
                <span style="padding:4px 8px;border-radius:999px;background:${statusColor(status)}22;color:${statusColor(
                  status
                )};font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;">${status}</span>
              </div>
            </div>
            <div style="display:grid;gap:8px;justify-items:end;">
              <span style="padding:6px 10px;border-radius:4px;background:rgba(255,255,255,0.05);font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#ffc78b;">${escapeHtml(
                currentDifficulty
              )}</span>
              <span style="color:#a99f96;font-size:11px;">Next: ${escapeHtml(nextReview)}</span>
            </div>
          </div>
          <div style="color:#8f857d;font-size:12px;">Solved detected: ${solvedDetected ? "Yes" : "No"} · ${state?.lastReviewedAt ? `Last reviewed ${escapeHtml(
            formatDate(state.lastReviewedAt)
          )}` : "Awaiting first logged solve."}</div>
        </section>

        <section style="display:grid;gap:10px;padding:14px;border-radius:4px;background:rgba(255,255,255,0.03);box-shadow:inset 0 0 0 1px rgba(161,141,122,0.08);">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
            <span style="font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#a99f96;">Timer Goal</span>
            <strong id="lcsr-goal-value" style="color:#e5e2e1;">${formatClock(timerGoalMs)}</strong>
          </div>
          <div id="lcsr-timer-value" style="font-family:'Space Grotesk','Segoe UI',sans-serif;font-size:28px;font-weight:700;color:#94dbff;">${formatClock(
            timerGoalMs
          )}</div>
          <div id="lcsr-timer-hint" style="font-size:12px;color:#8f857d;">Start timer, submit, and get Accepted to log a timed review.</div>
          <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;">
            <button id="lcsr-timer-start" style="min-height:34px;border-radius:4px;background:#ffc78b;color:#2b1700;border:0;font-weight:700;cursor:pointer;">Start</button>
            <button id="lcsr-timer-pause" style="min-height:34px;border-radius:4px;background:rgba(255,255,255,0.05);color:#e5e2e1;border:0;cursor:pointer;">Pause</button>
            <button id="lcsr-timer-reset" style="min-height:34px;border-radius:4px;background:rgba(255,255,255,0.05);color:#e5e2e1;border:0;cursor:pointer;">Reset</button>
          </div>
        </section>

        <section style="display:grid;gap:10px;">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
            <span style="font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#a99f96;">Recalibration Protocol</span>
            <select id="lcsr-mode" style="min-height:34px;padding:0 10px;border-radius:4px;border:0;background:rgba(255,255,255,0.05);color:#e5e2e1;">
              <option value="FULL_SOLVE">Full solve</option>
              <option value="RECALL">Recall mode</option>
            </select>
          </div>
          <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;">
            ${renderRatingButton(0, "Again")}
            ${renderRatingButton(1, "Hard")}
            ${renderRatingButton(2, "Good")}
            ${renderRatingButton(3, "Easy")}
          </div>
        </section>

        <section style="display:grid;gap:8px;">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
            <span style="font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#a99f96;">Technical Notes</span>
            <span style="color:#94dbff;font-size:11px;">Optional</span>
          </div>
          <textarea id="lcsr-notes" rows="5" style="width:100%;padding:12px;border-radius:4px;border:0;background:rgba(255,255,255,0.04);color:#e5e2e1;resize:vertical;">${escapeHtml(
            draftNotes
          )}</textarea>
        </section>

        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
          <button id="lcsr-refresh-btn" style="min-height:36px;padding:0 14px;border-radius:4px;background:rgba(255,255,255,0.05);color:#a99f96;border:0;cursor:pointer;">Refresh</button>
          <button id="lcsr-save-review" style="min-height:42px;padding:0 18px;border-radius:4px;background:linear-gradient(180deg,#ffc78b,#ffa116);color:#2b1700;border:0;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;cursor:pointer;">${saveButtonLabel}</button>
        </div>

        <div id="lcsr-feedback" style="min-height:18px;color:#8f857d;font-size:12px;">${state?.lastReviewedAt ? `Last reviewed: ${escapeHtml(
          formatDate(state.lastReviewedAt)
        )}` : "Submit Accepted under the goal to progress toward mastery."}</div>
      </div>
    </section>
  `;

  root.querySelectorAll<HTMLButtonElement>("[data-rating]").forEach((button) => {
    button.onclick = () => {
      selectedRating = Number(button.dataset.rating) as Rating;
      renderOverlay(slug, title, state, solvedDetected);
    };
  });

  const collapseButton = root.querySelector<HTMLButtonElement>("#lcsr-collapse");
  if (collapseButton) {
    collapseButton.onclick = () => {
      overlayCollapsed = true;
      renderOverlay(slug, title, state, solvedDetected);
    };
  }

  const settingsButton = root.querySelector<HTMLButtonElement>("#lcsr-open-settings");
  if (settingsButton) {
    settingsButton.onclick = () => {
      chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html?view=settings") });
    };
  }

  const notesField = root.querySelector<HTMLTextAreaElement>("#lcsr-notes");
  if (notesField) {
    notesField.value = draftNotes;
    notesField.oninput = () => {
      draftNotes = notesField.value;
    };
  }

  const modeSelect = root.querySelector<HTMLSelectElement>("#lcsr-mode");
  if (modeSelect) {
    modeSelect.value = state?.reviewCount ? "RECALL" : "FULL_SOLVE";
  }

  const refreshButton = root.querySelector<HTMLButtonElement>("#lcsr-refresh-btn");
  if (refreshButton) {
    refreshButton.onclick = () => {
      void refreshCurrentPage();
    };
  }

  const saveButton = root.querySelector<HTMLButtonElement>("#lcsr-save-review");
  if (saveButton) {
    saveButton.onclick = () => {
      void onSaveReview(slug);
    };
  }

  const startButton = root.querySelector<HTMLButtonElement>("#lcsr-timer-start");
  if (startButton) {
    startButton.onclick = () => {
      startTimer(true);
    };
  }

  const pauseButton = root.querySelector<HTMLButtonElement>("#lcsr-timer-pause");
  if (pauseButton) {
    pauseButton.onclick = () => {
      pauseTimer(true);
    };
  }

  const resetButton = root.querySelector<HTMLButtonElement>("#lcsr-timer-reset");
  if (resetButton) {
    resetButton.onclick = () => {
      resetTimer(true);
    };
  }

  updateTimerUi();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getMode(): "RECALL" | "FULL_SOLVE" {
  const root = document.getElementById(OVERLAY_ID);
  const select = root?.querySelector<HTMLSelectElement>("#lcsr-mode");
  return select?.value === "RECALL" ? "RECALL" : "FULL_SOLVE";
}

async function onSaveReview(slug: string): Promise<void> {
  setFeedback("Saving review...");
  const elapsedMs = getElapsedMs();
  const solveTimeMs = elapsedMs > 0 ? elapsedMs : undefined;

  const response = await sendMessage("SAVE_REVIEW_RESULT", {
    slug,
    rating: selectedRating,
    mode: getMode(),
    solveTimeMs,
    notes: draftNotes,
    source: "overlay"
  });

  if (!response.ok) {
    setFeedback(response.error ?? "Failed to save rating.", true);
    return;
  }

  setFeedback("Saved. Recomputing status...");
  await refreshCurrentPage();
}

function onSubmitDetected(): void {
  if (!activeSlug) {
    return;
  }

  if (!isTimerRunning() && getElapsedMs() <= 0) {
    setFeedback("Submit detected. Start timer before submitting to track timed mastery.");
    return;
  }

  awaitingJudgeResult = true;
  latestSubmitAtMs = Date.now();
  clearJudgeTimeout();
  judgeTimeoutHandle = window.setTimeout(() => {
    judgeTimeoutHandle = null;
    if (!awaitingJudgeResult) {
      return;
    }
    awaitingJudgeResult = false;
    updateTimerUi();
    setFeedback("No judge result detected yet. Submit again after timer is running.", true);
  }, JUDGE_TIMEOUT_MS);

  updateTimerUi();
  setFeedback("Submission detected. Waiting for judge result...");
}

function isSubmitControl(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }

  const control = target.closest("button,[role='button']");
  if (!control) {
    return false;
  }

  const label = `${control.textContent ?? ""} ${control.getAttribute("aria-label") ?? ""} ${
    control.getAttribute("data-e2e-locator") ?? ""
  }`
    .trim()
    .toLowerCase();

  return /\bsubmit\b/.test(label);
}

function extractVerdictFromText(raw: string): "accepted" | "failed" | null {
  const text = raw.toLowerCase().trim();
  if (!text) {
    return null;
  }

  const hasFailure = SUBMISSION_FAIL_TOKENS.some((token) => text.includes(token));
  if (hasFailure) {
    return "failed";
  }

  if (text.includes("accepted solutions")) {
    return null;
  }

  if (/\baccepted\b/.test(text)) {
    return "accepted";
  }

  return null;
}

function detectVerdictFromMutations(mutations: MutationRecord[]): "accepted" | "failed" | null {
  for (const mutation of mutations) {
    const snippets: string[] = [];

    if (mutation.target?.textContent) {
      snippets.push(mutation.target.textContent.slice(0, 500));
    }

    for (const node of Array.from(mutation.addedNodes)) {
      if (node.textContent) {
        snippets.push(node.textContent.slice(0, 500));
      }
    }

    for (const snippet of snippets) {
      const verdict = extractVerdictFromText(snippet);
      if (verdict) {
        return verdict;
      }
    }
  }

  return null;
}

async function onAcceptedDetected(): Promise<void> {
  if (!awaitingJudgeResult) {
    return;
  }

  awaitingJudgeResult = false;
  clearJudgeTimeout();

  if (!isTimerRunning() && getElapsedMs() <= 0) {
    updateTimerUi();
    setFeedback("Accepted detected, but timer was not running. Start timer before submitting.", true);
    return;
  }

  if (isTimerRunning()) {
    pauseTimer(false);
  }

  const elapsedMs = getElapsedMs();
  const withinGoal = elapsedMs <= timerGoalMs;
  const rating: 0 | 1 | 2 | 3 = withinGoal ? 3 : 2;
  selectedRating = rating;

  setFeedback("Accepted detected. Logging timed review...");

  const response = await sendMessage("SAVE_REVIEW_RESULT", {
    slug: activeSlug,
    rating,
    mode: getMode(),
    solveTimeMs: elapsedMs,
    notes: draftNotes,
    source: "overlay"
  });

  if (!response.ok) {
    setFeedback(response.error ?? "Failed to save accepted attempt.", true);
    updateTimerUi();
    return;
  }

  const elapsedClock = formatClock(elapsedMs);
  const goalClock = formatClock(timerGoalMs);
  if (withinGoal) {
    setFeedback(`Accepted in ${elapsedClock} (goal ${goalClock}). Logged as Easy.`);
  } else {
    setFeedback(
      `Accepted in ${elapsedClock}, over goal ${goalClock}. Logged as Good. Mastery requires under-goal Accepted runs.`
    );
  }

  resetTimer(false);
  await refreshCurrentPage();
}

function onFailedDetected(): void {
  if (!awaitingJudgeResult) {
    return;
  }

  awaitingJudgeResult = false;
  clearJudgeTimeout();
  updateTimerUi();
  setFeedback("Submission result was not Accepted. Keep going.", true);
}

async function refreshCurrentPage(): Promise<void> {
  const slug = getProblemSlugFromUrl();
  if (!slug) {
    return;
  }

  const title = detectTitle(slug);
  const detectedDifficulty = detectDifficulty();
  const solvedDetected = detectSolvedState();

  const upsert = await sendMessage("UPSERT_PROBLEM_FROM_PAGE", {
    slug,
    title,
    difficulty: detectedDifficulty,
    url: `https://leetcode.com/problems/${slug}/`,
    solvedDetected
  });

  if (!upsert.ok) {
    setFeedback(upsert.error ?? "Failed to sync problem.", true);
    return;
  }

  const context = await sendMessage("GET_PROBLEM_CONTEXT", { slug });
  if (!context.ok) {
    setFeedback(context.error ?? "Failed to fetch context.", true);
    return;
  }

  const payload = (context.data as {
    problem: { title: string; difficulty?: Difficulty } | null;
    studyState: StudyState | null;
  }) ?? { problem: null, studyState: null };

  currentDifficulty = payload.problem?.difficulty ?? detectedDifficulty;
  timerGoalMs = difficultyGoalMs(currentDifficulty);

  renderOverlay(slug, payload.problem?.title ?? title, payload.studyState ?? null, solvedDetected);
}

async function maybeScheduleAutoStart(slug: string): Promise<void> {
  const response = await sendMessage("CONSUME_AUTO_TIMER_START", { slug });
  if (!response.ok) {
    return;
  }

  const autoStart = Boolean((response.data as { autoStart?: boolean } | undefined)?.autoStart);
  if (autoStart) {
    scheduleAutoStartTimer();
  }
}

async function bootstrap(): Promise<void> {
  const slug = getProblemSlugFromUrl();
  if (!slug) {
    const existing = document.getElementById(OVERLAY_ID);
    if (existing) {
      existing.remove();
    }

    activeSlug = "";
    currentState = null;
    currentTitle = "";
    currentDifficulty = "Unknown";
    timerGoalMs = difficultyGoalMs("Unknown");
    resetRuntimeStateForNavigation();
    return;
  }

  if (slug === activeSlug) {
    return;
  }

  resetRuntimeStateForNavigation();
  activeSlug = slug;
  currentTitle = "";

  await refreshCurrentPage();
  await maybeScheduleAutoStart(slug);
}

let lastHref = window.location.href;

void bootstrap();

document.addEventListener(
  "click",
  (event) => {
    if (activeSlug && isSubmitControl(event.target)) {
      onSubmitDetected();
    }
  },
  true
);

document.addEventListener(
  "keydown",
  (event) => {
    if (!activeSlug) {
      return;
    }

    const keyboardSubmit = event.key === "Enter" && (event.metaKey || event.ctrlKey);
    if (keyboardSubmit) {
      onSubmitDetected();
    }
  },
  true
);

setInterval(() => {
  if (window.location.href !== lastHref) {
    lastHref = window.location.href;
    void bootstrap();
  }
}, 1000);

const observer = new MutationObserver((mutations) => {
  const slug = getProblemSlugFromUrl();

  if (slug && slug === activeSlug && !currentTitle) {
    void refreshCurrentPage();
  }

  if (!slug || slug !== activeSlug || !awaitingJudgeResult) {
    return;
  }

  if (Date.now() - latestSubmitAtMs < 800) {
    return;
  }

  const verdict = detectVerdictFromMutations(mutations);
  if (verdict === "accepted") {
    void onAcceptedDetected();
    return;
  }

  if (verdict === "failed") {
    onFailedDetected();
  }
});

observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
