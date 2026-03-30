/** Overlay controller for page detection, timer state, review state, and stale-refresh guards. */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { openExtensionPage, getProblemContext, saveReviewResult, upsertProblemFromPage } from "../../../data/repositories/problemSessionRepository";
import { formatClock } from "../../../domain/common/time";
import {
  defaultReviewMode,
  deriveQuickRating,
  goalForDifficulty,
} from "../../../domain/fsrs/reviewPolicy";
import {
  getStudyPhaseLabel,
  getStudyStateSummary,
} from "../../../domain/fsrs/studyState";
import { parseDifficulty } from "../../../domain/problem/difficulty";
import { normalizeSlug, slugToTitle } from "../../../domain/problem/slug";
import {
  Difficulty,
  Rating,
  ReviewMode,
  StudyPhase,
  StudyState,
} from "../../../domain/types";
import { Tone } from "../../presentation/studyState";

import { OverlayPanelProps } from "./OverlayPanel";

const TIMER_TICK_MS = 250;

function getProblemSlugFromUrl(url: string): string | null {
  const match = url.match(/\/problems\/([^/]+)\/?/);
  if (!match?.[1]) {
    return null;
  }

  const normalized = normalizeSlug(match[1]);
  return normalized || null;
}

function detectDifficulty(documentRef: Document): Difficulty {
  const candidates = Array.from(documentRef.querySelectorAll("span,div,p"))
    .map((node) => node.textContent?.trim() ?? "")
    .filter(Boolean);

  for (const text of candidates) {
    if (text === "Easy" || text === "Medium" || text === "Hard") {
      return parseDifficulty(text);
    }
  }

  return "Unknown";
}

