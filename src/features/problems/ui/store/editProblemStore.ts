import { create } from "zustand";

import { problemRepository } from "../../data/repository/ProblemRepository";
import type { CompanyLabel, ProblemView, TopicLabel } from "../../domain/model";

interface EditProblemState {
  editingProblem: ProblemView | null;
  topicChoices: TopicLabel[];
  companyChoices: CompanyLabel[];
}

interface EditProblemStore extends EditProblemState {
  openForProblem: (problem: ProblemView) => void;
  close: () => void;
}

const INITIAL_STATE: EditProblemState = {
  editingProblem: null,
  topicChoices: [],
  companyChoices: [],
};

export const useEditProblemStore = create<EditProblemStore>((set) => ({
  ...INITIAL_STATE,

  openForProblem: (problem) => {
    set({ editingProblem: problem });
    void problemRepository.getEditChoices().then(({ topicChoices, companyChoices }) => {
      set({ topicChoices, companyChoices });
    });
  },

  close: () => set(INITIAL_STATE),
}));
