import {
  subscribeProblemFormEffect,
  useProblemFormViewModel,
  type ProblemFormUiEffect,
} from "@features/problems";
import { asProblemSlug } from "@shared/ids";
import { describe, expect, it } from "vitest";

import { makeProblem } from "../../support/fixtures";
import { act, waitFor } from "../../support/render";
import { sendMessageMock } from "../../support/setup";

function mockProblemFormRuntime(
  problem = makeProblem("two-sum", {
    title: "Two Sum",
    difficulty: "Easy",
    topicIds: ["arrays"],
  })
) {
  sendMessageMock.mockImplementation((type: string, request: unknown) => {
    if (type === "getTopics") {
      return {
        ok: true,
        data: [{ id: "arrays", name: "Arrays" }],
      };
    }
    if (type === "getCompanies") {
      return {
        ok: true,
        data: [{ id: "meta", name: "Meta" }],
      };
    }
    if (type === "getProblemForEdit") {
      const slug = (request as { slug?: string }).slug;
      return { ok: true, data: slug === problem.slug ? problem : null };
    }
    if (type === "createProblem") {
      return { ok: true, data: { slug: "valid-palindrome" } };
    }
    if (type === "editProblem") {
      return { ok: true, data: { slug: problem.slug } };
    }
    return { ok: true, data: {} };
  });
}

describe("useProblemFormViewModel", () => {
  it("loads create state and saves a new problem with patch values", async () => {
    mockProblemFormRuntime();
    const emittedEffects: ProblemFormUiEffect[] = [];
    const unsubscribe = subscribeProblemFormEffect((effect) => {
      emittedEffects.push(effect);
    });

    act(() => {
      useProblemFormViewModel.getState().dispatch({ type: "Load" });
    });

    await waitFor(() => {
      expect(useProblemFormViewModel.getState().uiState.canRenderForm).toBe(
        true
      );
    });
    expect(useProblemFormViewModel.getState().uiState.canSave).toBe(true);

    act(() => {
      const dispatch = useProblemFormViewModel.getState().dispatch;
      dispatch({
        type: "ChangeProblemInput",
        value: "https://leetcode.com/problems/valid-palindrome/",
      });
      dispatch({ type: "ChangeTitle", value: "Valid Palindrome" });
      dispatch({ type: "SetDifficulty", value: "Easy" });
    });

    await waitFor(() => {
      expect(useProblemFormViewModel.getState().uiState.canSave).toBe(true);
    });

    act(() => {
      useProblemFormViewModel.getState().dispatch({ type: "Save" });
    });

    await waitFor(() => {
      expect(sendMessageMock).toHaveBeenCalledWith("createProblem", {
        input: "https://leetcode.com/problems/valid-palindrome/",
        patch: {
          title: "Valid Palindrome",
          difficulty: "Easy",
        },
      });
      expect(emittedEffects).toContainEqual({
        type: "Saved",
        mode: "create",
        slugId: "valid-palindrome",
      });
    });
    unsubscribe();
  });

  it("loads edit state and saves the current form values", async () => {
    mockProblemFormRuntime();

    act(() => {
      useProblemFormViewModel
        .getState()
        .dispatch({ type: "Load", slugId: asProblemSlug("two-sum") });
    });

    await waitFor(() => {
      expect(useProblemFormViewModel.getState().uiState.values.title).toBe(
        "Two Sum"
      );
      expect(useProblemFormViewModel.getState().uiState.values.topics).toEqual([
        { id: "arrays", name: "Arrays" },
      ]);
    });

    act(() => {
      useProblemFormViewModel
        .getState()
        .dispatch({ type: "ChangeTitle", value: "Two Sum Updated" });
    });

    act(() => {
      useProblemFormViewModel.getState().dispatch({ type: "Save" });
    });

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
    });
  });

  it("surfaces missing edit problems as a load error", async () => {
    mockProblemFormRuntime();

    act(() => {
      useProblemFormViewModel
        .getState()
        .dispatch({ type: "Load", slugId: asProblemSlug("missing") });
    });

    await waitFor(() => {
      expect(
        useProblemFormViewModel.getState().uiState.loadError
      ).toMatchObject({
        type: "NotFound",
      });
    });
  });

  it("saves selected companies by id", async () => {
    mockProblemFormRuntime();

    act(() => {
      useProblemFormViewModel.getState().dispatch({ type: "Load" });
    });

    await waitFor(() => {
      expect(useProblemFormViewModel.getState().uiState.canRenderForm).toBe(
        true
      );
    });

    act(() => {
      const dispatch = useProblemFormViewModel.getState().dispatch;
      dispatch({ type: "ChangeProblemInput", value: "valid-palindrome" });
      dispatch({
        type: "SetCompanies",
        value: [{ id: "meta", name: "Meta" }],
      });
    });

    act(() => {
      useProblemFormViewModel.getState().dispatch({ type: "Save" });
    });

    await waitFor(() => {
      expect(sendMessageMock).toHaveBeenCalledWith("createProblem", {
        input: "valid-palindrome",
        patch: { companyIds: ["meta"] },
      });
    });
  });
});
