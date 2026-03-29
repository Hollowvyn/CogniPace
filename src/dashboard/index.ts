import { sendMessage } from "../shared/runtime";
import { getStudyPhaseLabel } from "../shared/studyState";
import {
  ActiveCourseView,
  AppShellPayload,
  CourseCardView,
  LibraryProblemRow,
  ReviewOrder,
  StudyMode
} from "../shared/types";

type AppView = "dashboard" | "courses" | "library" | "analytics" | "settings";

interface ViewState {
  view: AppView;
  payload: AppShellPayload | null;
  status: string;
  statusIsError: boolean;
}

const state: ViewState = {
  view: readViewFromLocation(),
  payload: null,
  status: "",
  statusIsError: false
};

function byId<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) {
    throw new Error(`Missing element: ${id}`);
  }
  return node as T;
}

function readViewFromLocation(): AppView {
  const value = new URLSearchParams(window.location.search).get("view");
  if (value === "dashboard" || value === "courses" || value === "library" || value === "analytics" || value === "settings") {
    return value;
  }
  return "dashboard";
}

function setView(view: AppView): void {
  state.view = view;
  const url = new URL(window.location.href);
  url.searchParams.set("view", view);
  history.replaceState({}, "", url);
  render();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(iso?: string): string {
  if (!iso) {
    return "Not scheduled";
  }
  return new Date(iso).toLocaleDateString();
}

function toneForDifficulty(difficulty: string): string {
  if (difficulty === "Easy") {
    return "kt-pill kt-pill-blue";
  }
  if (difficulty === "Hard") {
    return "kt-pill kt-pill-danger";
  }
  return "kt-pill kt-pill-accent";
}

function toneForQuestionStatus(status: string): string {
  if (status === "COMPLETE") {
    return "kt-pill kt-pill-success";
  }
  if (status === "DUE_NOW" || status === "CURRENT" || status === "READY") {
    return "kt-pill kt-pill-accent";
  }
  if (status === "LOCKED") {
    return "kt-pill";
  }
  return "kt-pill kt-pill-blue";
}

function formatStudyPhase(phase?: string | null): string {
  if (!phase) {
    return "NEW";
  }
  return getStudyPhaseLabel(phase as Parameters<typeof getStudyPhaseLabel>[0]);
}

function currentRecommended(): AppShellPayload["popup"]["recommended"] {
  return state.payload?.popup.recommended ?? null;
}

function activeCourse(): ActiveCourseView | null {
  return state.payload?.activeCourse ?? null;
}

function shellTitle(view: AppView): { title: string; copy: string } {
  switch (view) {
    case "courses":
      return {
        title: "Course Management",
        copy: "Curated-first traversal, chapter progression, and intake control."
      };
    case "library":
      return {
        title: "Library",
        copy: "Inspect every tracked problem, its review state, and course membership."
      };
    case "analytics":
      return {
        title: "Analytics",
        copy: "Retention, due load, weakest items, and course completion signals."
      };
    case "settings":
      return {
        title: "Control Center",
        copy: "Global configuration for review cadence, automation behavior, and alerts."
      };
    default:
      return {
        title: "Dashboard",
        copy: "The best next move for retention and the live state of your active path."
      };
  }
}

function statusMarkup(): string {
  return `
    <div id="app-status" class="kt-status" data-error="${state.statusIsError ? "true" : "false"}">
      ${escapeHtml(state.status)}
    </div>
  `;
}

function navButton(view: AppView, icon: string, label: string): string {
  return `
    <button class="kt-nav-button" data-view="${view}" data-active="${state.view === view ? "true" : "false"}">
      <span>${icon}</span>
      <span class="kt-nav-button-label">${label}</span>
    </button>
  `;
}

function courseCard(course: CourseCardView): string {
  return `
    <article class="kt-course-card" data-active="${course.active ? "true" : "false"}">
      <div class="kt-card-header">
        <div>
          <p class="kt-section-label">${escapeHtml(course.sourceSet)}</p>
          <h3 class="kt-card-title">${escapeHtml(course.name)}</h3>
        </div>
        ${course.active ? '<span class="kt-pill kt-pill-accent">Active</span>' : ""}
      </div>
      <p class="kt-card-copy">${escapeHtml(course.description)}</p>
      <div class="kt-progress"><span style="width:${course.completionPercent}%"></span></div>
      <div class="kt-pair">
        <span class="kt-card-copy">${course.completedQuestions}/${course.totalQuestions} traversed</span>
        <strong class="kt-summary-chip-label">${course.completionPercent}%</strong>
      </div>
      <div class="kt-pair">
        <span class="kt-inline-note">${course.nextQuestionTitle ? `Next: ${escapeHtml(course.nextQuestionTitle)}` : "Course complete"}</span>
        <button class="kt-button-secondary kt-button-small" data-action="switch-course" data-course-id="${escapeHtml(course.id)}">
          ${course.active ? "Viewing" : "Set Active"}
        </button>
      </div>
    </article>
  `;
}

function recommendedPanel(): string {
  const recommended = currentRecommended();
  if (!recommended) {
    return `
      <section class="kt-shell-card">
        <div class="kt-card-stack">
          <div>
            <p class="kt-section-label">Recommended Now</p>
            <h2 class="kt-card-title">Queue clear</h2>
          </div>
          <p class="kt-card-copy">No review pressure right now. Shift to the active course to keep the streak moving.</p>
        </div>
      </section>
    `;
  }

  return `
    <section class="kt-shell-card">
      <div class="kt-card-stack">
        <div class="kt-card-header">
          <div>
            <p class="kt-section-label">Recommended Now</p>
            <h2 class="kt-card-title">${escapeHtml(recommended.title)}</h2>
          </div>
          <span class="${toneForDifficulty(recommended.difficulty)}">${escapeHtml(recommended.difficulty)}</span>
        </div>
        <div class="kt-badge-grid">
          <span class="${recommended.reason === "Overdue" ? "kt-pill kt-pill-danger" : recommended.reason === "Review focus" ? "kt-pill kt-pill-blue" : "kt-pill kt-pill-accent"}">${escapeHtml(recommended.reason)}</span>
          ${recommended.alsoCourseNext ? '<span class="kt-pill kt-pill-success">Also next in course</span>' : ""}
        </div>
        <p class="kt-card-copy">
          ${
            recommended.nextReviewAt
              ? `Next review day: ${escapeHtml(formatDate(recommended.nextReviewAt))}`
              : "Highest leverage problem in the queue."
          }
        </p>
        <div class="kt-action-row">
          <button
            class="kt-button"
            data-action="open-problem"
            data-slug="${escapeHtml(recommended.slug)}"
            data-url="${escapeHtml(recommended.url)}"
          >Open Problem</button>
          <button class="kt-button-secondary" data-action="refresh">Refresh</button>
        </div>
      </div>
    </section>
  `;
}

function queueList(): string {
  const items = state.payload?.queue.items.slice(0, 6) ?? [];
  if (items.length === 0) {
    return '<div class="kt-empty">No items are waiting in the queue.</div>';
  }

  return `
    <ul class="kt-list">
      ${items
        .map(
          (item) => `
            <li class="kt-list-item">
              <div class="kt-row-card-inline">
                <div>
                  <div class="kt-list-item-title">${escapeHtml(item.problem.title || item.slug)}</div>
                  <div class="kt-list-item-copy">${escapeHtml(item.category.toUpperCase())} · ${escapeHtml(formatDate(item.studyStateSummary.nextReviewAt))}</div>
                </div>
                <div class="kt-action-row">
                  <span class="${toneForDifficulty(item.problem.difficulty)}">${escapeHtml(item.problem.difficulty)}</span>
                  <button
                    class="kt-button-secondary kt-button-small"
                    data-action="open-problem"
                    data-slug="${escapeHtml(item.slug)}"
                    data-url="${escapeHtml(item.problem.url)}"
                  >Launch</button>
                </div>
              </div>
            </li>
          `
        )
        .join("")}
    </ul>
  `;
}

function overviewView(): string {
  const payload = state.payload;
  const course = activeCourse();

  return `
    <div class="kt-shell-grid">
      <div class="kt-stack">
        ${recommendedPanel()}

        <section class="kt-shell-card">
          <div class="kt-card-stack">
            <div>
              <p class="kt-section-label">Signal Summary</p>
            </div>
            <div class="kt-stat-grid">
              <article class="kt-metric">
                <span class="kt-label">Due Today</span>
                <strong class="kt-metric-value">${payload?.queue.dueCount ?? 0}</strong>
                <span class="kt-metric-copy">Live pressure on the queue.</span>
              </article>
              <article class="kt-metric">
                <span class="kt-label">Day Streak</span>
                <strong class="kt-metric-value">${payload?.analytics.streakDays ?? 0}</strong>
                <span class="kt-metric-copy">Consecutive review days.</span>
              </article>
              <article class="kt-metric">
                <span class="kt-label">Review Cards</span>
                <strong class="kt-metric-value">${payload?.analytics.phaseCounts.Review ?? 0}</strong>
                <span class="kt-metric-copy">Cards currently scheduled in FSRS review state.</span>
              </article>
            </div>
          </div>
        </section>

        <section class="kt-shell-card">
          <div class="kt-card-stack">
            <div class="kt-card-header">
              <div>
                <p class="kt-section-label">Active Course</p>
                <h2 class="kt-card-title">${course ? escapeHtml(course.name) : "No active course"}</h2>
              </div>
              ${course ? `<span class="kt-pill kt-pill-accent">${course.completionPercent}%</span>` : ""}
            </div>
            ${
              course
                ? `
                  <p class="kt-card-copy">${escapeHtml(course.description)}</p>
                  <div class="kt-progress"><span style="width:${course.completionPercent}%"></span></div>
                  <div class="kt-pair">
                    <span class="kt-card-copy">${course.completedQuestions}/${course.totalQuestions} questions traversed</span>
                    <span class="kt-inline-note">${course.activeChapterTitle ? `Current chapter: ${escapeHtml(course.activeChapterTitle)}` : "Course complete"}</span>
                  </div>
                  ${
                    course.nextQuestion
                      ? `
                        <div class="kt-row-card">
                          <div class="kt-card-topline">
                            <span class="kt-section-label">Next In Course</span>
                            <span class="${toneForQuestionStatus(course.nextQuestion.status)}">${escapeHtml(course.nextQuestion.status.replace(/_/g, " "))}</span>
                          </div>
                          <div class="kt-list-item-title">${escapeHtml(course.nextQuestion.title)}</div>
                          <div class="kt-list-item-copy">
                            ${escapeHtml(course.nextQuestion.chapterTitle)} · ${escapeHtml(course.nextQuestion.difficulty)}
                            ${course.nextQuestion.reviewPhase ? ` · FSRS ${escapeHtml(formatStudyPhase(course.nextQuestion.reviewPhase))}` : ""}
                          </div>
                          <div class="kt-action-row">
                            <button
                              class="kt-button"
                              data-action="open-problem"
                              data-slug="${escapeHtml(course.nextQuestion.slug)}"
                              data-url="${escapeHtml(course.nextQuestion.url)}"
                              data-course-id="${escapeHtml(course.id)}"
                              data-chapter-id="${escapeHtml(course.nextQuestion.chapterId)}"
                            >Continue Path</button>
                            <button class="kt-button-secondary" data-view="courses">Open Course View</button>
                          </div>
                        </div>
                      `
                      : '<div class="kt-empty">This course is fully traversed.</div>'
                  }
                `
                : '<div class="kt-empty">Set an active course to enable guided traversal.</div>'
            }
          </div>
        </section>

        <section class="kt-shell-card">
          <div class="kt-card-stack">
            <div class="kt-card-header">
              <div>
                <p class="kt-section-label">Today Queue</p>
                <h2 class="kt-card-title">Live Intake</h2>
              </div>
              <span class="kt-pill">${payload?.queue.items.length ?? 0} items</span>
            </div>
            ${queueList()}
          </div>
        </section>
      </div>

      <aside class="kt-stack">
        <section class="kt-sidebar-card">
          <div class="kt-card-stack">
            <div class="kt-card-header">
              <div>
                <p class="kt-section-label">Course Roster</p>
                <h2 class="kt-card-title">Available Tracks</h2>
              </div>
            </div>
            <div class="kt-course-strip">
              ${(payload?.courses ?? []).map(courseCard).join("")}
            </div>
          </div>
        </section>

        <section class="kt-sidebar-card">
          <div class="kt-card-stack">
            <div>
              <p class="kt-section-label">Quick Intake</p>
              <h2 class="kt-card-title">Add Question</h2>
            </div>
            ${courseIngestForm()}
          </div>
        </section>

        <section class="kt-sidebar-card">
          <div class="kt-card-stack">
            <div>
              <p class="kt-section-label">Protocol</p>
              <h2 class="kt-card-title">Review Surface</h2>
            </div>
            <p class="kt-card-copy">Study mode: ${escapeHtml(payload?.settings.studyMode ?? "studyPlan")} · Order: ${escapeHtml(payload?.settings.reviewOrder ?? "dueFirst")} · Timer + submit is fully manual.</p>
            <div class="kt-footer-bar">
              <button class="kt-button-secondary" data-action="toggle-mode">Toggle Study Mode</button>
              <button class="kt-button-ghost" data-view="settings">Open Settings</button>
            </div>
          </div>
        </section>
      </aside>
    </div>
  `;
}

function chapterButtons(course: ActiveCourseView | null): string {
  if (!course) {
    return '<div class="kt-empty">No active course selected.</div>';
  }

  return `
    <div class="kt-chapter-tabs">
      ${course.chapters
        .map(
          (chapter) => `
            <button
              class="kt-button-secondary kt-chapter-tab"
              data-action="set-chapter"
              data-course-id="${escapeHtml(course.id)}"
              data-chapter-id="${escapeHtml(chapter.id)}"
              data-status="${chapter.status}"
            >
              ${escapeHtml(chapter.title)} · ${chapter.completedQuestions}/${chapter.totalQuestions}
            </button>
          `
        )
        .join("")}
    </div>
  `;
}

function questionTable(course: ActiveCourseView | null): string {
  if (!course) {
    return '<div class="kt-empty">No course data loaded.</div>';
  }

  const questions = course.chapters.flatMap((chapter) => chapter.questions);
  return `
    <div class="kt-table-wrap">
      <table class="kt-table">
        <thead>
          <tr>
            <th>Question</th>
            <th>Chapter</th>
            <th>Difficulty</th>
            <th>Status</th>
            <th>Next Review</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${questions
            .map(
              (question) => `
                <tr>
                  <td>
                    <strong>${escapeHtml(question.title)}</strong>
                    <div class="kt-list-item-copy">${escapeHtml(question.slug)}</div>
                  </td>
                  <td>${escapeHtml(question.chapterTitle)}</td>
                  <td><span class="${toneForDifficulty(question.difficulty)}">${escapeHtml(question.difficulty)}</span></td>
                  <td>
                    <span class="${toneForQuestionStatus(question.status)}">${escapeHtml(question.status.replace(/_/g, " "))}</span>
                    ${question.reviewPhase ? `<div class="kt-list-item-copy">FSRS ${escapeHtml(formatStudyPhase(question.reviewPhase))}</div>` : ""}
                  </td>
                  <td>${escapeHtml(formatDate(question.nextReviewAt))}</td>
                  <td>
                    <button
                      class="kt-button-secondary kt-button-small"
                      data-action="open-problem"
                      data-slug="${escapeHtml(question.slug)}"
                      data-url="${escapeHtml(question.url)}"
                      data-course-id="${escapeHtml(course.id)}"
                      data-chapter-id="${escapeHtml(question.chapterId)}"
                    >Launch</button>
                  </td>
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function courseIngestForm(): string {
  return `
    <form id="course-ingest-form" class="kt-card-stack">
      <div class="kt-form-field">
        <label class="kt-label" for="course-form-course">Course</label>
        <select id="course-form-course" class="kt-select"></select>
      </div>
      <div class="kt-form-field">
        <label class="kt-label" for="course-form-chapter">Chapter</label>
        <select id="course-form-chapter" class="kt-select"></select>
      </div>
      <div class="kt-form-field">
        <label class="kt-label" for="course-form-input">LeetCode Slug or URL</label>
        <input id="course-form-input" class="kt-input" placeholder="https://leetcode.com/problems/..." />
      </div>
      <div class="kt-footer-bar">
        <button class="kt-button" type="submit">Add To Protocol</button>
        <label class="kt-inline-note">
          <input id="course-form-started" type="checkbox" />
          Mark as started
        </label>
      </div>
    </form>
  `;
}

function coursesView(): string {
  const course = activeCourse();
  return `
    <div class="kt-shell-grid-single">
      <div class="kt-hero">
        <section class="kt-shell-card">
          <div class="kt-hero-copy">
            <div>
              <p class="kt-section-label">${course ? escapeHtml(course.sourceSet) : "No active course"}</p>
              <h1 class="kt-hero-title">${course ? escapeHtml(course.name) : "Course Offline"}</h1>
            </div>
            <p class="kt-hero-subtitle">${course ? escapeHtml(course.description) : "Set an active course to restore the curated path."}</p>
            ${
              course
                ? `
                  <div class="kt-stat-grid">
                    <article class="kt-metric">
                      <span class="kt-label">Chapters</span>
                      <strong class="kt-metric-value">${course.totalChapters}</strong>
                      <span class="kt-metric-copy">${course.completedChapters} completed</span>
                    </article>
                    <article class="kt-metric">
                      <span class="kt-label">Questions</span>
                      <strong class="kt-metric-value">${course.totalQuestions}</strong>
                      <span class="kt-metric-copy">${course.completedQuestions} traversed</span>
                    </article>
                    <article class="kt-metric">
                      <span class="kt-label">Due In Track</span>
                      <strong class="kt-metric-value">${course.dueCount}</strong>
                      <span class="kt-metric-copy">Pending review cards</span>
                    </article>
                  </div>
                  <div class="kt-progress"><span style="width:${course.completionPercent}%"></span></div>
                  <div class="kt-footer-bar">
                    ${
                      course.nextQuestion
                        ? `
                          <button
                            class="kt-button"
                            data-action="open-problem"
                            data-slug="${escapeHtml(course.nextQuestion.slug)}"
                            data-url="${escapeHtml(course.nextQuestion.url)}"
                            data-course-id="${escapeHtml(course.id)}"
                            data-chapter-id="${escapeHtml(course.nextQuestion.chapterId)}"
                          >Continue Path</button>
                        `
                        : '<button class="kt-button-secondary" disabled>Path Complete</button>'
                    }
                    <button class="kt-button-secondary" data-action="toggle-mode">Toggle Study Mode</button>
                  </div>
                `
                : ""
            }
          </div>
        </section>

        <aside class="kt-shell-card">
          <div class="kt-card-stack">
            <div>
              <p class="kt-section-label">Ingest Question</p>
              <h2 class="kt-card-title">Append To Active Chapter</h2>
            </div>
            ${courseIngestForm()}
          </div>
        </aside>
      </div>

      <section class="kt-shell-card">
        <div class="kt-card-stack">
          <div class="kt-card-header">
            <div>
              <p class="kt-section-label">Course Roster</p>
              <h2 class="kt-card-title">Switch Active Track</h2>
            </div>
          </div>
          <div class="kt-course-strip">
            ${(state.payload?.courses ?? []).map(courseCard).join("")}
          </div>
        </div>
      </section>

      <section class="kt-shell-card">
        <div class="kt-card-stack">
          <div class="kt-card-header">
            <div>
              <p class="kt-section-label">Chapter Map</p>
              <h2 class="kt-card-title">Operational Sequence</h2>
            </div>
          </div>
          ${chapterButtons(course)}
        </div>
      </section>

      <section class="kt-shell-card">
        <div class="kt-card-stack">
          <div class="kt-card-header">
            <div>
              <p class="kt-section-label">Question Matrix</p>
              <h2 class="kt-card-title">Current Path State</h2>
            </div>
          </div>
          ${questionTable(course)}
        </div>
      </section>
    </div>
  `;
}

function analyticsForecast(): string {
  const points = state.payload?.analytics.dueByDay ?? [];
  const max = Math.max(1, ...points.map((point) => point.count));
  return `
    <div class="kt-grid-2">
      ${points
        .map(
          (point) => `
            <article class="kt-row-card">
              <div class="kt-pair">
                <span class="kt-label">${escapeHtml(point.date)}</span>
                <strong>${point.count}</strong>
              </div>
              <div class="kt-progress"><span style="width:${(point.count / max) * 100}%"></span></div>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function analyticsView(): string {
  const payload = state.payload;
  return `
    <div class="kt-shell-grid-single">
      <section class="kt-shell-card">
        <div class="kt-card-stack">
          <div class="kt-stat-grid">
            <article class="kt-metric">
              <span class="kt-label">Streak</span>
              <strong class="kt-metric-value">${payload?.analytics.streakDays ?? 0}</strong>
              <span class="kt-metric-copy">Consecutive active review days.</span>
            </article>
            <article class="kt-metric">
              <span class="kt-label">Total Reviews</span>
              <strong class="kt-metric-value">${payload?.analytics.totalReviews ?? 0}</strong>
              <span class="kt-metric-copy">Scheduler events logged across the library.</span>
            </article>
            <article class="kt-metric">
              <span class="kt-label">Retention Proxy</span>
              <strong class="kt-metric-value">${Math.round((payload?.analytics.retentionProxy ?? 0) * 100)}%</strong>
              <span class="kt-metric-copy">Recent ratings at Good or Easy.</span>
            </article>
          </div>
        </div>
      </section>

      <section class="kt-shell-card">
        <div class="kt-card-stack">
          <div>
            <p class="kt-section-label">Due Forecast</p>
            <h2 class="kt-card-title">Next 14 Days</h2>
          </div>
          ${analyticsForecast()}
        </div>
      </section>

      <div class="kt-shell-grid">
        <section class="kt-shell-card">
          <div class="kt-card-stack">
            <div>
              <p class="kt-section-label">Weakest Problems</p>
              <h2 class="kt-card-title">Highest Lapse Pressure</h2>
            </div>
            <div class="kt-table-wrap">
              <table class="kt-table">
                <thead>
                  <tr>
                    <th>Problem</th>
                    <th>Lapses</th>
                    <th>FSRS Difficulty</th>
                  </tr>
                </thead>
                <tbody>
                  ${(payload?.analytics.weakestProblems ?? [])
                    .map(
                      (problem) => `
                        <tr>
                          <td>${escapeHtml(problem.title)}</td>
                          <td>${problem.lapses}</td>
                          <td>${problem.difficulty.toFixed(2)}</td>
                        </tr>
                      `
                    )
                    .join("")}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <aside class="kt-sidebar-card">
          <div class="kt-card-stack">
            <div>
              <p class="kt-section-label">Course Completion</p>
              <h2 class="kt-card-title">Track Status</h2>
            </div>
            <div class="kt-course-strip">
              ${(payload?.courses ?? []).map(courseCard).join("")}
            </div>
          </div>
        </aside>
      </div>
    </div>
  `;
}

function settingsView(): string {
  const settings = state.payload?.settings;
  const sets = Object.entries(settings?.setsEnabled ?? {});
  return `
    <div class="kt-shell-grid-single">
      <form id="settings-form" class="kt-shell-card">
        <div class="kt-card-stack">
          <div>
            <p class="kt-section-label">Study Settings</p>
            <h2 class="kt-card-title">Daily Cadence</h2>
          </div>
          <div class="kt-settings-grid">
            <label class="kt-settings-field">
              <span class="kt-label">Daily New</span>
              <input id="settings-daily-new" class="kt-input" type="number" min="0" value="${settings?.dailyNewLimit ?? 0}" />
            </label>
            <label class="kt-settings-field">
              <span class="kt-label">Daily Review</span>
              <input id="settings-daily-review" class="kt-input" type="number" min="0" value="${settings?.dailyReviewLimit ?? 0}" />
            </label>
            <label class="kt-settings-field">
              <span class="kt-label">Study Mode</span>
              <select id="settings-study-mode" class="kt-select">
                <option value="studyPlan" ${settings?.studyMode === "studyPlan" ? "selected" : ""}>Study plan</option>
                <option value="freestyle" ${settings?.studyMode === "freestyle" ? "selected" : ""}>Freestyle</option>
              </select>
            </label>
            <label class="kt-settings-field">
              <span class="kt-label">Active Course</span>
              <select id="settings-active-course" class="kt-select">
                ${(state.payload?.courses ?? [])
                  .map(
                    (course) => `
                      <option value="${escapeHtml(course.id)}" ${settings?.activeCourseId === course.id ? "selected" : ""}>
                        ${escapeHtml(course.name)}
                      </option>
                    `
                  )
                  .join("")}
              </select>
            </label>
            <label class="kt-settings-field">
              <span class="kt-label">Review Order</span>
              <select id="settings-review-order" class="kt-select">
                <option value="dueFirst" ${settings?.reviewOrder === "dueFirst" ? "selected" : ""}>Due First</option>
                <option value="mixByDifficulty" ${settings?.reviewOrder === "mixByDifficulty" ? "selected" : ""}>Mix By Difficulty</option>
                <option value="weakestFirst" ${settings?.reviewOrder === "weakestFirst" ? "selected" : ""}>Weakest First</option>
              </select>
            </label>
          </div>

          <div>
            <p class="kt-section-label">Review Behavior</p>
            <div class="kt-settings-grid">
              <label class="kt-row-card">
                <span class="kt-label">Require solve time</span>
                <input id="settings-require-time" type="checkbox" ${settings?.requireSolveTime ? "checked" : ""} />
              </label>
            </div>
          </div>

          <div>
            <p class="kt-section-label">Alerts</p>
            <div class="kt-settings-grid">
              <label class="kt-row-card">
                <span class="kt-label">Notifications</span>
                <input id="settings-notifications" type="checkbox" ${settings?.notifications ? "checked" : ""} />
              </label>
              <label class="kt-settings-field">
                <span class="kt-label">Quiet start</span>
                <input id="settings-quiet-start" class="kt-input" type="number" min="0" max="23" value="${settings?.quietHours.startHour ?? 22}" />
              </label>
              <label class="kt-settings-field">
                <span class="kt-label">Quiet end</span>
                <input id="settings-quiet-end" class="kt-input" type="number" min="0" max="23" value="${settings?.quietHours.endHour ?? 8}" />
              </label>
            </div>
          </div>

          <div>
            <p class="kt-section-label">Enabled Sets</p>
            <div class="kt-course-strip">
              ${sets
                .map(
                  ([name, enabled]) => `
                    <label class="kt-row-card">
                      <span class="kt-label">${escapeHtml(name)}</span>
                      <input type="checkbox" data-set-toggle="${escapeHtml(name)}" ${enabled ? "checked" : ""} />
                    </label>
                  `
                )
                .join("")}
            </div>
          </div>

          <div class="kt-footer-bar">
            <button class="kt-button" type="submit">Save Settings</button>
            <button class="kt-button-secondary" type="button" data-action="refresh">Reset View</button>
          </div>
        </div>
      </form>

      <section class="kt-shell-card">
        <div class="kt-card-stack">
          <div>
            <p class="kt-section-label">Data</p>
            <h2 class="kt-card-title">Import / Export</h2>
          </div>
          <div class="kt-footer-bar">
            <button class="kt-button-secondary" type="button" data-action="export-data">Export Backup JSON</button>
            <input id="import-file" class="kt-input" type="file" accept="application/json" />
            <button class="kt-button" type="button" data-action="import-data">Import Backup</button>
          </div>
        </div>
      </section>
    </div>
  `;
}

function libraryFilters(): string {
  return `
    <div class="kt-filter-row">
      <input id="library-filter-query" class="kt-input" placeholder="Search title or slug" />
      <select id="library-filter-course" class="kt-select">
        <option value="all">All courses</option>
        ${(state.payload?.courses ?? [])
          .map((course) => `<option value="${escapeHtml(course.id)}">${escapeHtml(course.name)}</option>`)
          .join("")}
      </select>
      <select id="library-filter-difficulty" class="kt-select">
        <option value="all">All difficulty</option>
        <option value="Easy">Easy</option>
        <option value="Medium">Medium</option>
        <option value="Hard">Hard</option>
        <option value="Unknown">Unknown</option>
      </select>
      <select id="library-filter-status" class="kt-select">
        <option value="all">All status</option>
        <option value="due">Due now</option>
        <option value="new">New</option>
        <option value="review">Review</option>
        <option value="learning">Learning</option>
        <option value="relearning">Relearning</option>
        <option value="suspended">Suspended</option>
      </select>
    </div>
  `;
}

function libraryView(): string {
  return `
    <section class="kt-shell-card">
      <div class="kt-card-stack">
        <div class="kt-card-header">
          <div>
            <p class="kt-section-label">Library</p>
            <h2 class="kt-card-title">All Tracked Problems</h2>
          </div>
        </div>
        ${libraryFilters()}
        <div class="kt-table-wrap">
          <table class="kt-table">
            <thead>
              <tr>
                <th>Problem</th>
                <th>Difficulty</th>
                <th>Course</th>
                <th>Status</th>
                <th>Next Review</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody id="library-table-body"></tbody>
          </table>
        </div>
      </div>
    </section>
  `;
}

function viewMarkup(): string {
  switch (state.view) {
    case "courses":
      return coursesView();
    case "library":
      return libraryView();
    case "analytics":
      return analyticsView();
    case "settings":
      return settingsView();
    default:
      return overviewView();
  }
}

function render(): void {
  const app = byId<HTMLDivElement>("app-shell");
  const title = shellTitle(state.view);

  app.innerHTML = `
    <div class="kt-shell">
      <aside class="kt-rail">
        <div class="kt-rail-brand">
          <div class="kt-rail-mark">KT</div>
          <div class="kt-rail-subtitle">v1.0.4</div>
        </div>
        <nav class="kt-rail-nav">
          ${navButton("dashboard", "▣", "Dashboard")}
          ${navButton("courses", "▤", "Courses")}
          ${navButton("library", "⌘", "Library")}
          ${navButton("analytics", "◫", "Analytics")}
          ${navButton("settings", "⚙", "Settings")}
        </nav>
        <div class="kt-rail-footer">
          <span class="kt-footer-note">Kinetic Terminal</span>
          <span class="kt-rail-subtitle">Spaced repetition control plane</span>
        </div>
      </aside>

      <div class="kt-shell-main">
        <header class="kt-topbar">
          <div class="kt-topbar-title">
            <p class="kt-eyebrow">${escapeHtml(title.title.toUpperCase())}</p>
            <h1 class="kt-view-title">${escapeHtml(title.title)}</h1>
            <p class="kt-topbar-copy">${escapeHtml(title.copy)}</p>
          </div>
          <div class="kt-topbar-actions">
            ${statusMarkup()}
            <button class="kt-icon-button" data-action="refresh" title="Refresh">↻</button>
            <button class="kt-icon-button" data-view="settings" title="Settings">⚙</button>
          </div>
        </header>
        <section class="kt-shell-content">
          ${viewMarkup()}
        </section>
      </div>
    </div>
  `;

  afterRender();
}

function filterLibraryRows(rows: LibraryProblemRow[]): LibraryProblemRow[] {
  const query = (document.getElementById("library-filter-query") as HTMLInputElement | null)?.value.trim().toLowerCase() ?? "";
  const courseId = (document.getElementById("library-filter-course") as HTMLSelectElement | null)?.value ?? "all";
  const difficulty = (document.getElementById("library-filter-difficulty") as HTMLSelectElement | null)?.value ?? "all";
  const status = (document.getElementById("library-filter-status") as HTMLSelectElement | null)?.value ?? "all";

  return rows.filter((row) => {
    if (query) {
      const haystack = `${row.problem.title} ${row.problem.leetcodeSlug}`.toLowerCase();
      if (!haystack.includes(query)) {
        return false;
      }
    }

    if (courseId !== "all" && !row.courses.some((course) => course.courseId === courseId)) {
      return false;
    }

    if (difficulty !== "all" && row.problem.difficulty !== difficulty) {
      return false;
    }

    if (status !== "all") {
      const summary = row.studyStateSummary;
      if (status === "due" && !summary?.isDue) {
        return false;
      }
      if (status === "new" && summary?.isStarted) {
        return false;
      }
      if (status === "review" && summary?.phase !== "Review") {
        return false;
      }
      if (status === "suspended" && summary?.phase !== "Suspended") {
        return false;
      }
      if (status === "learning" && summary?.phase !== "Learning") {
        return false;
      }
      if (status === "relearning" && summary?.phase !== "Relearning") {
        return false;
      }
    }

    return true;
  });
}

function renderLibraryTable(): void {
  const rows = filterLibraryRows(state.payload?.library ?? []);
  const body = document.getElementById("library-table-body");
  if (!body) {
    return;
  }

  body.innerHTML = rows
    .map((row) => {
      const primaryCourse = row.courses[0];
      const studyStateSummary = row.studyStateSummary;
      const phaseLabel = studyStateSummary ? formatStudyPhase(studyStateSummary.phase) : "NEW";
      const statusLabel = studyStateSummary?.isDue ? `${phaseLabel} · DUE NOW` : phaseLabel;
      return `
        <tr>
          <td>
            <strong>${escapeHtml(row.problem.title)}</strong>
            <div class="kt-list-item-copy">${escapeHtml(row.problem.leetcodeSlug)}</div>
          </td>
          <td><span class="${toneForDifficulty(row.problem.difficulty)}">${escapeHtml(row.problem.difficulty)}</span></td>
          <td>${primaryCourse ? escapeHtml(primaryCourse.courseName) : "Independent"}</td>
          <td>${escapeHtml(statusLabel)}</td>
          <td>${escapeHtml(formatDate(studyStateSummary?.nextReviewAt))}</td>
          <td>
            <button
              class="kt-button-secondary kt-button-small"
              data-action="open-problem"
              data-slug="${escapeHtml(row.problem.leetcodeSlug)}"
              data-url="${escapeHtml(row.problem.url)}"
            >Open</button>
          </td>
        </tr>
      `;
    })
    .join("");
}

function populateCourseChapters(): void {
  const courseSelect = document.getElementById("course-form-course") as HTMLSelectElement | null;
  const chapterSelect = document.getElementById("course-form-chapter") as HTMLSelectElement | null;
  if (!courseSelect || !chapterSelect) {
    return;
  }

  const options = state.payload?.courseOptions ?? [];
  if (courseSelect.options.length === 0) {
    courseSelect.innerHTML = options
      .map((course) => `<option value="${escapeHtml(course.id)}">${escapeHtml(course.name)}</option>`)
      .join("");
  }

  const selectedCourse = options.find((course) => course.id === courseSelect.value) ?? options[0];
  if (!selectedCourse) {
    chapterSelect.innerHTML = "";
    return;
  }

  courseSelect.value = selectedCourse.id;
  chapterSelect.innerHTML = selectedCourse.chapterOptions
    .map((chapter) => `<option value="${escapeHtml(chapter.id)}">${escapeHtml(chapter.title)}</option>`)
    .join("");
}

async function openProblem(target: {
  slug: string;
  url: string;
  courseId?: string;
  chapterId?: string;
}): Promise<void> {
  if (target.courseId || target.chapterId) {
    await sendMessage("TRACK_COURSE_QUESTION_LAUNCH", {
      slug: target.slug,
      courseId: target.courseId,
      chapterId: target.chapterId
    });
  }
  chrome.tabs.create({ url: target.url });
}

async function saveSettings(): Promise<void> {
  const setsEnabled: Record<string, boolean> = {};
  document.querySelectorAll<HTMLInputElement>("[data-set-toggle]").forEach((input) => {
    const key = input.dataset.setToggle;
    if (key) {
      setsEnabled[key] = input.checked;
    }
  });

  const response = await sendMessage("UPDATE_SETTINGS", {
    dailyNewLimit: Number((document.getElementById("settings-daily-new") as HTMLInputElement).value) || 0,
    dailyReviewLimit: Number((document.getElementById("settings-daily-review") as HTMLInputElement).value) || 0,
    studyMode: (document.getElementById("settings-study-mode") as HTMLSelectElement).value as StudyMode,
    activeCourseId: (document.getElementById("settings-active-course") as HTMLSelectElement).value,
    reviewOrder: (document.getElementById("settings-review-order") as HTMLSelectElement).value as ReviewOrder,
    requireSolveTime: (document.getElementById("settings-require-time") as HTMLInputElement).checked,
    notifications: (document.getElementById("settings-notifications") as HTMLInputElement).checked,
    quietHours: {
      startHour: Number((document.getElementById("settings-quiet-start") as HTMLInputElement).value) || 0,
      endHour: Number((document.getElementById("settings-quiet-end") as HTMLInputElement).value) || 0
    },
    setsEnabled
  });

  if (!response.ok) {
    state.status = response.error ?? "Failed to save settings.";
    state.statusIsError = true;
    render();
    return;
  }

  state.status = "Settings saved.";
  state.statusIsError = false;
  await loadShellData();
}

async function exportData(): Promise<void> {
  const response = await sendMessage("EXPORT_DATA", {});
  if (!response.ok) {
    state.status = response.error ?? "Failed to export data.";
    state.statusIsError = true;
    render();
    return;
  }

  const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "kinetic-terminal-backup.json";
  link.click();
  URL.revokeObjectURL(url);

  state.status = "Backup exported.";
  state.statusIsError = false;
  render();
}

async function importData(): Promise<void> {
  const fileInput = document.getElementById("import-file") as HTMLInputElement | null;
  const file = fileInput?.files?.[0];
  if (!file) {
    state.status = "Choose a backup file first.";
    state.statusIsError = true;
    render();
    return;
  }

  const text = await file.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    state.status = "Invalid JSON backup file.";
    state.statusIsError = true;
    render();
    return;
  }

  const response = await sendMessage("IMPORT_DATA", parsed as never);
  if (!response.ok) {
    state.status = response.error ?? "Failed to import backup.";
    state.statusIsError = true;
    render();
    return;
  }

  state.status = "Backup imported.";
  state.statusIsError = false;
  await loadShellData();
}

async function loadShellData(): Promise<void> {
  const response = await sendMessage("GET_APP_SHELL_DATA", {});
  if (!response.ok) {
    state.status = response.error ?? "Failed to load app shell.";
    state.statusIsError = true;
    render();
    return;
  }

  state.payload = response.data as AppShellPayload;
  render();
}

function afterRender(): void {
  if (state.view === "library") {
    renderLibraryTable();
  }
  if (state.view === "courses" || state.view === "dashboard") {
    populateCourseChapters();
  }
}

const app = byId<HTMLDivElement>("app-shell");

app.addEventListener("click", (event) => {
  const target = event.target as HTMLElement | null;
  const viewButton = target?.closest<HTMLElement>("[data-view]");
  if (viewButton?.dataset.view) {
    setView(viewButton.dataset.view as AppView);
    return;
  }

  const actionButton = target?.closest<HTMLElement>("[data-action]");
  if (!actionButton) {
    return;
  }

  const action = actionButton.dataset.action;
  if (action === "refresh") {
    void loadShellData();
    return;
  }
  if (action === "switch-course" && actionButton.dataset.courseId) {
    void sendMessage("SWITCH_ACTIVE_COURSE", { courseId: actionButton.dataset.courseId }).then(() => loadShellData());
    return;
  }
  if (action === "set-chapter" && actionButton.dataset.courseId && actionButton.dataset.chapterId) {
    void sendMessage("SET_ACTIVE_COURSE_CHAPTER", {
      courseId: actionButton.dataset.courseId,
      chapterId: actionButton.dataset.chapterId
    }).then(() => loadShellData());
    return;
  }
  if (action === "open-problem" && actionButton.dataset.slug && actionButton.dataset.url) {
    void openProblem({
      slug: actionButton.dataset.slug,
      url: actionButton.dataset.url,
      courseId: actionButton.dataset.courseId,
      chapterId: actionButton.dataset.chapterId
    });
    return;
  }
  if (action === "toggle-mode") {
    const nextMode = state.payload?.settings.studyMode === "studyPlan" ? "freestyle" : "studyPlan";
    void sendMessage("UPDATE_SETTINGS", { studyMode: nextMode }).then(() => loadShellData());
    return;
  }
  if (action === "export-data") {
    void exportData();
    return;
  }
  if (action === "import-data") {
    void importData();
  }
});

app.addEventListener("submit", (event) => {
  const target = event.target as HTMLElement;
  if (target.id === "course-ingest-form") {
    event.preventDefault();
    const courseId = (document.getElementById("course-form-course") as HTMLSelectElement).value;
    const chapterId = (document.getElementById("course-form-chapter") as HTMLSelectElement).value;
    const input = (document.getElementById("course-form-input") as HTMLInputElement).value.trim();
    const markAsStarted = (document.getElementById("course-form-started") as HTMLInputElement).checked;
    if (!input) {
      state.status = "Provide a LeetCode slug or URL.";
      state.statusIsError = true;
      render();
      return;
    }
    void sendMessage("ADD_PROBLEM_TO_COURSE", {
      courseId,
      chapterId,
      input,
      markAsStarted
    }).then((response) => {
      if (!response.ok) {
        state.status = response.error ?? "Failed to append question to course.";
        state.statusIsError = true;
        render();
        return;
      }
      state.status = "Question appended to the course.";
      state.statusIsError = false;
      void loadShellData();
    });
    return;
  }

  if (target.id === "settings-form") {
    event.preventDefault();
    void saveSettings();
  }
});

app.addEventListener("change", (event) => {
  const target = event.target as HTMLElement;
  if (target.id === "course-form-course") {
    populateCourseChapters();
    return;
  }

  if (
    target.id === "library-filter-query" ||
    target.id === "library-filter-course" ||
    target.id === "library-filter-difficulty" ||
    target.id === "library-filter-status"
  ) {
    renderLibraryTable();
  }
});

app.addEventListener("input", (event) => {
  const target = event.target as HTMLElement;
  if (target.id === "library-filter-query") {
    renderLibraryTable();
  }
});

window.addEventListener("popstate", () => {
  state.view = readViewFromLocation();
  render();
});

void loadShellData();
