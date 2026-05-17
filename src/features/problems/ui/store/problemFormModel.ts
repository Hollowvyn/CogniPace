import { normalizeSlug, parseProblemInput } from "@libs/leetcode";

import type {
  ProblemFormCompanySelection,
  ProblemFormCompanyValue,
  ProblemFormLoadError,
  ProblemFormMode,
  ProblemFormUiState,
  ProblemFormValues,
} from "./problemFormTypes";
import type {
  CompanyLabel,
  Problem,
  ProblemEditPatch,
  TopicLabel,
} from "../../domain/model";
import type { ProblemSlug } from "@shared/ids";

export function parseProblemFormSlug(input: string): ProblemSlug {
  return normalizeSlug(parseProblemInput(input).slug);
}

export function normalizeCompanySelection(
  selection: ProblemFormCompanySelection
): ProblemFormCompanyValue[] {
  const companies: ProblemFormCompanyValue[] = [];
  const seenKeys = new Set<string>();

  for (const entry of selection) {
    if (typeof entry === "string") {
      const trimmed = entry.trim();
      const key = `new:${trimmed.toLowerCase()}`;
      if (!trimmed || seenKeys.has(key)) {
        continue;
      }
      seenKeys.add(key);
      companies.push(trimmed);
      continue;
    }

    if (seenKeys.has(entry.id)) {
      continue;
    }
    seenKeys.add(entry.id);
    companies.push(entry);
  }

  return companies;
}

export function createEmptyProblemFormValues(): ProblemFormValues {
  return {
    problemInput: "",
    title: "",
    difficulty: "Unknown",
    url: "",
    topics: [],
    companies: [],
    isPremium: false,
  };
}

export function createProblemFormUiState(
  input: {
    slugId?: ProblemSlug | null;
    values?: ProblemFormValues;
    topicOptions?: TopicLabel[];
    companyOptions?: CompanyLabel[];
    isLoading?: boolean;
    loadError?: ProblemFormLoadError | null;
    isSaving?: boolean;
    saveError?: string | null;
  } = {}
): ProblemFormUiState {
  const values = input.values ?? createEmptyProblemFormValues();
  return makeProblemFormUiState({
    slugId: input.slugId ?? null,
    values,
    topicOptions: input.topicOptions ?? [],
    companyOptions: input.companyOptions ?? [],
    isLoading: input.isLoading ?? false,
    loadError: input.loadError ?? null,
    isSaving: input.isSaving ?? false,
    saveError: input.saveError ?? null,
  });
}

export function makeProblemFormUiState(input: {
  slugId: ProblemSlug | null;
  values: ProblemFormValues;
  topicOptions: TopicLabel[];
  companyOptions: CompanyLabel[];
  isLoading: boolean;
  loadError: ProblemFormLoadError | null;
  isSaving: boolean;
  saveError: string | null;
}): ProblemFormUiState {
  const mode: ProblemFormMode = input.slugId ? "edit" : "create";
  const canRenderForm = !input.isLoading && input.loadError === null;
  return {
    slugId: input.slugId,
    mode,
    title:
      mode === "create"
        ? "Add problem"
        : input.values.title
          ? `Edit: ${input.values.title}`
          : "Edit problem",
    values: input.values,
    topicOptions: input.topicOptions,
    companyOptions: input.companyOptions,
    isLoading: input.isLoading,
    loadError: input.loadError,
    isSaving: input.isSaving,
    saveError: input.saveError,
    canRenderForm,
    canSave: canRenderForm && !input.isSaving,
  };
}

export function valuesFromProblem(
  problem: Problem,
  topicChoices: readonly TopicLabel[],
  companyChoices: readonly CompanyLabel[]
): ProblemFormValues {
  const topicsById = new Map(topicChoices.map((topic) => [topic.id, topic]));
  const companiesById = new Map(
    companyChoices.map((company) => [company.id, company])
  );
  return {
    problemInput: problem.slug,
    title: problem.title,
    difficulty: problem.difficulty,
    url: problem.url,
    topics: problem.topicIds.map(
      (id) => topicsById.get(id) ?? { id, name: id }
    ),
    companies: problem.companyIds.map(
      (id) => companiesById.get(id) ?? { id, name: id }
    ),
    isPremium: problem.isPremium ?? false,
  };
}

export function buildCreatePatch(values: ProblemFormValues): ProblemEditPatch {
  const patch: ProblemEditPatch = {};
  const title = values.title.trim();
  const url = values.url.trim();
  if (title) patch.title = title;
  if (values.difficulty !== "Unknown") patch.difficulty = values.difficulty;
  if (url) patch.url = url;
  if (values.isPremium) patch.isPremium = true;
  if (values.topics.length > 0) {
    patch.topicIds = values.topics.map((topic) => topic.id);
  }
  if (values.companies.length > 0) {
    patch.companyIds = values.companies.map(companyValueId).filter(Boolean);
  }
  return patch;
}

export function buildEditPatch(values: ProblemFormValues): ProblemEditPatch {
  return {
    title: values.title.trim(),
    difficulty: values.difficulty,
    url: values.url.trim(),
    isPremium: values.isPremium,
    topicIds: values.topics.map((topic) => topic.id),
    companyIds: values.companies.map(companyValueId).filter(Boolean),
  };
}

export function hasPatchValues(patch: ProblemEditPatch): boolean {
  return Object.values(patch).some((value) => value !== undefined);
}

function companyValueId(company: ProblemFormCompanyValue): string {
  return typeof company === "string" ? "" : company.id;
}
