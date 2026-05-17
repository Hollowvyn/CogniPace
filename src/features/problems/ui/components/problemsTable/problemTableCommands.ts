import { settingsRepository } from "@features/settings";

import { problemRepository } from "../../../data/repository/ProblemRepository";

import type { ProblemTableCommands } from "./types";

export function createDefaultProblemTableCommands(
  refresh?: () => Promise<void> | void
): ProblemTableCommands {
  return {
    openProblem: async (target) => {
      await problemRepository.openProblemPage(target);
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
