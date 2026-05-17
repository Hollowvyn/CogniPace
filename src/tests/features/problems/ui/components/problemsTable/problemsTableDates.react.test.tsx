import { TrackProblemTable } from "@features/problems";
import { createInitialUserSettings } from "@features/settings";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  makeProblem,
  makeScheduledState,
} from "../../../../../support/fixtures";
import { render, screen } from "../../../../../support/render";

const settings = createInitialUserSettings();

describe("problem table dates", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders review dates as relative text with compact absolute details", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-17T16:00:00.000Z"));

    const dueToday = {
      ...makeProblem("due-today", { title: "Due Today" }),
      studyState: makeScheduledState("2026-05-17T16:00:00.000Z"),
    };
    const unscheduled = makeProblem("fresh-card", { title: "Fresh Card" });

    render(
      <TrackProblemTable
        problems={[dueToday, unscheduled]}
        settings={settings}
      />,
    );

    expect(screen.getByText("Today")).toBeInTheDocument();
    expect(screen.getByText("May 17")).toBeInTheDocument();
    expect(screen.getByText("Unscheduled")).toBeInTheDocument();
    expect(screen.getByText("No solves")).toBeInTheDocument();
    expect(screen.queryByText("5/17/2026")).not.toBeInTheDocument();
  });
});