function detectTitle(documentRef: Document, slug: string): string {
  const h1 = documentRef.querySelector("h1");
  const title = h1?.textContent?.trim();
  return title || slugToTitle(slug);
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

function phaseTone(phase: StudyPhase): Tone {
  switch (phase) {
    case "Review":
      return "info";
    case "Learning":
    case "Relearning":
      return "accent";
    case "Suspended":
      return "default";
    default:
      return "accent";
  }
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

function modeBadge(state: StudyState | null): string {
  return getStudyStateSummary(state).reviewCount > 0
    ? "Repeat Review"
    : "First Solve";
}

interface OverlayState {
  activeSlug: string;
  collapsed: boolean;
  currentDifficulty: Difficulty;
  currentState: StudyState | null;
  currentTitle: string;
  draftContextSlug: string;
  draftNotes: string;
  feedbackIsError: boolean;
  feedbackMessage: string;
  selectedMode: ReviewMode;
  selectedRating: Rating;
}

const initialOverlayState: OverlayState = {
  activeSlug: "",
  collapsed: true,
  currentDifficulty: "Unknown",
  currentState: null,
  currentTitle: "",
  draftContextSlug: "",
  draftNotes: "",
  feedbackIsError: false,
  feedbackMessage: "",
  selectedMode: "FULL_SOLVE",
  selectedRating: 2,
};

export interface OverlayControllerEnvironment {
  documentRef: Document;
  windowRef: Window;
}

/** Coordinates all overlay state while keeping the panel presentational. */
export function useOverlayController(
  environment: OverlayControllerEnvironment
): { panelProps: OverlayPanelProps | null } {
  const { documentRef, windowRef } = environment;
  const [state, setState] = useState<OverlayState>(initialOverlayState);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const activeSlugRef = useRef("");
  const lastHrefRef = useRef(windowRef.location.href);
  const pausedElapsedMsRef = useRef(0);
  const requestTokenRef = useRef(0);
  const tickHandleRef = useRef<number | null>(null);
  const timerStartedAtMsRef = useRef<number | null>(null);
  const warmRefreshHandlesRef = useRef<number[]>([]);

  const clearTick = useCallback(() => {
    if (tickHandleRef.current !== null) {
      windowRef.clearInterval(tickHandleRef.current);
      tickHandleRef.current = null;
    }
  }, [windowRef]);

  const getElapsedMs = useCallback(
    (nowMs = Date.now()): number => {
      return pausedElapsedMsRef.current +
        (timerStartedAtMsRef.current
          ? nowMs - timerStartedAtMsRef.current
          : 0);
    },
    []
  );

  const isTimerRunning = useCallback((): boolean => {
    return timerStartedAtMsRef.current !== null;
  }, []);

  const clearWarmRefreshes = useCallback(() => {
    for (const handle of warmRefreshHandlesRef.current) {
      windowRef.clearTimeout(handle);
    }
    warmRefreshHandlesRef.current = [];
  }, [windowRef]);

  const setFeedback = useCallback((message: string, isError = false) => {
    setState((current) => ({
      ...current,
      feedbackIsError: isError,
      feedbackMessage: message,
    }));
  }, []);

  const resetTimer = useCallback(
    (showFeedback = false) => {
      timerStartedAtMsRef.current = null;
      pausedElapsedMsRef.current = 0;
      clearTick();
      setElapsedMs(0);
      setTimerRunning(false);

      if (showFeedback) {
        setFeedback("Timer reset.");
      }
    },
    [clearTick, setFeedback]
  );

  const pauseTimer = useCallback(
    (showFeedback = false) => {
      if (!isTimerRunning() || timerStartedAtMsRef.current === null) {
        return;
      }

      const nextElapsed = getElapsedMs();
      pausedElapsedMsRef.current = nextElapsed;
      timerStartedAtMsRef.current = null;
      clearTick();
      setElapsedMs(nextElapsed);
      setTimerRunning(false);

      if (showFeedback) {
        setFeedback("Timer paused.");
      }
    },
    [clearTick, getElapsedMs, isTimerRunning, setFeedback]
  );

  const startTimer = useCallback(
    (showFeedback = true) => {
      if (isTimerRunning()) {
        return;
      }

      timerStartedAtMsRef.current = Date.now();
      tickHandleRef.current = windowRef.setInterval(() => {
        setElapsedMs(getElapsedMs());
      }, TIMER_TICK_MS);
      setElapsedMs(getElapsedMs());
      setTimerRunning(true);

      if (showFeedback) {
        setFeedback("Timer started.");
      }
    },
    [getElapsedMs, isTimerRunning, setFeedback, windowRef]
  );

  const refreshCurrentPage = useCallback(
    async (slugOverride?: string): Promise<void> => {
      const slug =
        slugOverride ?? getProblemSlugFromUrl(windowRef.location.href);
      if (!slug) {
        return;
      }

      const requestToken = ++requestTokenRef.current;
      const title = detectTitle(documentRef, slug);
      const detectedDifficulty = detectDifficulty(documentRef);

      const upsert = await upsertProblemFromPage({
        slug,
        title,
        difficulty: detectedDifficulty,
        url: `https://leetcode.com/problems/${slug}/`,
      });

      if (
        requestToken !== requestTokenRef.current ||
        activeSlugRef.current !== slug
      ) {
        return;
      }

      if (!upsert.ok) {
        setFeedback(upsert.error ?? "Failed to sync problem.", true);
        return;
      }

      const context = await getProblemContext(slug);
      if (
        requestToken !== requestTokenRef.current ||
        activeSlugRef.current !== slug
      ) {
        return;
      }

      if (!context.ok) {
        setFeedback(context.error ?? "Failed to fetch context.", true);
        return;
      }

      const problemContext = context.data ?? {
        problem: null,
        studyState: null,
      };
      const currentDifficulty = problemContext.problem?.difficulty ?? detectedDifficulty;
      const currentState = problemContext.studyState ?? null;
      const currentTitle = problemContext.problem?.title ?? title;

      setState((current) => ({
        ...current,
        currentDifficulty,
        currentState,
        currentTitle,
        draftContextSlug:
          current.draftContextSlug !== slug ? slug : current.draftContextSlug,
        draftNotes:
          current.draftContextSlug !== slug
            ? currentState?.notes ?? ""
            : current.draftNotes,
        feedbackIsError: false,
        selectedMode: defaultReviewMode(currentState),
        selectedRating:
          current.draftContextSlug !== slug
            ? (currentState?.lastRating ?? 2)
            : current.selectedRating,
      }));
    },
    [documentRef, setFeedback, windowRef]
  );

  const persistReview = useCallback(
    async (
      slug: string,
      rating: Rating,
      mode: ReviewMode,
      solveTimeMs?: number
    ): Promise<boolean> => {
      const response = await saveReviewResult({
        slug,
        rating,
        mode,
        solveTimeMs,
        notes: state.draftNotes,
        source: "overlay",
      });

      if (!response.ok) {
        setFeedback(response.error ?? "Failed to save review.", true);
        return false;
      }

      return true;
    },
    [setFeedback, state.draftNotes]
  );

  const quickRating = useMemo(
    () => deriveQuickRating(elapsedMs, goalForDifficulty(state.currentDifficulty)),
    [elapsedMs, state.currentDifficulty]
  );

  const onQuickSubmit = useCallback(async (): Promise<void> => {
    if (!state.activeSlug) {
      return;
    }

    setFeedback("Logging quick submit...");

    if (isTimerRunning()) {
      pauseTimer(false);
    }

    const solveTimeMs = getElapsedMs() > 0 ? getElapsedMs() : undefined;
    const rating = deriveQuickRating(
      solveTimeMs,
      goalForDifficulty(state.currentDifficulty)
    );

    setState((current) => ({
      ...current,
      selectedRating: rating,
    }));

    const saved = await persistReview(
      state.activeSlug,
      rating,
      defaultReviewMode(state.currentState),
      solveTimeMs
    );
    if (!saved) {
      return;
    }

    resetTimer(false);

    if (solveTimeMs) {
      setFeedback(
        `Logged ${ratingLabel(rating)} from ${formatClock(
          solveTimeMs
        )} against a ${formatClock(goalForDifficulty(state.currentDifficulty))} goal.`
      );
    } else {
      setFeedback(
        "Logged Good with default settings. Expand the panel if you want to override the recalibration."
      );
    }

    await refreshCurrentPage(state.activeSlug);
  }, [
    getElapsedMs,
    isTimerRunning,
    pauseTimer,
    persistReview,
    refreshCurrentPage,
    resetTimer,
    setFeedback,
    state.activeSlug,
    state.currentDifficulty,
    state.currentState,
  ]);

  const onSaveReview = useCallback(async (): Promise<void> => {
    if (!state.activeSlug) {
      return;
    }

    setFeedback("Saving recalibration...");

    if (isTimerRunning()) {
      pauseTimer(false);
    }

    const solveTimeMs = getElapsedMs() > 0 ? getElapsedMs() : undefined;
    const saved = await persistReview(
      state.activeSlug,
      state.selectedRating,
      state.selectedMode,
      solveTimeMs
    );
    if (!saved) {
      return;
    }

    setFeedback("Saved. Recomputing status...");
    resetTimer(false);
    await refreshCurrentPage(state.activeSlug);
  }, [
    getElapsedMs,
    isTimerRunning,
    pauseTimer,
    persistReview,
    refreshCurrentPage,
    resetTimer,
    setFeedback,
    state.activeSlug,
    state.selectedMode,
    state.selectedRating,
  ]);

  const scheduleWarmRefreshes = useCallback(
    (slug: string) => {
      clearWarmRefreshes();
      for (const delayMs of [600, 1800]) {
        const handle = windowRef.setTimeout(() => {
          if (activeSlugRef.current === slug) {
            void refreshCurrentPage(slug);
          }
        }, delayMs);
        warmRefreshHandlesRef.current.push(handle);
      }
    },
    [clearWarmRefreshes, refreshCurrentPage, windowRef]
  );

  const bootstrap = useCallback(async (): Promise<void> => {
    const slug = getProblemSlugFromUrl(windowRef.location.href);
    if (!slug) {
      ++requestTokenRef.current;
      activeSlugRef.current = "";
      clearWarmRefreshes();
      resetTimer(false);
      setTimerRunning(false);
      setState((current) => ({
        ...current,
        activeSlug: "",
        currentDifficulty: "Unknown",
        currentState: null,
        currentTitle: "",
        draftContextSlug: "",
        draftNotes: "",
        feedbackIsError: false,
        feedbackMessage: "",
        selectedMode: "FULL_SOLVE",
        selectedRating: 2,
      }));
      return;
    }

    if (slug === activeSlugRef.current) {
      return;
    }

    ++requestTokenRef.current;
      activeSlugRef.current = slug;
      clearWarmRefreshes();
      resetTimer(false);
      setTimerRunning(false);
    setState((current) => ({
      ...current,
      activeSlug: slug,
      currentState: null,
      currentTitle: detectTitle(documentRef, slug),
      currentDifficulty: detectDifficulty(documentRef),
      draftContextSlug: "",
      draftNotes: "",
      feedbackIsError: false,
      feedbackMessage: "",
      selectedMode: "FULL_SOLVE",
      selectedRating: 2,
    }));

    await refreshCurrentPage(slug);
    scheduleWarmRefreshes(slug);
  }, [
    clearWarmRefreshes,
    documentRef,
    refreshCurrentPage,
    resetTimer,
    scheduleWarmRefreshes,
    windowRef.location.href,
  ]);

  useEffect(() => {
    const handle = windowRef.setTimeout(() => {
      void bootstrap();
    }, 0);

    return () => {
      windowRef.clearTimeout(handle);
    };
  }, [bootstrap, windowRef]);

  useEffect(() => {
    const handle = windowRef.setInterval(() => {
      if (windowRef.location.href !== lastHrefRef.current) {
        lastHrefRef.current = windowRef.location.href;
        void bootstrap();
      }
    }, 1000);

    return () => {
      windowRef.clearInterval(handle);
    };
  }, [bootstrap, windowRef]);

  useEffect(() => {
    return () => {
      clearWarmRefreshes();
      clearTick();
    };
  }, [clearTick, clearWarmRefreshes]);

  if (!state.activeSlug) {
    return { panelProps: null };
  }

  const studyStateSummary = getStudyStateSummary(state.currentState);

  return {
    panelProps: {
      canReset: timerRunning || elapsedMs > 0,
      collapsed: state.collapsed,
      difficulty: state.currentDifficulty,
      feedback:
        state.feedbackMessage ||
        (studyStateSummary.nextReviewAt
          ? `Next review ${formatDate(studyStateSummary.nextReviewAt)}`
          : "Open details to adjust recalibration or add notes."),
      feedbackIsError: state.feedbackIsError,
      goalDisplay: `Goal ${formatClock(goalForDifficulty(state.currentDifficulty))}`,
      hint: timerRunning
        ? "Timer running. Submit logs with the conservative protocol unless you override it."
        : elapsedMs > 0
          ? `Paused at ${formatClock(elapsedMs)}. Quick submit will log ${ratingLabel(
              quickRating
            )} based on that run.`
          : "Quick submit logs Good by default. Start the timer if you want solve time to drive the default rating.",
      isDue: studyStateSummary.isDue,
      isTimerRunning: timerRunning,
      lastReviewedLabel: studyStateSummary.lastReviewedAt
        ? `Last ${formatDate(studyStateSummary.lastReviewedAt)}`
        : "No logged review yet",
      modeBadgeLabel: modeBadge(state.currentState),
      nextReviewLabel: studyStateSummary.nextReviewAt
        ? `Next review ${formatDate(studyStateSummary.nextReviewAt)}`
        : "Open details to adjust recalibration or add notes.",
      notes: state.draftNotes,
      onChangeMode: (mode: ReviewMode) => {
        setState((current) => ({
          ...current,
          selectedMode: mode,
        }));
      },
      onChangeNotes: (value: string) => {
        setState((current) => ({
          ...current,
          draftNotes: value,
        }));
      },
      onOpenSettings: () => {
        void openExtensionPage("dashboard.html?view=settings");
      },
      onPauseTimer: () => {
        pauseTimer(true);
      },
      onQuickSubmit: () => {
        void onQuickSubmit();
      },
      onRefresh: () => {
        void refreshCurrentPage(state.activeSlug);
      },
      onResetTimer: () => {
        resetTimer(true);
      },
      onSaveReview: () => {
        void onSaveReview();
      },
      onSelectRating: (rating: Rating) => {
        setState((current) => ({
          ...current,
          selectedRating: rating,
        }));
      },
      onStartTimer: () => {
        startTimer(true);
      },
      onToggleCollapse: () => {
        setState((current) => ({
          ...current,
          collapsed: !current.collapsed,
        }));
      },
      phaseLabel: getStudyPhaseLabel(studyStateSummary.phase),
      phaseTone: phaseTone(studyStateSummary.phase),
      quickRatingLabel: `Default ${ratingLabel(quickRating)}`,
      saveButtonLabel: studyStateSummary.reviewCount
        ? "Save Override"
        : "Save First Solve",
      selectedMode: state.selectedMode,
      selectedRating: state.selectedRating,
      timerDisplay: formatClock(elapsedMs),
      title: state.currentTitle,
    },
  };
}
