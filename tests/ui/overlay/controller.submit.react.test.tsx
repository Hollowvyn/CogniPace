import { describe, expect, it, vi } from "vitest";

import { makePayload } from "../support/appShellFixtures";
import { screen, waitFor } from "../support/render";
import { sendMessageMock } from "../support/setup";

import {
  COUNTING_BITS_PAGE,
  createOverlayHarness,
  mockCountingBitsRuntime,
  renderOverlayShell,
  runtimeOk,
} from "./controller.support";

const EASY_GOAL_MS = 20 * 60 * 1000;

function makePayloadWithHardMode(hardMode: boolean) {
  const payload = makePayload();
  payload.settings.timing = {
    ...payload.settings.timing,
    difficultyGoalMs: {
      ...payload.settings.timing.difficultyGoalMs,
      Easy: EASY_GOAL_MS,
    },
    hardMode,
    requireSolveTime: hardMode,
  };
  return payload;
}

describe("Overlay Controller Submission", () => {
  it("saves from compact mode and expands while preserving elapsed time", async () => {
    let nowMs = 1000;
    const dateNowSpy = vi.spyOn(Date, "now").mockImplementation(() => nowMs);

    try {
      mockCountingBitsRuntime({
        handle: (type, payload) => {
          if (
            type === "SAVE_REVIEW_RESULT" &&
            payload.slug === "counting-bits"
          ) {
            return runtimeOk();
          }
          if (type === "GET_APP_SHELL_DATA") {
            return runtimeOk(makePayload());
          }

          return undefined;
        },
      });

      const { harness, user } = renderOverlayShell(
        createOverlayHarness(COUNTING_BITS_PAGE)
      );

      expect(
        await screen.findByRole("button", { name: "Start timer" })
      ).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Start timer" }));

      nowMs = 5000;
      harness.runIntervalTick();

      await waitFor(() => {
        expect(screen.getByText("00:04")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: "Submit" }));

      await waitFor(() => {
        expect(sendMessageMock).toHaveBeenCalledWith(
          "SAVE_REVIEW_RESULT",
          expect.objectContaining({
            slug: "counting-bits",
            rating: 2,
            mode: "FULL_SOLVE",
            solveTimeMs: 4000,
            source: "overlay",
          })
        );
      });

      expect(
        await screen.findByRole("button", { name: "Collapse overlay" })
      ).toBeInTheDocument();
      expect(screen.getByText("Counting Bits")).toBeInTheDocument();
      expect(screen.getByText("00:04")).toBeInTheDocument();
    } finally {
      dateNowSpy.mockRestore();
    }
  });

  it("logs compact failure and expands correctly", async () => {
    let nowMs = 1000;
    const dateNowSpy = vi.spyOn(Date, "now").mockImplementation(() => nowMs);

    try {
      mockCountingBitsRuntime({
        handle: (type) => {
          if (type === "SAVE_REVIEW_RESULT") return runtimeOk();
          if (type === "GET_APP_SHELL_DATA") return runtimeOk(makePayload());
          return undefined;
        },
      });

      const { harness, user } = renderOverlayShell(
        createOverlayHarness(COUNTING_BITS_PAGE)
      );

      await user.click(await screen.findByRole("button", { name: "Start timer" }));
      nowMs = 5000;
      harness.runIntervalTick();

      await user.click(screen.getByRole("button", { name: "Fail review" }));

      await waitFor(() => {
        expect(sendMessageMock).toHaveBeenCalledWith(
          "SAVE_REVIEW_RESULT",
          expect.objectContaining({ rating: 0 })
        );
      });

      const againButton = await screen.findByRole("button", { name: /Again/i });
      expect(againButton).toHaveAttribute("aria-pressed", "true");
    } finally {
      dateNowSpy.mockRestore();
    }
  });

  it("forces compact Hard Mode overtime submissions to Again and locks higher ratings", async () => {
    let nowMs = 1000;
    const dateNowSpy = vi.spyOn(Date, "now").mockImplementation(() => nowMs);

    try {
      mockCountingBitsRuntime({
        handle: (type) => {
          if (type === "SAVE_REVIEW_RESULT") return runtimeOk();
          if (type === "GET_APP_SHELL_DATA") {
            return runtimeOk(makePayloadWithHardMode(true));
          }
          return undefined;
        },
      });

      const { harness, user } = renderOverlayShell(
        createOverlayHarness(COUNTING_BITS_PAGE)
      );

      await user.click(
        await screen.findByRole("button", { name: "Start timer" })
      );
      nowMs = 1000 + EASY_GOAL_MS + 1000;
      harness.runIntervalTick();

      await user.click(screen.getByRole("button", { name: "Submit" }));

      await waitFor(() => {
        expect(sendMessageMock).toHaveBeenCalledWith(
          "SAVE_REVIEW_RESULT",
          expect.objectContaining({
            rating: 0,
            solveTimeMs: EASY_GOAL_MS + 1000,
          })
        );
      });

      expect(
        await screen.findByText("Overtime in Hard Mode forces an Again assessment.")
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Again Failed" })).toHaveAttribute(
        "aria-pressed",
        "true"
      );
      expect(screen.getByRole("button", { name: "Easy Fast" })).toBeDisabled();
    } finally {
      dateNowSpy.mockRestore();
    }
  });

  it("uses the latest elapsed time for expanded Hard Mode overtime submissions", async () => {
    let nowMs = 1000;
    const dateNowSpy = vi.spyOn(Date, "now").mockImplementation(() => nowMs);

    try {
      mockCountingBitsRuntime({
        handle: (type) => {
          if (type === "SAVE_REVIEW_RESULT") return runtimeOk();
          if (type === "GET_APP_SHELL_DATA") {
            return runtimeOk(makePayloadWithHardMode(true));
          }
          return undefined;
        },
      });

      const { user } = renderOverlayShell(createOverlayHarness(COUNTING_BITS_PAGE));

      await user.click(
        await screen.findByRole("button", { name: "Expand overlay" })
      );
      await user.click(screen.getByRole("button", { name: "Easy Fast" }));
      await user.click(screen.getByRole("button", { name: "Start" }));

      nowMs = 1000 + EASY_GOAL_MS + 1;
      await user.click(screen.getByRole("button", { name: "Submit" }));

      await waitFor(() => {
        expect(sendMessageMock).toHaveBeenCalledWith(
          "SAVE_REVIEW_RESULT",
          expect.objectContaining({
            rating: 0,
            solveTimeMs: EASY_GOAL_MS + 1,
          })
        );
      });

      expect(
        await screen.findByRole("button", { name: "Again Failed" })
      ).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByRole("button", { name: "Good Stable" })).toBeDisabled();
    } finally {
      dateNowSpy.mockRestore();
    }
  });

  it("keeps normal overtime as Hard without locking assessment choices", async () => {
    let nowMs = 1000;
    const dateNowSpy = vi.spyOn(Date, "now").mockImplementation(() => nowMs);

    try {
      mockCountingBitsRuntime({
        handle: (type) => {
          if (type === "SAVE_REVIEW_RESULT") return runtimeOk();
          if (type === "GET_APP_SHELL_DATA") {
            return runtimeOk(makePayloadWithHardMode(false));
          }
          return undefined;
        },
      });

      const { harness, user } = renderOverlayShell(
        createOverlayHarness(COUNTING_BITS_PAGE)
      );

      await user.click(
        await screen.findByRole("button", { name: "Start timer" })
      );
      nowMs = 1000 + EASY_GOAL_MS + 1000;
      harness.runIntervalTick();
      await user.click(screen.getByRole("button", { name: "Submit" }));

      await waitFor(() => {
        expect(sendMessageMock).toHaveBeenCalledWith(
          "SAVE_REVIEW_RESULT",
          expect.objectContaining({
            rating: 1,
            solveTimeMs: EASY_GOAL_MS + 1000,
          })
        );
      });

      expect(
        await screen.findByRole("button", { name: "Hard Lagging" })
      ).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByRole("button", { name: "Easy Fast" })).toBeEnabled();
      expect(screen.getByRole("button", { name: "Good Stable" })).toBeEnabled();
    } finally {
      dateNowSpy.mockRestore();
    }
  });
});
