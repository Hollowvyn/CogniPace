/** Overlay controller that composes page bootstrap, timer state, session state, and render-model shaping. */
import { useCallback, useEffect, useRef, useState } from "react";

import { fetchAppShellPayload } from "../../../data/repositories/appShellRepository";
import {
  getProblemContext,
  openExtensionPage,
  openProblemPage,
  upsertProblemFromPage,
} from "../../../data/repositories/problemSessionRepository";
import { DEFAULT_SETTINGS } from "../../../domain/common/constants";
import { formatClock } from "../../../domain/common/time";
import {
  defaultReviewMode,
  deriveQuickRating,
  goalForDifficulty,
} from "../../../domain/fsrs/reviewPolicy";
import { Rating, UserSettings } from "../../../domain/types";
import { AppShellPayload } from "../../../domain/views";

import { draftsEqual } from "./controller/draftFields";
import {
  buildHeaderStatus,
  buildSessionLabel,
} from "./controller/headerStatus";
import {
  getProblemSlugFromUrl,
  isStaleOverlayRequest,
  readProblemPageSnapshot,
} from "./controller/pageContext";
import { useOverlaySessionMachine } from "./controller/useOverlaySessionMachine";
import { useOverlayTimer } from "./controller/useOverlayTimer";
import {
  OverlayPostSubmitNextViewModel,
  OverlayRenderModel,
  OverlayTimerSectionViewModel,
} from "./overlayPanel.types";

export interface OverlayControllerEnvironment {
  documentRef: Document;
  windowRef: Window;
}

