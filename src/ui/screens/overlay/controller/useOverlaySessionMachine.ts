import {useCallback, useState} from "react";

import {
  overrideLastReviewResult,
  saveReviewResult,
} from "../../../../data/repositories/problemSessionRepository";
import {defaultReviewMode} from "../../../../domain/fsrs/reviewPolicy";
import {Difficulty, Rating, ReviewMode, StudyState} from "../../../../domain/types";
import {OverlayDraftLogFields} from "../overlayPanel.types";

import {
  cloneDraft,
  draftFromStudyState,
  emptyDraft,
  reviewPayloadFromDraft,
} from "./draftFields";
import {OverlayTimerController} from "./useOverlayTimer";

interface SubmittedSessionSnapshot {
  draft: OverlayDraftLogFields;
  mode: ReviewMode;
  rating: Rating;
  solveTimeMs?: number;
}

interface OverlaySessionState {
  activeSlug: string;
  collapsed: boolean;
  currentDifficulty: Difficulty;
  currentState: StudyState | null;
  currentTitle: string;
  draft: OverlayDraftLogFields;
  draftContextSlug: string;
  feedbackIsError: boolean;
  feedbackMessage: string;
  selectedRating: Rating;
  submittedSession: SubmittedSessionSnapshot | null;
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
  collapsed: true,
  currentDifficulty: "Unknown",
  currentState: null,
  currentTitle: "",
  draft: emptyDraft(),
  draftContextSlug: "",
  feedbackIsError: false,
  feedbackMessage: "",
  selectedRating: 2,
  submittedSession: null,
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
      feedbackIsError: false,
      feedbackMessage: "",
      selectedRating: 2,
      submittedSession: null,
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
        feedbackIsError: false,
        feedbackMessage: "",
        selectedRating: 2,
        submittedSession: null,
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

  const toggleCollapse = useCallback(() => {
    setState((current) => ({
      ...current,
      collapsed: !current.collapsed,
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

  const submitRating = useCallback(
    async (rating: Rating): Promise<string | null> => {
      if (!state.activeSlug || state.submittedSession) {
        return null;
      }

      if (timer.isRunning) {
        timer.pause();
      }

      const elapsedMs = timer.readElapsedMs();
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
        collapsed: false,
        selectedRating: rating,
        submittedSession: {
          draft: draftSnapshot,
          mode,
          rating,
          solveTimeMs,
        },
      }));

      return state.activeSlug;
    },
    [persistReview, state.activeSlug, state.currentState, state.draft, state.submittedSession, timer]
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
    pauseTimer,
    resetTimer,
    restartSession,
    saveOverride,
    selectRating,
    setFeedback,
    startTimer,
    state,
    submitRating,
    toggleCollapse,
    updateDraft,
  };
}
