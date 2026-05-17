import { parseProblemInput } from "@libs/leetcode";
import { asProblemSlug, type ProblemSlug } from "@shared/ids";
import { create } from "zustand";

import { problemRepository } from "../../data/repository/ProblemRepository";

import type {
  CompanyLabel,
  Difficulty,
  Problem,
  ProblemEditPatch,
  TopicLabel,
} from "../../domain/model";
import type { StoreApi } from "zustand";

export type ProblemFormMode = "create" | "edit";

export interface ProblemFormValues {
  problemInput: string;
  title: string;
  difficulty: Difficulty;
  url: string;
  topics: TopicLabel[];
  companies: ProblemFormCompanyValue[];
  isPremium: boolean;
}

export type ProblemFormLoadError =
  | { type: "NotFound"; message: string }
  | { type: "Failed"; message: string };

export interface ProblemFormUiState {
  slugId: ProblemSlug | null;
  mode: ProblemFormMode;
  title: string;
  values: ProblemFormValues;
  savedValues: ProblemFormValues;
  topicOptions: TopicLabel[];
  companyOptions: CompanyLabel[];
  isLoading: boolean;
  loadError: ProblemFormLoadError | null;
  isSaving: boolean;
  saveError: string | null;
  isDirty: boolean;
  canRenderForm: boolean;
  canSave: boolean;
}

export type ProblemFormUiEffect =
  | { id: number; type: "CloseRequested" }
  | { id: number; mode: ProblemFormMode; slugId: ProblemSlug; type: "Saved" };

export type ProblemFormCompanySelection = ReadonlyArray<string | CompanyLabel>;
export type ProblemFormCompanyValue = string | CompanyLabel;

export type ProblemFormIntent =
  | { type: "Load"; slugId?: ProblemSlug }
  | { type: "ChangeProblemInput"; value: string }
  | { type: "ChangeTitle"; value: string }
  | { type: "SetDifficulty"; value: Difficulty }
  | { type: "ChangeUrl"; value: string }
  | { type: "SetTopics"; value: TopicLabel[] }
  | { type: "SetCompanies"; value: ProblemFormCompanySelection }
  | { type: "SetPremium"; value: boolean }
  | { type: "Save" }
  | { type: "Cancel" }
  | { type: "ConsumeEffect"; id: number };

export interface ProblemFormViewModel {
  uiState: ProblemFormUiState;
  uiEffect: ProblemFormUiEffect | null;
  dispatch: (intent: ProblemFormIntent) => void;
}

let latestLoadId = 0;
let latestEffectId = 0;

export const useProblemFormViewModel = create<ProblemFormViewModel>(
  (set, get) => ({
    uiState: createProblemFormUiState(),
    uiEffect: null,

    dispatch: (intent) => {
      switch (intent.type) {
        case "Load":
          void loadProblemForm(intent.slugId, set);
          return;
        case "ChangeProblemInput":
          updateValues(set, { problemInput: intent.value });
          return;
        case "ChangeTitle":
          updateValues(set, { title: intent.value });
          return;
        case "SetDifficulty":
          updateValues(set, { difficulty: intent.value });
          return;
        case "ChangeUrl":
          updateValues(set, { url: intent.value });
          return;
        case "SetTopics":
          updateValues(set, { topics: intent.value });
          return;
        case "SetCompanies":
          updateValues(set, {
            companies: normalizeCompanySelection(intent.value),
          });
          return;
        case "SetPremium":
          updateValues(set, { isPremium: intent.value });
          return;
        case "Save":
          void saveProblemForm(get, set);
          return;
        case "Cancel":
          set({
            uiEffect: {
              id: nextEffectId(),
              type: "CloseRequested",
            },
          });
          return;
        case "ConsumeEffect":
          set((state) => ({
            uiEffect: state.uiEffect?.id === intent.id ? null : state.uiEffect,
          }));
          return;
      }
    },
  })
);

async function loadProblemForm(
  slugId: ProblemSlug | undefined,
  set: StoreApi<ProblemFormViewModel>["setState"]
): Promise<void> {
  latestLoadId += 1;
  const loadId = latestLoadId;
  const normalizedSlug = slugId ? asProblemSlug(slugId) : null;

  set({
    uiEffect: null,
    uiState: createProblemFormUiState({
      slugId: normalizedSlug,
      isLoading: true,
    }),
  });

  if (!normalizedSlug) {
    await loadCreateState(loadId, set);
    return;
  }

  await loadEditState(loadId, normalizedSlug, set);
}

async function loadCreateState(
  loadId: number,
  set: StoreApi<ProblemFormViewModel>["setState"]
): Promise<void> {
  try {
    const choices = await loadFormChoices();
    if (loadId !== latestLoadId) return;

    set({
      uiState: createProblemFormUiState({
        slugId: null,
        values: createEmptyProblemFormValues(),
        topicOptions: choices.topicChoices,
        companyOptions: choices.companyChoices,
      }),
    });
  } catch (err) {
    if (loadId !== latestLoadId) return;
    set({
      uiState: createProblemFormUiState({
        slugId: null,
        loadError: {
          type: "Failed",
          message: (err as Error).message || "Could not load problem form.",
        },
      }),
    });
  }
}

