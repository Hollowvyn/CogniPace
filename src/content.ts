import { sendMessage } from "./shared/runtime";
import { Difficulty, StudyState } from "./shared/types";
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
  root.style.right = "16px";
  root.style.bottom = "16px";
  root.style.zIndex = "2147483647";
  root.style.maxWidth = "340px";
  root.style.background = "#0d1117";
  root.style.color = "#f8fafc";
  root.style.border = "1px solid #243244";
  root.style.borderRadius = "12px";
  root.style.boxShadow = "0 8px 30px rgba(0,0,0,0.35)";
  root.style.padding = "12px";
  root.style.fontFamily = "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
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

function renderOverlay(slug: string, title: string, state: StudyState | null, solvedDetected: boolean): void {
  const root = ensureOverlay();
  currentState = state;
  currentTitle = title;

  const status = state?.status ?? "NEW";
  const nextReview = state?.nextReviewAt ? formatDate(state.nextReviewAt) : "Not scheduled";

  root.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;">
      <strong style="font-size:13px;max-width:220px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(title)}</strong>
      <span style="padding:2px 8px;border-radius:999px;background:${statusColor(status)}22;color:${statusColor(
    status
  )};font-weight:700;">${status}</span>
    </div>
    <div style="margin-bottom:8px;color:#cbd5e1;">Next review: <strong style="color:#f8fafc;">${escapeHtml(
      nextReview
    )}</strong></div>
    <div style="margin-bottom:8px;color:#94a3b8;">Solved detected: ${solvedDetected ? "Yes" : "No"}</div>

    <div style="margin-bottom:8px;border:1px solid #334155;border-radius:8px;padding:8px;background:#0b1220;">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:4px;">
        <span style="color:#cbd5e1;">Timer goal (${escapeHtml(currentDifficulty)})</span>
        <strong id="lcsr-goal-value" style="color:#f8fafc;">${formatClock(timerGoalMs)}</strong>
      </div>
      <div id="lcsr-timer-value" style="font-size:20px;font-weight:700;color:#38bdf8;margin-bottom:6px;">${formatClock(
        timerGoalMs
      )}</div>
      <div id="lcsr-timer-hint" style="font-size:11px;color:#94a3b8;margin-bottom:6px;">Start timer, submit, and get Accepted to log timed review.</div>
      <div style="display:flex;gap:6px;">
        <button id="lcsr-timer-start" style="flex:1;background:#0ea5e9;color:#fff;border:0;border-radius:6px;padding:6px 8px;cursor:pointer;font-weight:700;">Start</button>
        <button id="lcsr-timer-pause" style="flex:1;background:#334155;color:#fff;border:0;border-radius:6px;padding:6px 8px;cursor:pointer;font-weight:700;">Pause</button>
        <button id="lcsr-timer-reset" style="flex:1;background:#111827;color:#e2e8f0;border:1px solid #334155;border-radius:6px;padding:6px 8px;cursor:pointer;font-weight:700;">Reset</button>
      </div>
    </div>

    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;">
      ${buttonHtml(0, "Again", "#ef4444")}
      ${buttonHtml(1, "Hard", "#f97316")}
      ${buttonHtml(2, "Good", "#22c55e")}
      ${buttonHtml(3, "Easy", "#0ea5e9")}
    </div>
    <div style="display:flex;gap:6px;margin-bottom:8px;align-items:center;">
      <select id="lcsr-mode" style="flex:1;background:#111827;border:1px solid #334155;border-radius:6px;color:#f8fafc;padding:4px;">
        <option value="FULL_SOLVE">Full solve</option>
        <option value="RECALL">Recall mode</option>
      </select>
    </div>
    <div style="display:flex;gap:6px;margin-bottom:8px;">
      <button id="lcsr-note-btn" style="flex:1;background:#1d4ed8;color:#fff;border:0;border-radius:6px;padding:6px 8px;cursor:pointer;">Add note</button>
      <button id="lcsr-refresh-btn" style="background:#0f172a;color:#e2e8f0;border:1px solid #334155;border-radius:6px;padding:6px 8px;cursor:pointer;">Refresh</button>
    </div>
    <div id="lcsr-feedback" style="min-height:16px;color:#94a3b8;">${state?.lastReviewedAt ? `Last reviewed: ${escapeHtml(
      formatDate(state.lastReviewedAt)
    )}` : "Submit Accepted under the goal to progress toward mastery."}</div>
  `;

  root.querySelectorAll<HTMLButtonElement>("[data-rating]").forEach((button) => {
    button.onclick = () => {
      const rating = Number(button.dataset.rating) as 0 | 1 | 2 | 3;
      void onRate(slug, rating);
    };
  });

  const noteButton = root.querySelector<HTMLButtonElement>("#lcsr-note-btn");
  if (noteButton) {
    noteButton.onclick = () => {
      void onAddNote(slug);
    };
  }

  const refreshButton = root.querySelector<HTMLButtonElement>("#lcsr-refresh-btn");
  if (refreshButton) {
    refreshButton.onclick = () => {
      void refreshCurrentPage();
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

function buttonHtml(rating: number, label: string, color: string): string {
  return `<button data-rating="${rating}" style="flex:1;background:${color};color:#fff;border:0;border-radius:6px;padding:6px 8px;cursor:pointer;font-weight:700;">${label}</button>`;
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

async function onRate(slug: string, rating: 0 | 1 | 2 | 3): Promise<void> {
  setFeedback("Saving review...");
  const elapsedMs = getElapsedMs();
  const solveTimeMs = elapsedMs > 0 ? elapsedMs : undefined;

  const response = await sendMessage("RATE_PROBLEM", {
    slug,
    rating,
    mode: getMode(),
    solveTimeMs,
    notesSnapshot: currentState?.notes
  });

  if (!response.ok) {
    setFeedback(response.error ?? "Failed to save rating.", true);
    return;
  }

  setFeedback("Saved. Recomputing status...");
  await refreshCurrentPage();
}

async function onAddNote(slug: string): Promise<void> {
  const initial = currentState?.notes ?? "";
  const notes = window.prompt("Add/update note for this problem", initial);
  if (notes === null) {
    return;
  }

  const response = await sendMessage("UPDATE_NOTES", {
    slug,
    notes
  });

  if (!response.ok) {
    setFeedback(response.error ?? "Failed to save note.", true);
    return;
  }

  setFeedback("Note saved.");
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

  setFeedback("Accepted detected. Logging timed review...");

  const response = await sendMessage("RATE_PROBLEM", {
    slug: activeSlug,
    rating,
    mode: getMode(),
    solveTimeMs: elapsedMs,
    notesSnapshot: currentState?.notes
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
