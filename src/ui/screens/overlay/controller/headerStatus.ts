import {defaultReviewMode} from "../../../../domain/fsrs/reviewPolicy";
import {getStudyStateSummary} from "../../../../domain/fsrs/studyState";
import {ReviewMode, StudyState} from "../../../../domain/types";
import {
  OverlayHeaderStatus,
  OverlayHeaderStatusCard,
  OverlayHeaderStatusTone,
} from "../overlayPanel.types";

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function differenceInCalendarDays(left: Date, right: Date): number {
  const dayMs = 24 * 60 * 60 * 1000;
  const leftDay = startOfLocalDay(left).getTime();
  const rightDay = startOfLocalDay(right).getTime();
  return Math.round((leftDay - rightDay) / dayMs);
}

function formatMonthDay(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
  }).format(date);
}

function formatMonthDayYear(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatWeekday(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
  }).format(date);
}

export function formatSubmissionDateLabel(
  iso?: string,
  relativeTo = new Date()
): string {
  if (!iso) {
    return "-";
  }

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  const difference = differenceInCalendarDays(date, relativeTo);
  if (difference === 0) {
    return "today";
  }
  if (difference === 1) {
    return "tomorrow";
  }
  if (difference === -1) {
    return "yesterday";
  }
  if (difference >= 2 && difference <= 6) {
    return `this ${formatWeekday(date)}`;
  }
  if (difference <= -2 && difference >= -6) {
    return `last ${formatWeekday(date)}`;
  }
  if (date.getFullYear() === relativeTo.getFullYear()) {
    return formatMonthDay(date);
  }

  return formatMonthDayYear(date);
}

export function buildSessionLabel(
  state: StudyState | null,
  sessionMode?: ReviewMode
): string {
  const mode = sessionMode ?? defaultReviewMode(state);
  return mode === "FULL_SOLVE" ? "First solve" : "Recall review";
}

export function buildDueTone(
  iso?: string,
  relativeTo = new Date()
): OverlayHeaderStatusTone {
  if (!iso) {
    return "neutral";
  }

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "neutral";
  }

  const difference = differenceInCalendarDays(date, relativeTo);
  if (difference <= 0) {
    return "danger";
  }
  if (difference <= 7) {
    return "warning";
  }

  return "accent";
}

function buildHistoryStatusCard(
  label: string,
  iso: string,
  tone: OverlayHeaderStatusTone,
  emphasized = false
): OverlayHeaderStatusCard {
  return {
    emphasized,
    label,
    primary: formatSubmissionDateLabel(iso),
    secondary: "",
    tone,
  };
}

export function buildHeaderStatus(
  state: StudyState | null
): OverlayHeaderStatus {
  const summary = getStudyStateSummary(state);
  const cards: OverlayHeaderStatusCard[] = [];

  if (summary.lastReviewedAt) {
    cards.push(
      buildHistoryStatusCard(
        "Last submitted",
        summary.lastReviewedAt,
        "neutral"
      )
    );
  }

  if (summary.nextReviewAt) {
    cards.push(
      buildHistoryStatusCard(
        "Next due",
        summary.nextReviewAt,
        buildDueTone(summary.nextReviewAt),
        true
      )
    );
  }

  if (cards.length > 0) {
    return {
      cards,
      kind: "history",
    };
  }

  return {
    cards: [
      {
        label: "No submissions yet",
        primary: "After first submission",
        secondary: "",
        tone: "neutral",
      },
    ],
    kind: "empty",
  };
}
