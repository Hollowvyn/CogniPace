import { sendMessage } from "./shared/runtime";
import { getStudyPhaseLabel, getStudyStateSummary } from "./shared/studyState";
import { Difficulty, Rating, ReviewMode, StudyState } from "./shared/types";
import {
  difficultyGoalMs,
  formatClock,
  normalizeSlug,
  parseDifficulty,
  slugToTitle,
} from "./shared/utils";

const OVERLAY_ID = "lcsr-overlay-root";
const TIMER_TICK_MS = 250;

let activeSlug = "";
let currentState: StudyState | null = null;
let currentDifficulty: Difficulty = "Unknown";
let timerGoalMs = difficultyGoalMs("Unknown");

let timerStartedAtMs: number | null = null;
let pausedElapsedMs = 0;
let timerTickHandle: number | null = null;
let overlayCollapsed = true;
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

function ensureOverlay(): HTMLElement {
  const existing = document.getElementById(OVERLAY_ID);
  if (existing) {
    return existing;
  }

  const root = document.createElement("div");
  root.id = OVERLAY_ID;
  root.style.position = "fixed";
  root.style.right = "20px";
  root.style.bottom = "10px";
  root.style.zIndex = "2147483647";
  root.style.maxWidth = "340px";
  root.style.fontFamily = '"Inter", "Segoe UI", sans-serif';
  root.style.fontSize = "12px";
  root.style.lineHeight = "1.45";
  document.body.appendChild(root);
  return root;
}

