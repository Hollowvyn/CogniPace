import { sendMessage } from "../shared/runtime";
import { getStudyPhaseLabel } from "../shared/studyState";
import { AppShellPayload, CourseQuestionView, RecommendedProblemView } from "../shared/types";

let payload: AppShellPayload | null = null;
let recommendedIndex = 0;
let statusMessage = "";
let statusIsError = false;

function byId<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) {
    throw new Error(`Missing element: ${id}`);
  }
  return node as T;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function difficultyBadge(difficulty: string): string {
  if (difficulty === "Easy") {
    return "kt-pill kt-pill-blue";
  }
  if (difficulty === "Hard") {
    return "kt-pill kt-pill-danger";
  }
  return "kt-pill kt-pill-accent";
}

function reasonBadge(reason: RecommendedProblemView["reason"]): string {
  if (reason === "Overdue") {
    return "kt-pill kt-pill-danger";
  }
  if (reason === "Review focus") {
    return "kt-pill kt-pill-blue";
  }
  return "kt-pill kt-pill-accent";
}

function formatReviewDate(iso?: string): string {
  if (!iso) {
    return "Not scheduled";
  }

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "Not scheduled";
  }

  return date.toLocaleDateString();
}

function currentRecommended(): RecommendedProblemView | null {
  if (!payload) {
    return null;
  }

  const candidates = payload.popup.recommendedCandidates;
  if (candidates.length === 0) {
    return payload.popup.recommended;
  }

  return candidates[recommendedIndex % candidates.length] ?? candidates[0];
}

function recommendedCard(view: RecommendedProblemView | null): string {
  if (!view) {
    return `
      <section class="kt-card kt-popup-card">
        <div class="kt-card-stack">
          <div class="kt-card-header">
            <div>
              <p class="kt-section-label">Recommended Now</p>
              <h2 class="kt-card-title">Queue clear</h2>
            </div>
          </div>
          <p class="kt-card-copy">No due reviews are waiting right now. Open the dashboard to keep momentum with your active course.</p>
        </div>
      </section>
    `;
  }

  return `
    <section class="kt-card kt-popup-card">
      <div class="kt-card-stack">
        <div class="kt-card-header">
          <div>
            <p class="kt-section-label">Recommended Now</p>
            <h2 class="kt-card-title">${escapeHtml(view.title)}</h2>
          </div>
          <button id="shuffle-recommended" class="kt-icon-button" title="Shuffle recommendation">↻</button>
        </div>
        <div class="kt-card-meta">
          <span class="${difficultyBadge(view.difficulty)}">${escapeHtml(view.difficulty)}</span>
          <span class="${reasonBadge(view.reason)}">${escapeHtml(view.reason)}</span>
          ${view.alsoCourseNext ? '<span class="kt-pill kt-pill-success">Also next in course</span>' : ""}
        </div>
        <p class="kt-card-copy">
          ${
            view.nextReviewAt
              ? `Next review day: ${escapeHtml(formatReviewDate(view.nextReviewAt))}`
              : "Best retention move right now."
          }
        </p>
        <button id="open-recommended" class="kt-button kt-button-block">Open Problem</button>
      </div>
    </section>
  `;
}

function courseCard(view: CourseQuestionView | null): string {
  if (!payload?.popup.activeCourse) {
    return `
      <section class="kt-card kt-popup-card">
        <div class="kt-card-stack">
          <div>
            <p class="kt-section-label">Next In Course</p>
            <h2 class="kt-card-title">No active course</h2>
          </div>
          <p class="kt-card-copy">Choose an active course in the dashboard to restore the guided path.</p>
          <button data-open-dashboard="true" class="kt-button-secondary kt-button-block">Open Dashboard</button>
        </div>
      </section>
    `;
  }

  if (!view) {
    return `
      <section class="kt-card kt-popup-card">
        <div class="kt-card-stack">
          <div>
            <p class="kt-section-label">Next In Course</p>
            <h2 class="kt-card-title">${escapeHtml(payload.popup.activeCourse.name)}</h2>
          </div>
          <p class="kt-card-copy">This course is fully traversed. Use the dashboard to switch tracks or focus on due reviews.</p>
          <button data-open-dashboard="true" class="kt-button-secondary kt-button-block">Open Dashboard</button>
        </div>
      </section>
    `;
  }

  return `
    <section class="kt-card kt-popup-card">
      <div class="kt-card-stack">
        <div>
          <p class="kt-section-label">Next In Course</p>
          <h2 class="kt-card-title">${escapeHtml(view.title)}</h2>
        </div>
        <div class="kt-card-meta">
          <span class="kt-pill">${escapeHtml(payload.popup.activeCourse.name)}</span>
          <span class="kt-pill">${escapeHtml(view.chapterTitle)}</span>
          <span class="${difficultyBadge(view.difficulty)}">${escapeHtml(view.difficulty)}</span>
        </div>
        <p class="kt-card-copy">
          Path: ${escapeHtml(view.status.replace(/_/g, " "))}
          ${view.reviewPhase ? ` · FSRS: ${escapeHtml(getStudyPhaseLabel(view.reviewPhase))}` : ""}
        </p>
        <button id="open-course-next" class="kt-button-secondary kt-button-block">Continue Path</button>
      </div>
    </section>
  `;
}

