import type { Difficulty } from "./Difficulty";

export type ProblemEditPatch = Partial<{
  title: string;
  difficulty: Difficulty;
  url: string;
  topicIds: string[];
  companyIds: string[];
  isPremium: boolean;
  leetcodeId: string;
}>;