/** Coordinates overlay orchestration while delegating timer/session logic to dedicated hooks. */
export function useOverlayController(
  environment: OverlayControllerEnvironment
): { renderModel: OverlayRenderModel | null } {
  const { documentRef, windowRef } = environment;
  const timer = useOverlayTimer(windowRef);
  const [postSubmitNext, setPostSubmitNext] =
    useState<OverlayPostSubmitNextViewModel | null>(null);
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const {
    activateProblem,
    applyProblemContext,
    clearActiveProblem,
    collapse,
    dock,
    expand,
    pauseTimer,
    persistDraft,
    resetTimer,
    restartSession,
    saveOverride,
    selectRating,
    setFeedback,
    startTimer,
    state: currentState,
    submitRating: persistSubmittedRating,
    updateDraft,
  } = useOverlaySessionMachine({ timer, windowRef });
  const activeSlugRef = useRef("");
  const lastHrefRef = useRef(windowRef.location.href);
  const postSubmitRequestTokenRef = useRef(0);
  const requestTokenRef = useRef(0);
  const warmRefreshHandlesRef = useRef<number[]>([]);

  const clearWarmRefreshes = useCallback(() => {
    for (const handle of warmRefreshHandlesRef.current) {
      windowRef.clearTimeout(handle);
    }
    warmRefreshHandlesRef.current = [];
  }, [windowRef]);

  const clearPostSubmitNext = useCallback(() => {
    postSubmitRequestTokenRef.current += 1;
    setPostSubmitNext(null);
  }, []);

  const showPostSubmitLoading = useCallback(() => {
    setPostSubmitNext({
      kind: "loading",
      title: "Finding next question",
      message: "Review saved. Pulling the latest recommendation now.",
    });
  }, []);

  const openOverlayProblem = useCallback(
    async (target: { slug: string; courseId?: string; chapterId?: string }) => {
      const response = await openProblemPage(target);
      if (!response.ok) {
        setFeedback(response.error ?? "Failed to open problem.", true);
      }
    },
    [setFeedback]
  );

  const derivePostSubmitNext = useCallback(
    (
      payload: AppShellPayload,
      currentSlug: string
    ): OverlayPostSubmitNextViewModel | null => {
      const fallbackRecommended =
        payload.popup.recommendedCandidates.find(
          (candidate) => candidate.slug !== currentSlug
        ) ??
        (payload.popup.recommended &&
        payload.popup.recommended.slug !== currentSlug
          ? payload.popup.recommended
          : null);

      if (
        payload.settings.studyMode === "studyPlan" &&
        payload.popup.courseNext &&
        payload.popup.courseNext.slug !== currentSlug
      ) {
        return {
          kind: "course",
          activeCourseId: payload.activeCourse?.id,
          onOpenProblem: openOverlayProblem,
          view: payload.popup.courseNext,
        };
      }

      if (fallbackRecommended) {
        return {
          kind: "recommended",
          onOpenProblem: openOverlayProblem,
          recommended: fallbackRecommended,
        };
      }

      return null;
    },
    [openOverlayProblem]
  );

  const refreshPostSubmitNext = useCallback(
    async (currentSlug: string) => {
      const requestToken = ++postSubmitRequestTokenRef.current;
      const response = await fetchAppShellPayload();
      if (requestToken !== postSubmitRequestTokenRef.current) {
        return;
      }

      if (
        !response.ok ||
        !response.data ||
        !("settings" in response.data) ||
        !("popup" in response.data)
      ) {
        setPostSubmitNext({
          kind: "empty",
          title: "Next question unavailable",
          message:
            response.error ??
            "Review saved, but the overlay could not load the latest recommendation.",
        });
        return;
      }

      setPostSubmitNext(
        derivePostSubmitNext(response.data, currentSlug) ?? {
          kind: "empty",
          title: "No next question ready",
          message:
            "Review saved. The current study queue does not have another question ready.",
        }
      );
    },
    [derivePostSubmitNext]
  );

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

      const [context, shell] = await Promise.all([
        getProblemContext(slug),
        fetchAppShellPayload(),
      ]);
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

      if (shell.ok && shell.data?.settings) {
        setSettings(shell.data.settings);
      }

      const problemContext = context.data ?? {
        problem: null,
        studyState: null,
      };
      applyProblemContext({
        difficulty:
          problemContext.problem?.difficulty ?? pageSnapshot.difficulty,
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
      clearPostSubmitNext();
      clearActiveProblem();
      return;
    }

    if (slug === activeSlugRef.current) {
      return;
    }

    ++requestTokenRef.current;
    activeSlugRef.current = slug;
    clearWarmRefreshes();
    clearPostSubmitNext();
    activateProblem(readProblemPageSnapshot(documentRef, slug));

    await refreshCurrentPage(slug);
    scheduleWarmRefreshes(slug);
  }, [
    activateProblem,
    clearActiveProblem,
    clearPostSubmitNext,
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
    return { renderModel: null };
  }

  const sessionMode =
    currentState.submittedSession?.mode ??
    defaultReviewMode(currentState.currentState);
  const canSubmit = currentState.submittedSession === null;
  const canUpdate =
    currentState.submittedSession !== null &&
    (currentState.submittedSession.rating !== currentState.selectedRating ||
      !draftsEqual(currentState.submittedSession.draft, currentState.draft));
  const canRestart = currentState.submittedSession !== null;
  const feedback = currentState.feedbackMessage
    ? {
        isError: currentState.feedbackIsError,
        message: currentState.feedbackMessage,
      }
    : null;
  const assessmentAssist = {
    id: "overlay-assessment-help",
    message: currentState.failureLocked
      ? "Failed sessions stay locked to Again until you restart and open a fresh attempt."
      : currentState.selectedRating === 3
        ? "Easy means the solution felt immediate and you can trust the recall."
        : currentState.selectedRating === 2
          ? "Good means you finished with steady recall but not instantly."
          : currentState.selectedRating === 1
            ? "Hard means you got there with friction and should expect a sooner review."
            : "Again means you could not complete it and want the shortest review interval.",
    tone: currentState.failureLocked
      ? "danger"
      : currentState.selectedRating === 0
        ? "danger"
        : currentState.selectedRating === 1
          ? "warning"
          : currentState.selectedRating === 3
            ? "success"
            : "accent",
  } as const;
  const actionAssist = {
    id: "overlay-action-help",
    message: currentState.submittedSession
      ? "Submit is locked for this session. Update replaces the latest saved result; Restart opens a fresh local attempt."
      : "Submit saves this attempt. Use the selected assessment if you need more control than the compact quick-submit path.",
    tone: currentState.submittedSession ? "accent" : "default",
  } as const;
  const collapsedAssist = {
    id: "overlay-collapsed-help",
    message: currentState.submittedSession
      ? "Result saved. Expand to update or restart this session."
      : "Collapsed mode keeps timer and quick review actions one click away.",
    tone: currentState.submittedSession ? "accent" : "default",
  } as const;

  const refreshAfterMutation = async (persistedSlug: string | null) => {
    if (persistedSlug) {
      await refreshCurrentPage(persistedSlug);
    }
  };

  const submitRating = async (
    rating: Rating,
    options?: {
      lockFailureRating?: boolean;
    }
  ) => {
    const persistedSlug = await persistSubmittedRating(rating, options);
    if (!persistedSlug) {
      clearPostSubmitNext();
      return;
    }
    showPostSubmitLoading();
    await refreshAfterMutation(persistedSlug);
    await refreshPostSubmitNext(persistedSlug);
  };

  const onCompactSubmit = () => {
    const rating = deriveQuickRating(
      timer.readElapsedMs() > 0 ? timer.readElapsedMs() : undefined,
      goalForDifficulty(
        currentState.currentDifficulty,
        settings.difficultyGoalMs
      )
    );
    void submitRating(rating);
  };

  const onFailReview = () => {
    void submitRating(0, { lockFailureRating: true });
  };

  const onSaveOverride = () => {
    void saveOverride().then(async (persistedSlug) => {
      if (!persistedSlug) {
        return;
      }
      showPostSubmitLoading();
      await refreshAfterMutation(persistedSlug);
      await refreshPostSubmitNext(persistedSlug);
    });
  };

  const onCollapseOverlay = async () => {
    if (currentState.visualMode === "collapsed") {
      return;
    }

    if (
      currentState.activeSlug &&
      !draftsEqual(currentState.draft, currentState.persistedDraft)
    ) {
      await persistDraft(currentState.activeSlug, currentState.draft);
    }

    collapse();
  };

  const onHideOverlay = async () => {
    if (currentState.visualMode === "docked") {
      return;
    }

    if (
      currentState.activeSlug &&
      !draftsEqual(currentState.draft, currentState.persistedDraft)
    ) {
      await persistDraft(currentState.activeSlug, currentState.draft);
    }

    dock();
  };

  const baseTimerModel: OverlayTimerSectionViewModel = {
    canPause: canSubmit,
    canReset: canSubmit && (timer.isRunning || timer.elapsedMs > 0),
    canStart: canSubmit || canRestart,
    display: formatClock(timer.elapsedMs),
    isRunning: timer.isRunning,
    onPause: pauseTimer,
    onReset: resetTimer,
    onStart: () => {
      if (canRestart) {
        clearPostSubmitNext();
      }
      startTimer();
    },
    startLabel: timer.isRunning
      ? "Pause timer"
      : canRestart && !canSubmit
        ? "Start a new session"
        : "Start timer",
  };

  if (currentState.visualMode === "collapsed") {
    return {
      renderModel: {
        model: {
          actions: {
            canFail: canSubmit,
            onHide: () => {
              void onHideOverlay();
            },
            canSubmit,
            onExpand: expand,
            onFail: onFailReview,
            onSubmit: onCompactSubmit,
          },
          assist: collapsedAssist,
          feedback,
          timer: baseTimerModel,
        },
        variant: "collapsed",
      },
    };
  }

  if (currentState.visualMode === "docked") {
    return {
      renderModel: {
        model: {
          onRestore: collapse,
        },
        variant: "docked",
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
            clearPostSubmitNext();
            restartSession(false);
          },
          onSubmit: () => {
            void submitRating(currentState.selectedRating);
          },
          onUpdate: onSaveOverride,
        },
        assessment: {
          disabledRatings: currentState.failureLocked ? [1, 2, 3] : [],
          onSelectRating: selectRating,
          selectedRating: currentState.selectedRating,
        },
        assessmentAssist,
        actionAssist,
        feedback,
        header: {
          difficulty: currentState.currentDifficulty,
          onCollapse: () => {
            void onCollapseOverlay();
          },
          onHide: () => {
            void onHideOverlay();
          },
          onOpenSettings: () => {
            void openExtensionPage("dashboard.html?view=settings");
          },
          sessionLabel: buildSessionLabel(
            currentState.currentState,
            sessionMode
          ),
          status: buildHeaderStatus(currentState.currentState),
          title: currentState.currentTitle,
        },
        onClickAway: () => {
          void onCollapseOverlay();
        },
        log: {
          draft: currentState.draft,
          onChange: updateDraft,
        },
        postSubmitNext,
        timer: {
          ...baseTimerModel,
          targetDisplay: formatClock(
            goalForDifficulty(
              currentState.currentDifficulty,
              settings.difficultyGoalMs
            )
          ),
        },
      },
      variant: "expanded",
    },
  };
}
