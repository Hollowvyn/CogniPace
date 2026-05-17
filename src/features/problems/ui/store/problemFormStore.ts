import { createStore, type StoreApi } from "zustand/vanilla";

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

export type ProblemFormStore = StoreApi<ProblemFormViewModel>;

export function createProblemFormViewModel(): ProblemFormStore {
  return createStore<ProblemFormViewModel>((set, get) => ({
    uiState: createProblemFormUiState(),
    uiEffect: null,
    dispatch: (intent) => {
      onProblemFormIntent(intent, get, set);
    },
  }));
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
      changeProblemInput(get, set, intent.value);
      return;
    case "ChangeTitle":
      changeTitle(get, set, intent.value);
      return;
    case "SetDifficulty":
      setDifficulty(get, set, intent.value);
      return;
    case "ChangeUrl":
      changeUrl(get, set, intent.value);
      return;
    case "SetTopics":
      setTopics(get, set, intent.value);
      return;
    case "SetCompanies":
      setCompanies(get, set, intent.value);
      return;
    case "SetPremium":
      setPremium(get, set, intent.value);
      return;
    case "Save":
      void saveProblemForm(get, set);
      return;
  }
}

function changeProblemInput(
  get: ProblemFormGet,
  set: ProblemFormSet,
  value: string
): void {
  updateProblemFormValues(get, set, { problemInput: value });
}

function changeTitle(
  get: ProblemFormGet,
  set: ProblemFormSet,
  value: string
): void {
  updateProblemFormValues(get, set, { title: value });
}

function setDifficulty(
  get: ProblemFormGet,
  set: ProblemFormSet,
  value: Difficulty
): void {
  updateProblemFormValues(get, set, { difficulty: value });
}

function changeUrl(
  get: ProblemFormGet,
  set: ProblemFormSet,
  value: string
): void {
  updateProblemFormValues(get, set, { url: value });
}

function setTopics(
  get: ProblemFormGet,
  set: ProblemFormSet,
  value: TopicLabel[]
): void {
  updateProblemFormValues(get, set, { topics: value });
}

function setCompanies(
  get: ProblemFormGet,
  set: ProblemFormSet,
  value: CompanyLabel[]
): void {
  updateProblemFormValues(get, set, { companies: value });
}

function setPremium(
  get: ProblemFormGet,
  set: ProblemFormSet,
  value: boolean
): void {
  updateProblemFormValues(get, set, { isPremium: value });
}