async function loadEditState(
  loadId: number,
  slugId: ProblemSlug,
  set: StoreApi<ProblemFormViewModel>["setState"]
): Promise<void> {
  try {
    const [choices, problem] = await Promise.all([
      loadFormChoices(),
      problemRepository.getProblemForEdit(slugId),
    ]);
    if (loadId !== latestLoadId) return;

    if (!problem) {
      set({
        uiState: createProblemFormUiState({
          slugId,
          values: createEmptyProblemFormValues(),
          topicOptions: choices.topicChoices,
          companyOptions: choices.companyChoices,
          loadError: {
            type: "NotFound",
            message: "This problem is not in the library.",
          },
        }),
      });
      return;
    }

    const values = valuesFromProblem(
      problem,
      choices.topicChoices,
      choices.companyChoices
    );
    set({
      uiState: createProblemFormUiState({
        slugId,
        values,
        topicOptions: choices.topicChoices,
        companyOptions: choices.companyChoices,
      }),
    });
  } catch (err) {
    if (loadId !== latestLoadId) return;
    set({
      uiState: createProblemFormUiState({
        slugId,
        loadError: {
          type: "Failed",
          message: (err as Error).message || "Could not load problem form.",
        },
      }),
    });
  }
}

async function loadFormChoices(): Promise<{
  topicChoices: TopicLabel[];
  companyChoices: CompanyLabel[];
}> {
  const [topicChoices, companyChoices] = await Promise.all([
    problemRepository.getTopics(),
    problemRepository.getCompanies(),
  ]);
  return { topicChoices, companyChoices };
}

async function saveProblemForm(
  get: StoreApi<ProblemFormViewModel>["getState"],
  set: StoreApi<ProblemFormViewModel>["setState"]
): Promise<void> {
  const state = get();
  if (!state.uiState.canSave) return;

  set((current) => ({
    uiState: makeUiState({
      ...current.uiState,
      isSaving: true,
      saveError: null,
    }),
  }));

  try {
    const current = get();
    const { mode, values } = current.uiState;
    let valuesForSave: ProblemFormValues;
    let savedSlugId: ProblemSlug;

    if (mode === "create") {
      const parsed = parseProblemInput(values.problemInput);
      valuesForSave = await resolveCompanyValues(values);
      const patch = buildCreatePatch(valuesForSave);
      await problemRepository.createProblem({
        input: valuesForSave.problemInput,
        ...(hasPatchValues(patch) ? { patch } : {}),
      });
      savedSlugId = asProblemSlug(parsed.slug);
    } else {
      if (!current.uiState.slugId) {
        throw new Error("This problem is not in the library.");
      }
      valuesForSave = await resolveCompanyValues(values);
      const patch = buildEditPatch(valuesForSave, current.uiState.savedValues);
      if (hasPatchValues(patch)) {
        await problemRepository.editProblem({
          slug: current.uiState.slugId,
          patch,
          markUserEdit: true,
        });
      }
      savedSlugId = current.uiState.slugId;
    }

    set((currentState) => {
      const savedValues = cloneValues(valuesForSave);
      return {
        uiState: makeUiState({
          ...currentState.uiState,
          slugId: savedSlugId,
          values: savedValues,
          savedValues,
          isSaving: false,
          saveError: null,
        }),
        uiEffect: {
          id: nextEffectId(),
          mode,
          slugId: savedSlugId,
          type: "Saved",
        },
      };
    });
  } catch (err) {
    set((current) => ({
      uiState: makeUiState({
        ...current.uiState,
        isSaving: false,
        saveError: (err as Error).message || "Could not save the problem.",
      }),
    }));
  }
}

function normalizeCompanySelection(
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

async function resolveCompanyValues(
  values: ProblemFormValues
): Promise<ProblemFormValues> {
  const companies: CompanyLabel[] = [];
  const seenIds = new Set<string>();

  for (const entry of values.companies) {
    const company =
      typeof entry === "string" ? await createCompany(entry) : entry;
    if (!company || seenIds.has(company.id)) {
      continue;
    }
    seenIds.add(company.id);
    companies.push(company);
  }

  return { ...values, companies };
}

async function createCompany(name: string): Promise<CompanyLabel | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const result = await problemRepository.createCustomCompany(trimmed);
  return { id: result.id, name: trimmed };
}

