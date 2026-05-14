import type { Difficulty } from "./Difficulty";

export interface CuratedProblemInput {
  slug: string;
  title?: string;
  difficulty?: Difficulty;
  isPremium?: boolean;
  tags?: string[];
}
