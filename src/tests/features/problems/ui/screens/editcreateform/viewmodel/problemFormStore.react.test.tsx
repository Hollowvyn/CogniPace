import {
  type CompanyLabel,
  type Problem,
  type TopicLabel,
} from "@features/problems";
import {
  createProblemFormViewModel,
  type ProblemFormIntent,
  type ProblemFormStore,
} from "@features/problems/ui/screens/editcreateform/viewmodel/problemFormStore";
import { asProblemSlug } from "@shared/ids";
import { describe, expect, it } from "vitest";

import { makeProblem } from "../../../../../../support/fixtures";
import { act, waitFor } from "../../../../../../support/render";
import { sendMessageMock } from "../../../../../../support/setup";

const TOPICS: TopicLabel[] = [{ id: "arrays", name: "Arrays" }];
const COMPANIES: CompanyLabel[] = [{ id: "meta", name: "Meta" }];

interface ProblemFormRuntimeOptions {
  createError?: string;
  problem?: Problem | null;
}

function mockProblemFormRuntime(options: ProblemFormRuntimeOptions = {}) {
  const problem =
    options.problem === undefined
      ? makeProblem("two-sum", {
          title: "Two Sum",
          difficulty: "Easy",
          topicIds: ["arrays"],
        })
      : options.problem;

  sendMessageMock.mockImplementation((type: string, request: unknown) => {
    switch (type) {
      case "getTopics":
        return { ok: true, data: TOPICS };
      case "getCompanies":
        return { ok: true, data: COMPANIES };
      case "getProblemForEdit": {
        const slug = (request as { slug?: string }).slug;
        return {
          ok: true,
          data: problem && slug === problem.slug ? problem : null,
        };
      }
      case "createProblem":
        return options.createError
          ? { ok: false, error: options.createError }
          : { ok: true, data: { slug: "valid-palindrome" } };
      case "editProblem":
        return { ok: true, data: { slug: problem?.slug ?? "two-sum" } };
      default:
        throw new Error(`Unexpected problem form RPC: ${type}`);
    }
  });
}

function dispatchIntent(
  store: ProblemFormStore,
  intent: ProblemFormIntent
) {
  act(() => {
    store.getState().dispatch(intent);
  });
}

describe("createProblemFormViewModel", () => {
  it("loads create state and saves a new problem with patch values", async () => {
    mockProblemFormRuntime();
    const store = createProblemFormViewModel();

    dispatchIntent(store, { type: "Load" });

    await waitFor(() => {
      expect(store.getState().uiState.canRenderForm).toBe(true);
    });
    expect(store.getState().uiState.canSave).toBe(false);

    dispatchIntent(store, {
      type: "ChangeProblemInput",
      value: "https://leetcode.com/problems/valid-palindrome/",
    });
    dispatchIntent(store, { type: "ChangeTitle", value: "Valid Palindrome" });
    dispatchIntent(store, { type: "SetDifficulty", value: "Easy" });
    dispatchIntent(store, { type: "SetTopics", value: TOPICS });
    dispatchIntent(store, { type: "SetCompanies", value: COMPANIES });

    expect(store.getState().uiState.canSave).toBe(true);

    dispatchIntent(store, { type: "Save" });

    await waitFor(() => {
      expect(sendMessageMock).toHaveBeenCalledWith("createProblem", {
        input: "https://leetcode.com/problems/valid-palindrome/",
        patch: {
          title: "Valid Palindrome",
          difficulty: "Easy",
          topicIds: ["arrays"],
          companyIds: ["meta"],
        },
      });
      expect(store.getState().uiEffect).toMatchObject({
        type: "Saved",
        mode: "create",
        slugId: "valid-palindrome",
      });
    });
  });

  it("loads edit state and saves the current form values", async () => {
    mockProblemFormRuntime();
    const store = createProblemFormViewModel();

    dispatchIntent(store, {
      type: "Load",
      slugId: asProblemSlug("two-sum"),
    });

    await waitFor(() => {
      expect(store.getState().uiState.values.title).toBe("Two Sum");
      expect(store.getState().uiState.values.topics).toEqual(TOPICS);
    });

    dispatchIntent(store, {
      type: "ChangeTitle",
      value: "Two Sum Updated",
    });
    dispatchIntent(store, { type: "Save" });

    await waitFor(() => {
      expect(sendMessageMock).toHaveBeenCalledWith("editProblem", {
        slug: "two-sum",
        patch: {
          title: "Two Sum Updated",
          difficulty: "Easy",
          url: "https://leetcode.com/problems/two-sum/",
          isPremium: false,
          topicIds: ["arrays"],
          companyIds: [],
        },
        markUserEdit: true,
      });
      expect(store.getState().uiEffect).toMatchObject({
        type: "Saved",
        mode: "edit",
        slugId: "two-sum",
      });
    });
  });

  it("surfaces missing edit problems as a load error", async () => {
    mockProblemFormRuntime({ problem: null });
    const store = createProblemFormViewModel();

    dispatchIntent(store, {
      type: "Load",
      slugId: asProblemSlug("missing"),
    });

    await waitFor(() => {
      expect(store.getState().uiState.loadError).toMatchObject({
        type: "NotFound",
      });
    });
  });

  it("keeps the form open and re-enables save when create fails", async () => {
    mockProblemFormRuntime({ createError: "Problem already exists." });
    const store = createProblemFormViewModel();

    dispatchIntent(store, { type: "Load" });

    await waitFor(() => {
      expect(store.getState().uiState.canRenderForm).toBe(true);
    });

    dispatchIntent(store, {
      type: "ChangeProblemInput",
      value: "valid-palindrome",
    });
    dispatchIntent(store, { type: "Save" });

    await waitFor(() => {
      expect(store.getState().uiState.saveError).toBe(
        "Problem already exists."
      );
      expect(store.getState().uiState.canSave).toBe(true);
      expect(store.getState().uiEffect).toBeNull();
    });
  });
});