function updateValues(
  set: StoreApi<ProblemFormViewModel>["setState"],
  patch: Partial<ProblemFormValues>
): void {
  set((state) => ({
    uiState: makeUiState({
      ...state.uiState,
      values: {
        ...state.uiState.values,
        ...patch,
      },
      saveError: null,
    }),
  }));
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

function createProblemFormUiState(
  input: {
    slugId?: ProblemSlug | null;
    values?: ProblemFormValues;
    savedValues?: ProblemFormValues;
    topicOptions?: TopicLabel[];
    companyOptions?: CompanyLabel[];
    isLoading?: boolean;
    loadError?: ProblemFormLoadError | null;
    isSaving?: boolean;
    saveError?: string | null;
  } = {}
): ProblemFormUiState {
  const values = input.values ?? createEmptyProblemFormValues();
  const savedValues = input.savedValues ?? cloneValues(values);
  return makeUiState({
    slugId: input.slugId ?? null,
    values,
    savedValues,
    topicOptions: input.topicOptions ?? [],
    companyOptions: input.companyOptions ?? [],
    isLoading: input.isLoading ?? false,
    loadError: input.loadError ?? null,
    isSaving: input.isSaving ?? false,
    saveError: input.saveError ?? null,
  });
}

function makeUiState(input: {
  slugId: ProblemSlug | null;
  values: ProblemFormValues;
  savedValues: ProblemFormValues;
  topicOptions: TopicLabel[];
  companyOptions: CompanyLabel[];
  isLoading: boolean;
  loadError: ProblemFormLoadError | null;
  isSaving: boolean;
  saveError: string | null;
}): ProblemFormUiState {
  const mode: ProblemFormMode = input.slugId ? "edit" : "create";
  const isDirty = !sameNormalizedValues(input.values, input.savedValues);
  const canRenderForm = !input.isLoading && input.loadError === null;
  return {
    slugId: input.slugId,
    mode,
    title:
      mode === "create"
        ? "Add problem"
        : input.savedValues.title
          ? `Edit: ${input.savedValues.title}`
          : "Edit problem",
    values: input.values,
    savedValues: input.savedValues,
    topicOptions: input.topicOptions,
    companyOptions: input.companyOptions,
    isLoading: input.isLoading,
    loadError: input.loadError,
    isSaving: input.isSaving,
    saveError: input.saveError,
    isDirty,
    canRenderForm,
    canSave:
      canRenderForm &&
      !input.isSaving &&
      isDirty &&
      isValidForMode(input.slugId, input.values, mode),
  };
}

function valuesFromProblem(
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

function cloneValues(values: ProblemFormValues): ProblemFormValues {
  return {
    ...values,
    topics: [...values.topics],
    companies: [...values.companies],
  };
}

function buildCreatePatch(values: ProblemFormValues): ProblemEditPatch {
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

function buildEditPatch(
  values: ProblemFormValues,
  savedValues: ProblemFormValues
): ProblemEditPatch {
  const patch: ProblemEditPatch = {};
  const normalized = normalizeValues(values);
  const saved = normalizeValues(savedValues);

  if (normalized.title !== saved.title) patch.title = normalized.title;
  if (normalized.difficulty !== saved.difficulty) {
    patch.difficulty = normalized.difficulty;
  }
  if (normalized.url !== saved.url) patch.url = normalized.url;
  if (normalized.isPremium !== saved.isPremium) {
    patch.isPremium = normalized.isPremium;
  }
  if (!sameStringArray(normalized.topicIds, saved.topicIds)) {
    patch.topicIds = normalized.topicIds;
  }
  if (!sameStringArray(normalized.companyIds, saved.companyIds)) {
    patch.companyIds = normalized.companyIds;
  }

  return patch;
}

function isValidForMode(
  slugId: ProblemSlug | null,
  values: ProblemFormValues,
  mode: ProblemFormMode
): boolean {
  if (mode === "create") {
    return values.problemInput.trim().length > 0;
  }
  return (
    slugId !== null &&
    values.title.trim().length > 0 &&
    values.url.trim().length > 0
  );
}

function hasPatchValues(patch: ProblemEditPatch): boolean {
  return Object.values(patch).some((value) => value !== undefined);
}

function sameNormalizedValues(
  a: ProblemFormValues,
  b: ProblemFormValues
): boolean {
  const left = normalizeValues(a);
  const right = normalizeValues(b);
  return (
    left.problemInput === right.problemInput &&
    left.title === right.title &&
    left.difficulty === right.difficulty &&
    left.url === right.url &&
    left.isPremium === right.isPremium &&
    sameStringArray(left.topicIds, right.topicIds) &&
    sameStringArray(left.companyIds, right.companyIds)
  );
}

function normalizeValues(values: ProblemFormValues): {
  problemInput: string;
  title: string;
  difficulty: Difficulty;
  url: string;
  topicIds: string[];
  companyIds: string[];
  isPremium: boolean;
} {
  return {
    problemInput: values.problemInput.trim(),
    title: values.title.trim(),
    difficulty: values.difficulty,
    url: values.url.trim(),
    topicIds: values.topics
      .map((topic) => topic.id)
      .slice()
      .sort(),
    companyIds: values.companies
      .map(companyValueKey)
      .filter((id) => id.length > 0)
      .slice()
      .sort(),
    isPremium: values.isPremium,
  };
}

function companyValueId(company: ProblemFormCompanyValue): string {
  return typeof company === "string" ? "" : company.id;
}

function companyValueKey(company: ProblemFormCompanyValue): string {
  return typeof company === "string"
    ? `new:${company.trim().toLowerCase()}`
    : company.id;
}

function sameStringArray(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  for (let index = 0; index < a.length; index += 1) {
    if (a[index] !== b[index]) return false;
  }
  return true;
}

function nextEffectId(): number {
  latestEffectId += 1;
  return latestEffectId;
}
