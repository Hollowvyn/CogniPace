import {
  overrideLastReviewResult,
  saveOverlayLogDraft,
  saveReviewResult,
} from "@features/problems";
import {useCallback, useState} from "react";

import {Difficulty, Rating, ReviewMode, StudyState} from "../../../../../domain/types";
import {defaultReviewMode} from "../../../domain/policy/reviewPolicy";
import {OverlayDraftLogFields} from "../overlayPanel.types";

import {cloneDraft, draftFromStudyState, emptyDraft, reviewPayloadFromDraft,} from "./draftFields";
import {OverlayTimerController} from "./useOverlayTimer";

interface SubmittedSessionSnapshot {
  draft: OverlayDraftLogFields;
  mode: ReviewMode;
  rating: Rating;
  solveTimeMs?: number;
}

interface OverlaySessionState {
  activeSlug: string;
  currentDifficulty: Difficulty;
  currentState: StudyState | null;
  currentTitle: string;
  draft: OverlayDraftLogFields;
  draftContextSlug: string;
  failureLocked: boolean;
  feedbackIsError: boolean;
  feedbackMessage: string;
  persistedDraft: OverlayDraftLogFields;
  selectedRating: Rating;
  submittedSession: SubmittedSessionSnapshot | null;
  visualMode: "collapsed" | "docked" | "expanded";
}

interface ActivateOverlayProblemArgs {
  difficulty: Difficulty;
  slug: string;
  title: string;
}

interface ApplyOverlayProblemContextArgs {
  difficulty: Difficulty;
  slug: string;
  studyState: StudyState | null;
  title: string;
}

const initialOverlaySessionState: OverlaySessionState = {
  activeSlug: "",
  currentDifficulty: "Unknown",
  currentState: null,
  currentTitle: "",
  draft: emptyDraft(),
  draftContextSlug: "",
  failureLocked: false,
  feedbackIsError: false,
  feedbackMessage: "",
  persistedDraft: emptyDraft(),
  selectedRating: 2,
  submittedSession: null,
  visualMode: "collapsed",
};

interface OverlaySessionMachineArgs {
  timer: OverlayTimerController;
  windowRef: Window;
}

