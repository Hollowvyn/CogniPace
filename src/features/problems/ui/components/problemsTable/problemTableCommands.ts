import { settingsRepository } from "@features/settings";

import { problemRepository } from "../../../data/repository/ProblemRepository";
import { useEditProblemStore } from "../../store/editProblemStore";

import type { ProblemTableCommands } from "./types";

export function createDefaultProblemTableCommands(
  refresh?: () => Promise<void> | void,
): ProblemTableCommands {
  return {
    openProblem: async (target) => {
      await problemRepository.openProblemPage(target);
    },
    editProblem: (problem) => {
      useEditProblemStore.getState().openForProblem(problem, {
        onSaved: refresh,
      });
    },
    suspendProblem: async (slug, suspend) => {
      await problemRepository.suspendProblem(slug, suspend);
    },
    resetProblemSchedule: async (slug) => {
      await problemRepository.resetProblemSchedule(slug);
    },
    enablePremiumQuestions: async () => {
      await settingsRepository.setSkipPremium(false);
    },
    refresh: refresh
      ? async () => {
          await refresh();
        }
      : undefined,
  };
}
