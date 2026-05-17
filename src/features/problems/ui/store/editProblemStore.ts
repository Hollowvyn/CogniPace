import { create } from "zustand";

import { problemRepository } from "../../data/repository/ProblemRepository";

import type { CompanyLabel, Problem, TopicLabel } from "../../domain/model";

interface EditProblemState {
  editingProblem: Problem | null;
  topicChoices: TopicLabel[];
  companyChoices: CompanyLabel[];
  onSaved?: () => Promise<void> | void;
}

interface EditProblemStore extends EditProblemState {
  openForProblem: (
    problem: Problem,
    options?: { onSaved?: () => Promise<void> | void },
  ) => void;
  close: () => void;
}

const INITIAL_STATE: EditProblemState = {
  editingProblem: null,
  topicChoices: [],
  companyChoices: [],
  onSaved: undefined,
};

export const useEditProblemStore = create<EditProblemStore>((set) => ({
  ...INITIAL_STATE,

  openForProblem: (problem, options) => {
    set({ editingProblem: problem, onSaved: options?.onSaved });
    void problemRepository.getEditChoices().then(({ topicChoices, companyChoices }) => {
      set({ topicChoices, companyChoices });
    });
  },

  close: () => set(INITIAL_STATE),
}));