function render(): void {
  const root = byId<HTMLDivElement>("popup-root");
  const recommended = currentRecommended();
  const activeCourse = payload?.popup.activeCourse ?? null;

  root.innerHTML = `
    <header class="kt-popup-topbar">
      <div class="kt-brand">
        <span class="kt-brand-mark">⌘</span>
        <div class="kt-brand-title">LeetCode Reviews</div>
      </div>
      <div class="kt-inline-actions">
        <button id="refresh-popup" class="kt-icon-button" title="Refresh">↻</button>
        <button id="open-settings" class="kt-icon-button" title="Settings">⚙</button>
      </div>
    </header>

    <section class="kt-summary-row">
      <div class="kt-summary-chip">
        <span class="kt-summary-chip-label">Items Due</span>
        <strong class="kt-summary-chip-value">${payload?.popup.dueCount ?? 0}</strong>
      </div>
      <div class="kt-summary-chip">
        <span class="kt-summary-chip-label">Streak</span>
        <strong class="kt-summary-chip-value">${payload?.popup.streakDays ?? 0}</strong>
      </div>
    </section>

    ${recommendedCard(recommended)}
    ${courseCard(payload?.popup.courseNext ?? null)}

    ${
      activeCourse
        ? `
          <section class="kt-card kt-popup-card">
            <div class="kt-card-stack">
              <div class="kt-card-header">
                <div>
                  <p class="kt-section-label">Active Track</p>
                  <h2 class="kt-card-title">${escapeHtml(activeCourse.name)}</h2>
                </div>
                <span class="kt-pill">${activeCourse.completionPercent}%</span>
              </div>
              <div class="kt-progress"><span style="width:${activeCourse.completionPercent}%"></span></div>
              <p class="kt-card-copy">${activeCourse.completedQuestions}/${activeCourse.totalQuestions} questions traversed.</p>
            </div>
          </section>
        `
        : ""
    }

    <section class="kt-popup-footer">
      <button
        id="toggle-mode"
        class="kt-button-secondary kt-button-block"
      >${payload?.settings.studyMode === "studyPlan" ? "Study Mode" : "Freestyle"}</button>
      <button id="open-dashboard-main" class="kt-button kt-button-block">Full Dashboard</button>
    </section>

    <div
      id="popup-status"
      class="kt-status"
      data-error="${statusIsError ? "true" : "false"}"
    >${escapeHtml(statusMessage)}</div>
  `;

  bindEvents();
}

async function loadPayload(resetRecommendation = false): Promise<void> {
  const response = await sendMessage("GET_APP_SHELL_DATA", {});
  if (!response.ok) {
    statusMessage = response.error ?? "Failed to load extension state.";
    statusIsError = true;
    render();
    return;
  }

  payload = response.data as AppShellPayload;
  if (resetRecommendation) {
    recommendedIndex = 0;
  } else if (payload.popup.recommendedCandidates.length > 0) {
    recommendedIndex %= payload.popup.recommendedCandidates.length;
  } else {
    recommendedIndex = 0;
  }
  statusMessage = "";
  statusIsError = false;
  render();
}

async function openProblem(
  target: { slug: string; url: string },
  courseContext?: { courseId?: string; chapterId?: string }
): Promise<void> {
  if (courseContext?.courseId || courseContext?.chapterId) {
    await sendMessage("TRACK_COURSE_QUESTION_LAUNCH", {
      slug: target.slug,
      courseId: courseContext.courseId,
      chapterId: courseContext.chapterId
    });
  }
  chrome.tabs.create({ url: target.url });
}

async function toggleStudyMode(): Promise<void> {
  if (!payload) {
    return;
  }

  const nextMode = payload.settings.studyMode === "studyPlan" ? "freestyle" : "studyPlan";
  const response = await sendMessage("UPDATE_SETTINGS", { studyMode: nextMode });
  if (!response.ok) {
    statusMessage = response.error ?? "Failed to update study mode.";
    statusIsError = true;
    render();
    return;
  }

  await loadPayload();
}

function openDashboard(view?: string): void {
  const url = new URL(chrome.runtime.getURL("dashboard.html"));
  if (view) {
    url.searchParams.set("view", view);
  }
  chrome.tabs.create({ url: url.toString() });
}

function bindEvents(): void {
  byId<HTMLButtonElement>("refresh-popup").onclick = () => {
    void loadPayload(true);
  };

  byId<HTMLButtonElement>("open-settings").onclick = () => {
    openDashboard("settings");
  };

  byId<HTMLButtonElement>("toggle-mode").onclick = () => {
    void toggleStudyMode();
  };

  byId<HTMLButtonElement>("open-dashboard-main").onclick = () => {
    openDashboard();
  };

  document.querySelectorAll<HTMLElement>("[data-open-dashboard='true']").forEach((button) => {
    button.onclick = () => {
      openDashboard();
    };
  });

  const shuffle = document.getElementById("shuffle-recommended");
  if (shuffle) {
    shuffle.onclick = () => {
      const candidateCount = payload?.popup.recommendedCandidates.length ?? 0;
      if (candidateCount > 1) {
        recommendedIndex = (recommendedIndex + 1) % candidateCount;
        render();
      }
    };
  }

  const openRecommendedButton = document.getElementById("open-recommended");
  if (openRecommendedButton) {
    openRecommendedButton.onclick = () => {
      const recommended = currentRecommended();
      if (!recommended) {
        return;
      }
      void openProblem(recommended);
    };
  }

  const openCourseButton = document.getElementById("open-course-next");
  const currentPayload = payload;
  const courseNext = currentPayload?.popup.courseNext;
  if (openCourseButton && courseNext) {
    openCourseButton.onclick = () => {
      void openProblem(courseNext, {
        courseId: currentPayload.popup.activeCourse?.id,
        chapterId: courseNext.chapterId
      });
    };
  }
}

void loadPayload(true);
