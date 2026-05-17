import { create } from "zustand";

import {
  loadProblemForm,
  saveProblemForm,
  updateProblemFormValues,
  type ProblemFormGet,
  type ProblemFormSet,
} from "./problemFormCommands";
import { createProblemFormUiState } from "./problemFormModel";

import type {
  ProblemFormIntent,
  ProblemFormUiEffect,
  ProblemFormViewModel,
} from "./problemFormTypes";
import type { CompanyLabel, Difficulty, TopicLabel } from "../../domain/model";

export type {
  ProblemFormIntent,
  ProblemFormLoadError,
  ProblemFormMode,
  ProblemFormUiEffect,
  ProblemFormUiState,
  ProblemFormValues,
  ProblemFormViewModel,
} from "./problemFormTypes";
export { createEmptyProblemFormValues } from "./problemFormModel";

type ProblemFormEffectListener = (effect: ProblemFormUiEffect) => void;

const effectListeners = new Set<ProblemFormEffectListener>();

export const useProblemFormViewModel = create<ProblemFormViewModel>(
  (set, get) => ({
    uiState: createProblemFormUiState(),
    dispatch: (intent) => {
      onProblemFormIntent(intent, get, set);
    },
  })
);

export function subscribeProblemFormEffect(
  listener: ProblemFormEffectListener
): () => void {
  effectListeners.add(listener);
  return () => {
    effectListeners.delete(listener);
  };
}

function emitProblemFormEffect(effect: ProblemFormUiEffect): void {
  for (const listener of effectListeners) {
    listener(effect);
  }
}

function onProblemFormIntent(
  intent: ProblemFormIntent,
  get: ProblemFormGet,
  set: ProblemFormSet
): void {
  switch (intent.type) {
    case "Load":
      void loadProblemForm(intent.slugId, set);
      return;
    case "ChangeProblemInput":
      changeProblemInput(set, intent.value);
      return;
    case "ChangeTitle":
      changeTitle(set, intent.value);
      return;
    case "SetDifficulty":
      setDifficulty(set, intent.value);
      return;
    case "ChangeUrl":
      changeUrl(set, intent.value);
      return;
    case "SetTopics":
      setTopics(set, intent.value);
      return;
    case "SetCompanies":
      setCompanies(set, intent.value);
      return;
    case "SetPremium":
      setPremium(set, intent.value);
      return;
    case "Save":
      void saveProblemForm(get, set, emitProblemFormEffect);
      return;
    case "Cancel":
      emitProblemFormEffect({ type: "CloseRequested" });
      return;
  }
}

function changeProblemInput(set: ProblemFormSet, value: string): void {
  updateProblemFormValues(set, { problemInput: value });
}

function changeTitle(set: ProblemFormSet, value: string): void {
  updateProblemFormValues(set, { title: value });
}

function setDifficulty(set: ProblemFormSet, value: Difficulty): void {
  updateProblemFormValues(set, { difficulty: value });
}

function changeUrl(set: ProblemFormSet, value: string): void {
  updateProblemFormValues(set, { url: value });
}

function setTopics(set: ProblemFormSet, value: TopicLabel[]): void {
  updateProblemFormValues(set, { topics: value });
}

function setCompanies(set: ProblemFormSet, value: CompanyLabel[]): void {
  updateProblemFormValues(set, { companies: value });
}

function setPremium(set: ProblemFormSet, value: boolean): void {
  updateProblemFormValues(set, { isPremium: value });
}
