import { sendMessage } from "./shared/runtime";
import { Difficulty, StudyState } from "./shared/types";
import { normalizeSlug, parseDifficulty, slugToTitle } from "./shared/utils";

const OVERLAY_ID = "lcsr-overlay-root";

let activeSlug = "";
let currentState: StudyState | null = null;
let currentTitle = "";

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
  root.style.maxWidth = "320px";
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
      <input id="lcsr-time" type="number" min="0" step="1" placeholder="minutes" style="width:90px;background:#111827;border:1px solid #334155;border-radius:6px;color:#f8fafc;padding:4px;"/>
    </div>
    <div style="display:flex;gap:6px;margin-bottom:8px;">
      <button id="lcsr-note-btn" style="flex:1;background:#1d4ed8;color:#fff;border:0;border-radius:6px;padding:6px 8px;cursor:pointer;">Add note</button>
      <button id="lcsr-refresh-btn" style="background:#0f172a;color:#e2e8f0;border:1px solid #334155;border-radius:6px;padding:6px 8px;cursor:pointer;">Refresh</button>
    </div>
    <div id="lcsr-feedback" style="min-height:16px;color:#94a3b8;">${state?.lastReviewedAt ? `Last reviewed: ${escapeHtml(
      formatDate(state.lastReviewedAt)
    )}` : "Rate this attempt to schedule your next review."}</div>
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

function setFeedback(message: string, isError = false): void {
  const root = document.getElementById(OVERLAY_ID);
  const feedback = root?.querySelector<HTMLElement>("#lcsr-feedback");
  if (!feedback) {
    return;
  }

  feedback.textContent = message;
  feedback.style.color = isError ? "#f87171" : "#93c5fd";
}

function getMode(): "RECALL" | "FULL_SOLVE" {
  const root = document.getElementById(OVERLAY_ID);
  const select = root?.querySelector<HTMLSelectElement>("#lcsr-mode");
  return select?.value === "RECALL" ? "RECALL" : "FULL_SOLVE";
}

function getSolveTimeMs(): number | undefined {
  const root = document.getElementById(OVERLAY_ID);
  const input = root?.querySelector<HTMLInputElement>("#lcsr-time");
  if (!input?.value) {
    return undefined;
  }

  const minutes = Number(input.value);
  if (!Number.isFinite(minutes) || minutes < 0) {
    return undefined;
  }

  return Math.round(minutes * 60 * 1000);
}

async function onRate(slug: string, rating: 0 | 1 | 2 | 3): Promise<void> {
  setFeedback("Saving review...");
  const response = await sendMessage("RATE_PROBLEM", {
    slug,
    rating,
    mode: getMode(),
    solveTimeMs: getSolveTimeMs(),
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

async function refreshCurrentPage(): Promise<void> {
  const slug = getProblemSlugFromUrl();
  if (!slug) {
    return;
  }

  const title = detectTitle(slug);
  const difficulty = detectDifficulty();
  const solvedDetected = detectSolvedState();

  const upsert = await sendMessage("UPSERT_PROBLEM_FROM_PAGE", {
    slug,
    title,
    difficulty,
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

  const problem = (context.data as { problem: { title: string } | null })?.problem;
  const state = (context.data as { studyState: StudyState | null })?.studyState ?? null;
  renderOverlay(slug, problem?.title ?? title, state, solvedDetected);
}

async function bootstrap(): Promise<void> {
  const slug = getProblemSlugFromUrl();
  if (!slug) {
    const existing = document.getElementById(OVERLAY_ID);
    if (existing) {
      existing.remove();
    }
    activeSlug = "";
    return;
  }

  if (slug === activeSlug) {
    return;
  }

  activeSlug = slug;
  await refreshCurrentPage();
}

let lastHref = window.location.href;

void bootstrap();

setInterval(() => {
  if (window.location.href !== lastHref) {
    lastHref = window.location.href;
    void bootstrap();
  }
}, 1000);

const observer = new MutationObserver(() => {
  const slug = getProblemSlugFromUrl();
  if (slug && slug === activeSlug && !currentTitle) {
    void refreshCurrentPage();
  }
});

observer.observe(document.documentElement, { childList: true, subtree: true });
