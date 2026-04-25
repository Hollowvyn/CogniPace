import { describe, expect, it } from "vitest";

import { deferred } from "../support/appShellFixtures";
import { screen } from "../support/render";

import {
  createOverlayHarness,
  mockOverlayRuntime,
  problemForPage,
  renderOverlayRoot,
  runtimeOk,
} from "./controller.support";

describe("Overlay Controller Navigation", () => {
  it("ignores stale async responses after navigation changes", async () => {
    const firstContext = deferred<{
      ok: true;
      data: {
        problem: { title: string; difficulty: "Easy" };
        studyState: null;
      };
    }>();
    const secondContext = deferred<{
      ok: true;
      data: {
        problem: { title: string; difficulty: "Medium" };
        studyState: null;
      };
    }>();

    mockOverlayRuntime((type, payload) => {
      if (type === "UPSERT_PROBLEM_FROM_PAGE") {
        return runtimeOk({
          problem: problemForPage({
            difficulty: "Easy",
            slug: payload.slug ?? "",
            title: payload.slug ?? "",
          }),
          studyState: null,
        });
      }

      if (type === "GET_PROBLEM_CONTEXT" && payload.slug === "two-sum") {
        return firstContext.promise;
      }

      if (type === "GET_PROBLEM_CONTEXT" && payload.slug === "group-anagrams") {
        return secondContext.promise;
      }

      if (type === "OPEN_EXTENSION_PAGE") {
        return runtimeOk({ opened: true });
      }

      return undefined;
    });

    const { harness, user } = renderOverlayRoot(
      createOverlayHarness({
        difficulty: "Easy",
        slug: "two-sum",
        title: "Two Sum",
      })
    );

    harness.setPage({
      difficulty: "Medium",
      slug: "group-anagrams",
      title: "Group Anagrams",
    });
    harness.runIntervalTick();

    secondContext.resolve({
      ok: true,
      data: {
        problem: { title: "Group Anagrams", difficulty: "Medium" },
        studyState: null,
      },
    });

    await user.click(await screen.findByRole("button", { name: "Expand overlay" }));
    expect(await screen.findByText("Group Anagrams")).toBeInTheDocument();

    firstContext.resolve({
      ok: true,
      data: {
        problem: { title: "Two Sum", difficulty: "Easy" },
        studyState: null,
      },
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(screen.queryByText("Two Sum")).not.toBeInTheDocument();
    expect(screen.getByText("Group Anagrams")).toBeInTheDocument();
  });

  it("docks and restores the overlay", async () => {
    mockOverlayRuntime(() => undefined);
    const { user } = renderOverlayRoot(
      createOverlayHarness({
        difficulty: "Easy",
        slug: "two-sum",
        title: "Two Sum",
      })
    );

    await user.click(await screen.findByRole("button", { name: "Hide overlay" }));
    expect(screen.getByRole("button", { name: "Show overlay" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Show overlay" }));
    expect(screen.getByRole("button", { name: "Expand overlay" })).toBeInTheDocument();
  });
});
