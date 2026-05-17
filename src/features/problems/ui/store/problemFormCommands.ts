import { normalizeSlug } from "@libs/leetcode";

import { problemRepository } from "../../data/repository/ProblemRepository";

import {
  buildCreatePatch,
  buildEditPatch,
  createEmptyProblemFormValues,
  createProblemFormUiState,
  hasPatchValues,
  makeProblemFormUiState,
  parseProblemFormSlug,
  valuesFromProblem,
} from "./problemFormModel";

import type {
  ProblemFormValues,
  ProblemFormViewModel,
} from "./problemFormTypes";
import type { CompanyLabel, TopicLabel } from "../../domain/model";
import type { ProblemSlug } from "@shared/ids";
import type { StoreApi } from "zustand";

export type ProblemFormGet = StoreApi<ProblemFormViewModel>["getState"];
export type ProblemFormSet = StoreApi<ProblemFormViewModel>["setState"];

export async function loadProblemForm(
  slugId: ProblemSlug | undefined,
  set: ProblemFormSet
): Promise<void> {
  const normalizedSlug = slugId ? normalizeSlug(slugId) : null;

  set({
    uiState: createProblemFormUiState({
      slugId: normalizedSlug,
      isLoading: true,
    }),
    uiEffect: null,
  });

  if (!normalizedSlug) {
    await loadCreateState(set);
    return;
  }

  await loadEditState(normalizedSlug, set);
}

export async function saveProblemForm(
  get: ProblemFormGet,
  set: ProblemFormSet
): Promise<void> {
  if (!get().uiState.canSave) return;

  set((current) => ({
    uiState: makeProblemFormUiState({
      ...current.uiState,
      isSaving: true,
      saveError: null,
    }),
  }));

  try {
    const current = get();
    const { mode, slugId, values } = current.uiState;
    const savedSlugId =
      mode === "create"
        ? await createProblem(values)
        : await editProblem(slugId, values);

    setSavedState(set, mode, savedSlugId, values);
  } catch (err) {
    set((current) => ({
      uiState: makeProblemFormUiState({
        ...current.uiState,
        isSaving: false,
        saveError: (err as Error).message || "Could not save the problem.",
      }),
    }));
  }
}

export function updateProblemFormValues(
  get: ProblemFormGet,
  set: ProblemFormSet,
  patch: Partial<ProblemFormValues>
): void {
  if (get().uiState.isSaving) return;

  set((state) => ({
    uiState: makeProblemFormUiState({
      ...state.uiState,
      values: {
        ...state.uiState.values,
        ...patch,
      },
      saveError: null,
    }),
  }));
}

async function loadCreateState(set: ProblemFormSet): Promise<void> {
  try {
    const choices = await loadFormChoices();

    set({
      uiState: createProblemFormUiState({
        slugId: null,
        values: createEmptyProblemFormValues(),
        topicOptions: choices.topicChoices,
        companyOptions: choices.companyChoices,
      }),
    });
  } catch (err) {
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
  slugId: ProblemSlug,
  set: ProblemFormSet
): Promise<void> {
  try {
    const [choices, problem] = await Promise.all([
      loadFormChoices(),
      problemRepository.getProblemForEdit(slugId),
    ]);

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

    set({
      uiState: createProblemFormUiState({
        slugId,
        values: valuesFromProblem(
          problem,
          choices.topicChoices,
          choices.companyChoices
        ),
        topicOptions: choices.topicChoices,
        companyOptions: choices.companyChoices,
      }),
    });
  } catch (err) {
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

async function createProblem(values: ProblemFormValues): Promise<ProblemSlug> {
  const savedSlugId = parseProblemFormSlug(values.problemInput);
  const patch = buildCreatePatch(values);
  await problemRepository.createProblem({
    input: values.problemInput,
    ...(hasPatchValues(patch) ? { patch } : {}),
  });
  return savedSlugId;
}

async function editProblem(
  slugId: ProblemSlug | null,
  values: ProblemFormValues
): Promise<ProblemSlug> {
  if (!slugId) {
    throw new Error("This problem is not in the library.");
  }

  await problemRepository.editProblem({
    slug: slugId,
    patch: buildEditPatch(values),
    markUserEdit: true,
  });
  return slugId;
}

function setSavedState(
  set: ProblemFormSet,
  mode: "create" | "edit",
  savedSlugId: ProblemSlug,
  valuesForSave: ProblemFormValues
): void {
  set((currentState) => ({
    uiState: makeProblemFormUiState({
      ...currentState.uiState,
      slugId: savedSlugId,
      values: valuesForSave,
      isSaving: false,
      saveError: null,
    }),
    uiEffect: {
      mode,
      slugId: savedSlugId,
      type: "Saved",
    },
  }));
}
