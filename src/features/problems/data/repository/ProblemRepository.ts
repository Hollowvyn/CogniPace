import { api } from "@app/api";
import { Rating, ReviewLogFields, ReviewMode } from "@features/study";


import { Difficulty } from "../../domain/model";

import type { Problem } from "../../domain/model";
import type { ProblemSlug } from "@shared/ids";

export const problemRepository = {
  upsertProblemFromPage: (input: {
    slug: string;
    title?: string;
    difficulty?: Difficulty;
    isPremium?: boolean;
    url?: string;
  }) => api.upsertProblemFromPage(input),

  getProblemContext: (slug: string) =>
    api.getProblemContext({ slug }),

  saveReviewResult: (input: {
    slug: string;
    rating: Rating;
    solveTimeMs?: number;
    mode?: ReviewMode;
    interviewPattern?: ReviewLogFields["interviewPattern"];
    timeComplexity?: ReviewLogFields["timeComplexity"];
    spaceComplexity?: ReviewLogFields["spaceComplexity"];
    languages?: ReviewLogFields["languages"];
    notes?: ReviewLogFields["notes"];
    trackId?: string;
    groupId?: string;
    source?: "overlay" | "dashboard";
  }) => api.saveReviewResult(input),

  saveOverlayLogDraft: (input: {
    slug: string;
    interviewPattern?: ReviewLogFields["interviewPattern"];
    timeComplexity?: ReviewLogFields["timeComplexity"];
    spaceComplexity?: ReviewLogFields["spaceComplexity"];
    languages?: ReviewLogFields["languages"];
    notes?: ReviewLogFields["notes"];
  }) => api.saveOverlayLogDraft(input),

  overrideLastReviewResult: (input: {
    slug: string;
    rating: Rating;
    solveTimeMs?: number;
    mode?: ReviewMode;
    interviewPattern?: ReviewLogFields["interviewPattern"];
    timeComplexity?: ReviewLogFields["timeComplexity"];
    spaceComplexity?: ReviewLogFields["spaceComplexity"];
    languages?: ReviewLogFields["languages"];
    notes?: ReviewLogFields["notes"];
    trackId?: string;
    groupId?: string;
    source?: "overlay" | "dashboard";
  }) => api.overrideLastReviewResult(input),

  openProblemPage: (target: { slug: string; trackId?: string; groupId?: string }) =>
    api.openProblemPage(target),

  openExtensionPage: (path: string) =>
    api.openExtensionPage({ path }),

  suspendProblem: (slug: ProblemSlug, suspend: boolean) =>
    api.suspendProblem({ slug, suspend }),

  resetProblemSchedule: (slug: ProblemSlug) =>
    api.resetProblemSchedule({ slug }),

  getLibrary: () => api.getLibrary({}) as Promise<Problem[]>,

  getEditChoices: () => api.getEditChoices({}),
};

export type ProblemRepository = typeof problemRepository;
