/** Overlay controller that composes page bootstrap, timer state, session state, and render-model shaping. */
import {useCallback, useEffect, useRef} from "react";

import {
  getProblemContext,
  openExtensionPage,
  upsertProblemFromPage,
} from "../../../data/repositories/problemSessionRepository";
import {formatClock} from "../../../domain/common/time";
import {defaultReviewMode, deriveQuickRating, goalForDifficulty} from "../../../domain/fsrs/reviewPolicy";
import {Rating} from "../../../domain/types";

import {draftsEqual} from "./controller/draftFields";
import {buildHeaderStatus, buildSessionLabel} from "./controller/headerStatus";
import {
  getProblemSlugFromUrl,
  isStaleOverlayRequest,
  readProblemPageSnapshot,
} from "./controller/pageContext";
import {useOverlaySessionMachine} from "./controller/useOverlaySessionMachine";
import {useOverlayTimer} from "./controller/useOverlayTimer";
import {OverlayRenderModel, OverlayTimerSectionViewModel} from "./overlayPanel.types";

export interface OverlayControllerEnvironment {
  documentRef: Document;
  windowRef: Window;
}

/** Coordinates overlay orchestration while delegating timer/session logic to dedicated hooks. */
export function useOverlayController(
  environment: OverlayControllerEnvironment
): { renderModel: OverlayRenderModel | null } {
  const {documentRef, windowRef} = environment;
  const timer = useOverlayTimer(windowRef);
  const {
    activateProblem,
    applyProblemContext,
    clearActiveProblem,
    pauseTimer,
    resetTimer,
    restartSession,
    saveOverride,
    selectRating,
    setFeedback,
    startTimer,
    state: currentState,
    submitRating: persistSubmittedRating,
    toggleCollapse,
    updateDraft,
  } = useOverlaySessionMachine({timer, windowRef});
  const activeSlugRef = useRef("");
  const lastHrefRef = useRef(windowRef.location.href);
  const requestTokenRef = useRef(0);
  const warmRefreshHandlesRef = useRef<number[]>([]);

  const clearWarmRefreshes = useCallback(() => {
    for (const handle of warmRefreshHandlesRef.current) {
      windowRef.clearTimeout(handle);
    }
    warmRefreshHandlesRef.current = [];
  }, [windowRef]);

  const refreshCurrentPage = useCallback(
    async (slugOverride?: string): Promise<void> => {
      const slug =
        slugOverride ?? getProblemSlugFromUrl(windowRef.location.href);
      if (!slug) {
        return;
      }

      const requestToken = ++requestTokenRef.current;
      const pageSnapshot = readProblemPageSnapshot(documentRef, slug);

      const upsert = await upsertProblemFromPage({
        slug,
        title: pageSnapshot.title,
        difficulty: pageSnapshot.difficulty,
        url: `https://leetcode.com/problems/${slug}/`,
      });

      if (
        isStaleOverlayRequest(
          requestToken,
          requestTokenRef.current,
          activeSlugRef.current,
          slug
        )
      ) {
        return;
      }

      if (!upsert.ok) {
        setFeedback(upsert.error ?? "Failed to sync problem.", true);
        return;
      }

      const context = await getProblemContext(slug);
      if (
        isStaleOverlayRequest(
          requestToken,
          requestTokenRef.current,
          activeSlugRef.current,
          slug
        )
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
      applyProblemContext({
        difficulty: problemContext.problem?.difficulty ?? pageSnapshot.difficulty,
        slug,
        studyState: problemContext.studyState ?? null,
        title: problemContext.problem?.title ?? pageSnapshot.title,
      });
    },
    [applyProblemContext, documentRef, setFeedback, windowRef]
  );

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
      clearActiveProblem();
      return;
    }

    if (slug === activeSlugRef.current) {
      return;
    }

    ++requestTokenRef.current;
    activeSlugRef.current = slug;
    clearWarmRefreshes();
    activateProblem(readProblemPageSnapshot(documentRef, slug));

    await refreshCurrentPage(slug);
    scheduleWarmRefreshes(slug);
  }, [
    activateProblem,
    clearActiveProblem,
    clearWarmRefreshes,
    documentRef,
    refreshCurrentPage,
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
    };
  }, [clearWarmRefreshes]);

  if (!currentState.activeSlug) {
    return {renderModel: null};
  }

  const sessionMode =
    currentState.submittedSession?.mode ??
    defaultReviewMode(currentState.currentState);
  const canSubmit = currentState.submittedSession === null;
  const canUpdate =
    currentState.submittedSession !== null &&
    (
      currentState.submittedSession.rating !== currentState.selectedRating ||
      !draftsEqual(currentState.submittedSession.draft, currentState.draft)
    );
  const canRestart = currentState.submittedSession !== null;

  const refreshAfterMutation = async (persistedSlug: string | null) => {
    if (persistedSlug) {
      await refreshCurrentPage(persistedSlug);
    }
  };

  const submitRating = async (rating: Rating) => {
    const persistedSlug = await persistSubmittedRating(rating);
    await refreshAfterMutation(persistedSlug);
  };

  const onCompactSubmit = () => {
    const rating = deriveQuickRating(
      timer.readElapsedMs() > 0 ? timer.readElapsedMs() : undefined,
      goalForDifficulty(currentState.currentDifficulty)
    );
    void submitRating(rating);
  };

  const onFailReview = () => {
    void submitRating(0);
  };

  const onSaveOverride = () => {
    void saveOverride().then(refreshAfterMutation);
  };

  const baseTimerModel: OverlayTimerSectionViewModel = {
    canPause: canSubmit,
    canReset: canSubmit && (timer.isRunning || timer.elapsedMs > 0),
    canStart: canSubmit || canRestart,
    display: formatClock(timer.elapsedMs),
    isRunning: timer.isRunning,
    onPause: pauseTimer,
    onReset: resetTimer,
    onStart: startTimer,
    startLabel: timer.isRunning
      ? "Pause timer"
      : canRestart && !canSubmit
        ? "Start a new session"
        : "Start timer",
  };

  if (currentState.collapsed) {
    return {
      renderModel: {
        model: {
          actions: {
            canFail: canSubmit,
            canSubmit,
            onFail: onFailReview,
            onSubmit: onCompactSubmit,
            onToggleCollapse: toggleCollapse,
          },
          timer: baseTimerModel,
        },
        variant: "collapsed",
      },
    };
  }

  return {
    renderModel: {
      model: {
        actions: {
          canFail: canSubmit,
          canRestart,
          canSubmit,
          canUpdate,
          onFail: onFailReview,
          onRestart: () => {
            restartSession(false);
          },
          onSubmit: () => {
            void submitRating(currentState.selectedRating);
          },
          onUpdate: onSaveOverride,
        },
        assessment: {
          onSelectRating: selectRating,
          selectedRating: currentState.selectedRating,
        },
        feedback: currentState.feedbackMessage
          ? {
            isError: currentState.feedbackIsError,
            message: currentState.feedbackMessage,
          }
          : null,
        header: {
          difficulty: currentState.currentDifficulty,
          onOpenSettings: () => {
            void openExtensionPage("dashboard.html?view=settings");
          },
          onToggleCollapse: toggleCollapse,
          sessionLabel: buildSessionLabel(
            currentState.currentState,
            sessionMode
          ),
          status: buildHeaderStatus(currentState.currentState),
          title: currentState.currentTitle,
        },
        log: {
          draft: currentState.draft,
          onChange: updateDraft,
        },
        timer: {
          ...baseTimerModel,
          targetDisplay: formatClock(goalForDifficulty(currentState.currentDifficulty)),
        },
      },
      variant: "expanded",
    },
  };
}
