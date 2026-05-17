import { ReviewMode, StudyState } from "@features/study";
import { getStudyStateSummary } from "@libs/fsrs/studyState";
import {
  calendarDayDistance,
  formatRelativeCalendarDate,
} from "@platform/time";

import { defaultReviewMode } from "../../../domain/policy/reviewPolicy";
import {
  OverlayHeaderStatus,
  OverlayHeaderStatusCard,
  OverlayHeaderStatusTone,
} from "../overlayPanel.types";

export function formatSubmissionDateLabel(
  iso?: string,
  relativeTo = new Date()
): string {
  return formatRelativeCalendarDate(iso, relativeTo, "-");
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

  const difference = calendarDayDistance(date, relativeTo);
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
  emphasized = false,
  relativeTo = new Date()
): OverlayHeaderStatusCard {
  return {
    emphasized,
    label,
    primary: formatSubmissionDateLabel(iso, relativeTo),
    secondary: "",
    tone,
  };
}

export function buildHeaderStatus(
  state: StudyState | null,
  relativeTo = new Date()
): OverlayHeaderStatus {
  const summary = getStudyStateSummary(state);
  const cards: OverlayHeaderStatusCard[] = [];

  if (summary.lastReviewedAt) {
    cards.push(
      buildHistoryStatusCard(
        "Last submitted",
        summary.lastReviewedAt,
        "neutral",
        false,
        relativeTo
      )
    );
  }

  if (summary.nextReviewAt) {
    cards.push(
      buildHistoryStatusCard(
        "Next due",
        summary.nextReviewAt,
        buildDueTone(summary.nextReviewAt, relativeTo),
        true,
        relativeTo
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