export function useOverlaySessionMachine(
  args: OverlaySessionMachineArgs
) {
  const {timer, windowRef} = args;
  const [state, setState] = useState<OverlaySessionState>(
    initialOverlaySessionState
  );

  const setFeedback = useCallback((message: string, isError = false) => {
    setState((current) => ({
      ...current,
      feedbackIsError: isError,
      feedbackMessage: message,
    }));
  }, []);

  const clearFeedback = useCallback(() => {
    setState((current) => ({
      ...current,
      feedbackIsError: false,
      feedbackMessage: "",
    }));
  }, []);

  const clearActiveProblem = useCallback(() => {
    timer.reset();
    setState((current) => ({
      ...current,
      activeSlug: "",
      currentDifficulty: "Unknown",
      currentState: null,
      currentTitle: "",
      draft: emptyDraft(),
      draftContextSlug: "",
      failureLocked: false,
      feedbackIsError: false,
      feedbackMessage: "",
      persistedDraft: emptyDraft(),
      selectedRating: 2,
      submittedSession: null,
      visualMode: "collapsed",
    }));
  }, [timer]);

  const activateProblem = useCallback(
    ({difficulty, slug, title}: ActivateOverlayProblemArgs) => {
      timer.reset();
      setState((current) => ({
        ...current,
        activeSlug: slug,
        currentDifficulty: difficulty,
        currentState: null,
        currentTitle: title,
        draft: emptyDraft(),
        draftContextSlug: "",
        failureLocked: false,
        feedbackIsError: false,
        feedbackMessage: "",
        persistedDraft: emptyDraft(),
        selectedRating: 2,
        submittedSession: null,
        visualMode: "collapsed",
      }));
    },
    [timer]
  );

  const applyProblemContext = useCallback(
    ({difficulty, slug, studyState, title}: ApplyOverlayProblemContextArgs) => {
      const nextDraft = draftFromStudyState(studyState);

      setState((current) => ({
        ...current,
        currentDifficulty: difficulty,
        currentState: studyState,
        currentTitle: title,
        persistedDraft: nextDraft,
        draftContextSlug:
          current.draftContextSlug !== slug ? slug : current.draftContextSlug,
        draft:
          current.draftContextSlug !== slug
            ? nextDraft
            : current.draft,
        feedbackIsError: false,
        feedbackMessage: "",
        selectedRating:
          current.draftContextSlug !== slug
            ? (studyState?.lastRating ?? 2)
            : current.selectedRating,
      }));
    },
    []
  );

  const updateDraft = useCallback(
    (field: keyof OverlayDraftLogFields, value: string) => {
      setState((current) => ({
        ...current,
        draft: {
          ...current.draft,
          [field]: value,
        },
      }));
    },
    []
  );

  const selectRating = useCallback((rating: Rating) => {
    setState((current) => ({
      ...current,
      selectedRating: rating,
    }));
  }, []);

  const collapse = useCallback(() => {
    setState((current) => ({
      ...current,
      visualMode: "collapsed",
    }));
  }, []);

  const expand = useCallback(() => {
    setState((current) => ({
      ...current,
      visualMode: "expanded",
    }));
  }, []);

  const dock = useCallback(() => {
    setState((current) => ({
      ...current,
      visualMode: "docked",
    }));
  }, []);

  const persistReview = useCallback(
    async (
      slug: string,
      rating: Rating,
      mode: ReviewMode,
      solveTimeMs: number | undefined,
      draft: OverlayDraftLogFields
    ): Promise<boolean> => {
      const response = await saveReviewResult({
        slug,
        rating,
        mode,
        solveTimeMs,
        ...reviewPayloadFromDraft(draft),
        source: "overlay",
      });

      if (!response.ok) {
        setFeedback(response.error ?? "Failed to save review.", true);
        return false;
      }

      return true;
    },
    [setFeedback]
  );

  const persistOverride = useCallback(
    async (
      slug: string,
      rating: Rating,
      mode: ReviewMode,
      solveTimeMs: number | undefined,
      draft: OverlayDraftLogFields
    ): Promise<boolean> => {
      const response = await overrideLastReviewResult({
        slug,
        rating,
        mode,
        solveTimeMs,
        ...reviewPayloadFromDraft(draft),
        source: "overlay",
      });

      if (!response.ok) {
        setFeedback(response.error ?? "Failed to save override.", true);
        return false;
      }

      return true;
    },
    [setFeedback]
  );

  const persistDraft = useCallback(
    async (
      slug: string,
      draft: OverlayDraftLogFields
    ): Promise<boolean> => {
      const response = await saveOverlayLogDraft({
        slug,
        ...reviewPayloadFromDraft(draft),
      });

      if (!response.ok) {
        setFeedback(response.error ?? "Failed to save log draft.", true);
        return false;
      }

      setState((current) => ({
        ...current,
        currentState: current.currentState
          ? {
            ...current.currentState,
            ...reviewPayloadFromDraft(draft),
          }
          : current.currentState,
        persistedDraft: cloneDraft(draft),
      }));

      return true;
    },
    [setFeedback]
  );

  const submitRating = useCallback(
    async (
      rating: Rating,
      options?: {
        lockFailureRating?: boolean;
        solveTimeMs?: number;
      }
    ): Promise<string | null> => {
      if (!state.activeSlug || state.submittedSession) {
        return null;
      }

      if (timer.isRunning) {
        timer.pause();
      }

      const elapsedMs = options?.solveTimeMs ?? timer.readElapsedMs();
      const solveTimeMs = elapsedMs > 0 ? elapsedMs : undefined;
      const mode = defaultReviewMode(state.currentState);
      const draftSnapshot = cloneDraft(state.draft);
      const saved = await persistReview(
        state.activeSlug,
        rating,
        mode,
        solveTimeMs,
        draftSnapshot
      );
      if (!saved) {
        return null;
      }

      setState((current) => ({
        ...current,
        currentState: current.currentState
          ? {
            ...current.currentState,
            ...reviewPayloadFromDraft(draftSnapshot),
            lastRating: rating,
            lastSolveTimeMs: solveTimeMs,
          }
          : current.currentState,
        failureLocked: options?.lockFailureRating === true,
        persistedDraft: draftSnapshot,
        selectedRating: rating,
        submittedSession: {
          draft: draftSnapshot,
          mode,
          rating,
          solveTimeMs,
        },
        visualMode: "expanded",
      }));

      return state.activeSlug;
    },
    [
      persistReview,
      state.activeSlug,
      state.currentState,
      state.draft,
      state.submittedSession,
      timer,
    ]
  );

  const saveOverride = useCallback(async (): Promise<string | null> => {
    if (!state.activeSlug || !state.submittedSession) {
      return null;
    }

    const draftSnapshot = cloneDraft(state.draft);
    const saved = await persistOverride(
      state.activeSlug,
      state.selectedRating,
      state.submittedSession.mode,
      state.submittedSession.solveTimeMs,
      draftSnapshot
    );
    if (!saved) {
      return null;
    }

    setState((current) => ({
      ...current,
      currentState: current.currentState
        ? {
          ...current.currentState,
          ...reviewPayloadFromDraft(draftSnapshot),
          lastRating: state.selectedRating,
        }
        : current.currentState,
      persistedDraft: draftSnapshot,
      submittedSession: current.submittedSession
        ? {
          ...current.submittedSession,
          draft: draftSnapshot,
          rating: state.selectedRating,
        }
        : null,
    }));

    return state.activeSlug;
  }, [
    persistOverride,
    state.activeSlug,
    state.draft,
    state.selectedRating,
    state.submittedSession,
  ]);

  const restartSession = useCallback(
    (startTimerAfterRestart: boolean) => {
      timer.reset();
      setState((current) => ({
        ...current,
        draft: draftFromStudyState(current.currentState),
        feedbackIsError: false,
        feedbackMessage: "",
        failureLocked: false,
        selectedRating: current.currentState?.lastRating ?? 2,
        submittedSession: null,
      }));

      if (startTimerAfterRestart) {
        windowRef.setTimeout(() => {
          timer.start();
        }, 0);
      }
    },
    [timer, windowRef]
  );

  const startTimer = useCallback(() => {
    if (state.submittedSession) {
      restartSession(true);
      return;
    }

    timer.start();
  }, [restartSession, state.submittedSession, timer]);

  const pauseTimer = useCallback(() => {
    if (state.submittedSession) {
      return;
    }

    timer.pause();
  }, [state.submittedSession, timer]);

  const resetTimer = useCallback(() => {
    if (state.submittedSession) {
      return;
    }

    timer.reset();
  }, [state.submittedSession, timer]);

  return {
    activateProblem,
    applyProblemContext,
    clearActiveProblem,
    clearFeedback,
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
    state,
    submitRating,
    updateDraft,
  };
}
