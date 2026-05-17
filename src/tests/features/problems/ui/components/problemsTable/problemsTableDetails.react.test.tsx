import { LibraryProblemTable, TrackProblemTable } from "@features/problems";
import { createInitialUserSettings } from "@features/settings";
import { describe, expect, it } from "vitest";

import {
  makeProblem,
  makeScheduledState,
  makeTrack,
} from "../../../../../support/fixtures";
import { render, screen } from "../../../../../support/render";

const settings = createInitialUserSettings();

function track(id: string, name: string, slugs: string[]) {
  return {
    ...makeTrack(id, [{ groupId: `${id}-group`, slugs }]),
    name,
  };
}

describe("problem table expanded details", () => {
  it("renders status text and tooltips without all-caps phase labels", async () => {
    const learningState = makeScheduledState("2026-06-01T00:00:00.000Z");
    const learningProblem = {
      ...makeProblem("learning-card", { title: "Learning Card" }),
      studyState: {
        ...learningState,
        fsrsCard: {
          ...learningState.fsrsCard!,
          state: "Learning" as const,
        },
      },
    };
    const suspendedProblem = {
      ...makeProblem("suspended-card", { title: "Suspended Card" }),
      studyState: {
        ...makeScheduledState("2026-06-01T00:00:00.000Z"),
        suspended: true,
      },
    };

    const { user } = render(
      <LibraryProblemTable
        problems={[learningProblem, suspendedProblem]}
        tracks={[]}
        settings={settings}
      />
    );

    expect(screen.getByText("Learning")).toBeInTheDocument();
    expect(screen.queryByText("LEARNING")).not.toBeInTheDocument();
    expect(screen.getByText("Suspended")).toBeInTheDocument();

    await user.hover(screen.getByText("Suspended"));
    expect(await screen.findByText("Suspended manually.")).toBeInTheDocument();

    await user.click(screen.getByRole("combobox", { name: "Status" }));
    expect(
      await screen.findByRole("option", { name: "All statuses" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "Relearning" })
    ).toBeInTheDocument();
  });

  it("renders premium labels and track names in library expanded rows", async () => {
    const premiumProblem = makeProblem("two-sum", {
      title: "Two Sum",
      isPremium: true,
    });
    const freeProblem = makeProblem("valid-palindrome", {
      title: "Valid Palindrome",
      isPremium: false,
    });
    const tracks = [
      track("blind-75", "Blind 75", ["two-sum", "valid-palindrome"]),
      track("grind-75", "Grind 75", ["two-sum"]),
    ];

    const { user } = render(
      <LibraryProblemTable
        problems={[premiumProblem, freeProblem]}
        tracks={tracks}
        settings={settings}
      />
    );

    await user.click(screen.getByRole("button", { name: "Expand Two Sum" }));

    expect(await screen.findByText("Premium only")).toBeInTheDocument();
    expect(screen.queryByText(/^true$/)).not.toBeInTheDocument();
    expect(screen.getByText("Blind 75")).toBeInTheDocument();
    expect(screen.getByText("Grind 75")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Expand Valid Palindrome" })
    );

    expect(await screen.findByText("Free")).toBeInTheDocument();
    expect(screen.queryByText(/^false$/)).not.toBeInTheDocument();
    expect(screen.getByText("Blind 75")).toBeInTheDocument();
  });

  it("hides track details for TrackProblemTable by default", async () => {
    const problem = makeProblem("two-sum", {
      title: "Two Sum",
      isPremium: true,
    });

    const { user } = render(
      <TrackProblemTable problems={[problem]} settings={settings} />
    );

    await user.click(screen.getByRole("button", { name: "Expand Two Sum" }));

    expect(await screen.findByText("Premium only")).toBeInTheDocument();
    expect(screen.queryByText("Tracks")).not.toBeInTheDocument();
  });
});