function statusColor(
  phase: ReturnType<typeof getStudyStateSummary>["phase"] | undefined
): string {
  switch (phase) {
    case "Review":
      return "#38bdf8";
    case "Learning":
    case "Relearning":
      return "#f59e0b";
    case "Suspended":
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

  return date.toLocaleDateString();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
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

function setFeedback(message: string, isError = false): void {
  const feedback = document
    .getElementById(OVERLAY_ID)
    ?.querySelector<HTMLElement>("#lcsr-feedback");
  if (!feedback) {
    return;
  }

  feedback.textContent = message;
  feedback.style.color = isError ? "#f87171" : "#8f857d";
}

function defaultMode(state: StudyState | null = currentState): ReviewMode {
  return getStudyStateSummary(state).reviewCount > 0 ? "RECALL" : "FULL_SOLVE";
}

function deriveQuickRating(elapsedMs?: number): Rating {
  if (!elapsedMs || elapsedMs <= 0) {
    return 2;
  }

  if (elapsedMs <= timerGoalMs) {
    return 2;
  }

  if (elapsedMs <= timerGoalMs * 1.5) {
    return 1;
  }

  return 0;
}

function ratingLabel(rating: Rating): string {
  switch (rating) {
    case 0:
      return "Again";
    case 1:
      return "Hard";
    case 2:
      return "Good";
    default:
      return "Easy";
  }
}

function timerHintCopy(elapsedMs: number): string {
  if (isTimerRunning()) {
    return "Timer running. Submit logs with the conservative protocol unless you open details and override it.";
  }

  if (elapsedMs > 0) {
    const quickRating = deriveQuickRating(elapsedMs);
    return `Paused at ${formatClock(elapsedMs)}. Quick submit will log ${ratingLabel(quickRating)} based on that run.`;
  }

  return "Quick submit logs Good by default. Start the timer if you want solve time to drive the default rating.";
}

function updateTimerUi(): void {
  const root = document.getElementById(OVERLAY_ID);
  const timerValue = root?.querySelector<HTMLElement>("#lcsr-timer-value");
  const goalValue = root?.querySelector<HTMLElement>("#lcsr-goal-value");
  const timerHint = root?.querySelector<HTMLElement>("#lcsr-timer-hint");
  const quickRating = root?.querySelector<HTMLElement>("#lcsr-quick-rating");
  const startBtn = root?.querySelector<HTMLButtonElement>("#lcsr-timer-start");
  const pauseBtn = root?.querySelector<HTMLButtonElement>("#lcsr-timer-pause");
  const resetBtn = root?.querySelector<HTMLButtonElement>("#lcsr-timer-reset");

  if (
    !timerValue ||
    !goalValue ||
    !timerHint ||
    !startBtn ||
    !pauseBtn ||
    !resetBtn
  ) {
    return;
  }

  const elapsedMs = getElapsedMs();
  const withinGoal = elapsedMs <= timerGoalMs || elapsedMs <= 0;

  goalValue.textContent = `Goal ${formatClock(timerGoalMs)}`;
  timerValue.textContent = formatClock(elapsedMs);
  timerValue.style.color =
    elapsedMs <= 0 ? "#e5e2e1" : withinGoal ? "#94dbff" : "#f87171";
  timerHint.textContent = timerHintCopy(elapsedMs);

  if (quickRating) {
    quickRating.textContent = `Default ${ratingLabel(deriveQuickRating(elapsedMs))}`;
  }

  startBtn.disabled = isTimerRunning();
  pauseBtn.disabled = !isTimerRunning();
  resetBtn.disabled = !isTimerRunning() && elapsedMs <= 0;
}

function startTimer(showFeedback = true): void {
  if (isTimerRunning()) {
    return;
  }

  timerStartedAtMs = Date.now();
  ensureTimerTick();
  updateTimerUi();

  if (showFeedback) {
    setFeedback("Timer started.");
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
  clearTimerTick();
  updateTimerUi();

  if (showFeedback) {
    setFeedback("Timer reset.");
  }
}

function resetRuntimeStateForNavigation(): void {
  clearTimerTick();
  timerStartedAtMs = null;
  pausedElapsedMs = 0;
  draftContextSlug = "";
}

function modeBadge(state: StudyState | null): string {
  return getStudyStateSummary(state).reviewCount > 0
    ? "REPEAT_REVIEW"
    : "FIRST_SOLVE";
}

function renderRatingButton(rating: Rating, label: string): string {
  const active = selectedRating === rating;
  return `
    <button
      data-rating="${rating}"
      style="
        min-height:58px;
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
        rating === 0
          ? "Reset"
          : rating === 1
            ? "Lagging"
            : rating === 2
              ? "Stable"
              : "Fast"
      }</span>
    </button>
  `;
}

function renderCollapsedOverlay(
  title: string,
  state: StudyState | null
): string {
  const studyStateSummary = getStudyStateSummary(state);
  const phaseLabel = getStudyPhaseLabel(studyStateSummary.phase);
  return `
    <style>
      #${OVERLAY_ID} * { box-sizing: border-box; }
      #${OVERLAY_ID} button { font: inherit; }
    </style>
    <section
      style="
        width:332px;
        border-radius:6px;
        background:rgba(19,19,19,0.92);
        color:#e5e2e1;
        box-shadow:0 24px 64px rgba(0,0,0,0.45);
        backdrop-filter:blur(14px);
        overflow:hidden;
        border:1px solid rgba(161,141,122,0.18);
      "
    >
      <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-bottom:1px solid rgba(161,141,122,0.08);background:rgba(0,0,0,0.18);">
        <div style="font-family:'Space Grotesk','Segoe UI',sans-serif;font-weight:700;letter-spacing:0.08em;color:#ffa116;">KINETIC_TERMINAL</div>
        <button id="lcsr-expand-chip" style="width:28px;height:28px;border-radius:4px;background:rgba(255,255,255,0.04);color:#a99f96;border:0;cursor:pointer;">▢</button>
      </div>
      <div style="display:grid;gap:10px;padding:12px;">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;">
          <div style="min-width:0;">
            <div style="font-size:18px;font-weight:700;letter-spacing:-0.03em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(
              title
            )}</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px;">
              <span style="padding:4px 8px;border-radius:999px;background:rgba(255,161,22,0.16);color:#ffc78b;font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;">${modeBadge(
                state
              )}</span>
              <span style="padding:4px 8px;border-radius:999px;background:${statusColor(
                studyStateSummary.phase
              )}22;color:${statusColor(studyStateSummary.phase)};font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;">${escapeHtml(
                phaseLabel
              )}</span>
              ${
                studyStateSummary.isDue
                  ? '<span style="padding:4px 8px;border-radius:999px;background:rgba(56,189,248,0.16);color:#94dbff;font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;">DUE NOW</span>'
                  : ""
              }
            </div>
          </div>
          <div style="padding-top:2px;color:#a99f96;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;">${escapeHtml(
            currentDifficulty
          )}</div>
        </div>

        <div style="display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:end;">
          <div style="min-width:0;">
            <div id="lcsr-timer-value" style="font-family:'Space Grotesk','Segoe UI',sans-serif;font-size:24px;font-weight:700;color:#e5e2e1;">00:00</div>
            <div id="lcsr-goal-value" style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:#8f857d;">Goal ${formatClock(
              timerGoalMs
            )}</div>
          </div>
          <button id="lcsr-quick-submit" style="min-width:98px;min-height:34px;padding:0 12px;border-radius:4px;background:linear-gradient(180deg,#ffc78b,#ffa116);color:#2b1700;border:0;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;cursor:pointer;">Submit</button>
        </div>

        <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;">
          <button id="lcsr-timer-start" style="min-height:28px;border-radius:4px;background:rgba(255,255,255,0.05);color:#e5e2e1;border:0;cursor:pointer;">Start</button>
          <button id="lcsr-timer-pause" style="min-height:28px;border-radius:4px;background:rgba(255,255,255,0.05);color:#e5e2e1;border:0;cursor:pointer;">Pause</button>
          <button id="lcsr-timer-reset" style="min-height:28px;border-radius:4px;background:rgba(255,255,255,0.05);color:#e5e2e1;border:0;cursor:pointer;">Reset</button>
        </div>

        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;color:#8f857d;font-size:11px;">
          <span id="lcsr-quick-rating">Default Good</span>
          <span>${studyStateSummary.lastReviewedAt ? `Last ${escapeHtml(formatDate(studyStateSummary.lastReviewedAt))}` : "No logged review yet"}</span>
        </div>

        <div id="lcsr-timer-hint" style="font-size:11px;color:#8f857d;">Quick submit logs Good by default. Start the timer if you want solve time to drive the default rating.</div>
        <div id="lcsr-feedback" style="min-height:16px;color:#8f857d;font-size:11px;">${
          studyStateSummary.nextReviewAt
            ? `Next review ${escapeHtml(
                formatDate(studyStateSummary.nextReviewAt)
              )}`
            : "Open details to adjust recalibration or add notes."
        }</div>
      </div>
    </section>
  `;
}

function renderOverlay(
  slug: string,
  title: string,
  state: StudyState | null
): void {
  const root = ensureOverlay();
  currentState = state;

  if (draftContextSlug !== slug) {
    draftNotes = state?.notes ?? "";
    selectedRating = (state?.lastRating ?? 2) as Rating;
    draftContextSlug = slug;
  }

  const studyStateSummary = getStudyStateSummary(state);
  const phaseLabel = getStudyPhaseLabel(studyStateSummary.phase);
  const nextReview = studyStateSummary.nextReviewAt
    ? formatDate(studyStateSummary.nextReviewAt)
    : "Not scheduled";
  const saveButtonLabel = studyStateSummary.reviewCount
    ? "Save Override"
    : "Save First Solve";

  if (overlayCollapsed) {
    root.innerHTML = renderCollapsedOverlay(title, state);

    const expand = root.querySelector<HTMLButtonElement>("#lcsr-expand-chip");
    if (expand) {
      expand.onclick = () => {
        overlayCollapsed = false;
        renderOverlay(slug, title, state);
      };
    }

    bindTimerButtons(slug);
    updateTimerUi();
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
                <span style="padding:4px 8px;border-radius:999px;background:${statusColor(studyStateSummary.phase)}22;color:${statusColor(
                  studyStateSummary.phase
                )};font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;">${phaseLabel}</span>
                ${
                  studyStateSummary.isDue
                    ? '<span style="padding:4px 8px;border-radius:999px;background:rgba(56,189,248,0.16);color:#94dbff;font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;">DUE NOW</span>'
                    : ""
                }
              </div>
            </div>
            <div style="display:grid;gap:8px;justify-items:end;">
              <span style="padding:6px 10px;border-radius:4px;background:rgba(255,255,255,0.05);font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#ffc78b;">${escapeHtml(
                currentDifficulty
              )}</span>
              <span style="color:#a99f96;font-size:11px;">Next: ${escapeHtml(nextReview)}</span>
            </div>
          </div>
          <div style="color:#8f857d;font-size:12px;">Quick submit is conservative: Good under goal, Hard if you drift past it, Again if the run blows through the target. Use recalibration below to override.</div>
        </section>

        <section style="display:grid;gap:10px;padding:14px;border-radius:4px;background:rgba(255,255,255,0.03);box-shadow:inset 0 0 0 1px rgba(161,141,122,0.08);">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
            <span style="font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#a99f96;">Solve Timer</span>
            <strong id="lcsr-goal-value" style="color:#e5e2e1;">Goal ${formatClock(timerGoalMs)}</strong>
          </div>
          <div id="lcsr-timer-value" style="font-family:'Space Grotesk','Segoe UI',sans-serif;font-size:28px;font-weight:700;color:#e5e2e1;">00:00</div>
          <div id="lcsr-timer-hint" style="font-size:12px;color:#8f857d;">Quick submit logs Good by default. Start the timer if you want solve time to drive the default rating.</div>
          <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;">
            <button id="lcsr-timer-start" style="min-height:34px;border-radius:4px;background:#ffc78b;color:#2b1700;border:0;font-weight:700;cursor:pointer;">Start</button>
            <button id="lcsr-timer-pause" style="min-height:34px;border-radius:4px;background:rgba(255,255,255,0.05);color:#e5e2e1;border:0;cursor:pointer;">Pause</button>
            <button id="lcsr-timer-reset" style="min-height:34px;border-radius:4px;background:rgba(255,255,255,0.05);color:#e5e2e1;border:0;cursor:pointer;">Reset</button>
          </div>
          <div id="lcsr-quick-rating" style="font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#8f857d;">Default Good</div>
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
          <div style="display:flex;gap:8px;align-items:center;">
            <button id="lcsr-quick-submit" style="min-height:40px;padding:0 14px;border-radius:4px;background:rgba(255,255,255,0.05);color:#e5e2e1;border:0;font-weight:700;cursor:pointer;">Quick Submit</button>
            <button id="lcsr-save-review" style="min-height:42px;padding:0 18px;border-radius:4px;background:linear-gradient(180deg,#ffc78b,#ffa116);color:#2b1700;border:0;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;cursor:pointer;">${saveButtonLabel}</button>
          </div>
        </div>

        <div id="lcsr-feedback" style="min-height:18px;color:#8f857d;font-size:12px;">${
          studyStateSummary.lastReviewedAt
            ? `Last reviewed: ${escapeHtml(
                formatDate(studyStateSummary.lastReviewedAt)
              )}`
            : "Quick submit logs with default protocol. Open recalibration to override the rating or mode."
        }</div>
      </div>
    </section>
  `;

  root
    .querySelectorAll<HTMLButtonElement>("[data-rating]")
    .forEach((button) => {
      button.onclick = () => {
        selectedRating = Number(button.dataset.rating) as Rating;
        renderOverlay(slug, title, state);
      };
    });

  const collapseButton =
    root.querySelector<HTMLButtonElement>("#lcsr-collapse");
  if (collapseButton) {
    collapseButton.onclick = () => {
      overlayCollapsed = true;
      renderOverlay(slug, title, state);
    };
  }

  const settingsButton = root.querySelector<HTMLButtonElement>(
    "#lcsr-open-settings"
  );
  if (settingsButton) {
    settingsButton.onclick = () => {
      void sendMessage("OPEN_EXTENSION_PAGE", {
        path: "dashboard.html?view=settings",
      });
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
    modeSelect.value = defaultMode(state);
  }

  const refreshButton =
    root.querySelector<HTMLButtonElement>("#lcsr-refresh-btn");
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

  bindTimerButtons(slug);
  updateTimerUi();
}

function bindTimerButtons(slug: string): void {
  const root = document.getElementById(OVERLAY_ID);
  const quickSubmitButton =
    root?.querySelector<HTMLButtonElement>("#lcsr-quick-submit");
  if (quickSubmitButton) {
    quickSubmitButton.onclick = () => {
      void onQuickSubmit(slug);
    };
  }

  const startButton =
    root?.querySelector<HTMLButtonElement>("#lcsr-timer-start");
  if (startButton) {
    startButton.onclick = () => {
      startTimer(true);
    };
  }

  const pauseButton =
    root?.querySelector<HTMLButtonElement>("#lcsr-timer-pause");
  if (pauseButton) {
    pauseButton.onclick = () => {
      pauseTimer(true);
    };
  }

  const resetButton =
    root?.querySelector<HTMLButtonElement>("#lcsr-timer-reset");
  if (resetButton) {
    resetButton.onclick = () => {
      resetTimer(true);
    };
  }
}

function getMode(): ReviewMode {
  const select = document
    .getElementById(OVERLAY_ID)
    ?.querySelector<HTMLSelectElement>("#lcsr-mode");
  return select?.value === "RECALL" ? "RECALL" : defaultMode();
}

async function persistReview(
  slug: string,
  rating: Rating,
  mode: ReviewMode,
  solveTimeMs?: number
): Promise<boolean> {
  const response = await sendMessage("SAVE_REVIEW_RESULT", {
    slug,
    rating,
    mode,
    solveTimeMs,
    notes: draftNotes,
    source: "overlay",
  });

  if (!response.ok) {
    setFeedback(response.error ?? "Failed to save review.", true);
    return false;
  }

  return true;
}

async function onQuickSubmit(slug: string): Promise<void> {
  setFeedback("Logging quick submit...");

  if (isTimerRunning()) {
    pauseTimer(false);
  }

  const elapsedMs = getElapsedMs();
  const solveTimeMs = elapsedMs > 0 ? elapsedMs : undefined;
  const rating = deriveQuickRating(solveTimeMs);
  selectedRating = rating;

  const saved = await persistReview(slug, rating, defaultMode(), solveTimeMs);
  if (!saved) {
    updateTimerUi();
    return;
  }

  resetTimer(false);

  if (solveTimeMs) {
    setFeedback(
      `Logged ${ratingLabel(rating)} from ${formatClock(solveTimeMs)} against a ${formatClock(timerGoalMs)} goal.`
    );
  } else {
    setFeedback(
      "Logged Good with default settings. Expand the panel if you want to override the recalibration."
    );
  }

  await refreshCurrentPage();
}

async function onSaveReview(slug: string): Promise<void> {
  setFeedback("Saving recalibration...");

  if (isTimerRunning()) {
    pauseTimer(false);
  }

  const elapsedMs = getElapsedMs();
  const solveTimeMs = elapsedMs > 0 ? elapsedMs : undefined;
  const saved = await persistReview(
    slug,
    selectedRating,
    getMode(),
    solveTimeMs
  );
  if (!saved) {
    updateTimerUi();
    return;
  }

  setFeedback("Saved. Recomputing status...");
  resetTimer(false);
  await refreshCurrentPage();
}

async function refreshCurrentPage(): Promise<void> {
  const slug = getProblemSlugFromUrl();
  if (!slug) {
    return;
  }

  const title = detectTitle(slug);
  const detectedDifficulty = detectDifficulty();

  const upsert = await sendMessage("UPSERT_PROBLEM_FROM_PAGE", {
    slug,
    title,
    difficulty: detectedDifficulty,
    url: `https://leetcode.com/problems/${slug}/`,
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

  renderOverlay(
    slug,
    payload.problem?.title ?? title,
    payload.studyState ?? null
  );
}

function scheduleWarmRefreshes(slug: string): void {
  const refreshLater = (delayMs: number) => {
    window.setTimeout(() => {
      if (activeSlug === slug) {
        void refreshCurrentPage();
      }
    }, delayMs);
  };

  refreshLater(600);
  refreshLater(1800);
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

  await refreshCurrentPage();
  scheduleWarmRefreshes(slug);
}

let lastHref = window.location.href;

void bootstrap();

setInterval(() => {
  if (window.location.href !== lastHref) {
    lastHref = window.location.href;
    void bootstrap();
  }
}, 1000);
