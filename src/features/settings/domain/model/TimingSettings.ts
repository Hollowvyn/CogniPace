import type { DifficultyGoalSettings } from "./DifficultyGoalSettings";

export interface TimingSettings {
  requireSolveTime: boolean;
  hardMode: boolean;
  difficultyGoalMs: DifficultyGoalSettings;
}
