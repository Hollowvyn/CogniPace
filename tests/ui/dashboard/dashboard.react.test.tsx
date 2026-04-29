import { describe, expect, it } from "vitest";

import { DashboardApp } from "../../../src/ui/screens/dashboard/DashboardApp";
import { makePayload } from "../support/appShellFixtures";
import { render, screen, waitFor, fireEvent } from "../support/render";
import { sendMessageMock } from "../support/setup";

type DashboardRuntimeOverride = (
  type: string,
  request: unknown
) => Promise<unknown> | unknown | undefined;

function renderDashboardWithPayload(
  payload = makePayload(),
  override?: DashboardRuntimeOverride
) {
  sendMessageMock.mockImplementation((type: string, request: unknown) => {
    const overridden = override?.(type, request);
    if (overridden !== undefined) {
      return overridden;
    }
    if (type === "GET_APP_SHELL_DATA") {
      return Promise.resolve({ ok: true, data: payload });
    }
    return Promise.resolve({ ok: true, data: {} });
  });

  return render(<DashboardApp />);
}

describe("DashboardApp", () => {
  it("switches views and filters library rows", async () => {
    const payload = makePayload();
    const { user } = renderDashboardWithPayload(payload);

    expect(
      await screen.findByRole("heading", { name: "Dashboard" })
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Library" }));

    expect(await screen.findByText("All Tracked Problems")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Search title or slug"), {
      target: { value: "merge" },
    });

    await waitFor(() => {
      expect(screen.queryByText("Two Sum")).not.toBeInTheDocument();
      expect(screen.getByText("Merge Intervals")).toBeInTheDocument();
    });
  });

  it("saves settings through runtime messaging", async () => {
    const payload = makePayload();
    const { user } = renderDashboardWithPayload(payload, (type) =>
      type === "UPDATE_SETTINGS"
        ? Promise.resolve({ ok: true, data: {} })
        : undefined
    );

    await user.click(await screen.findByRole("button", { name: "Settings" }));

    const dailyQuestionGoalInput = await screen.findByLabelText(
      "Daily Question Goal"
    );
    await user.clear(dailyQuestionGoalInput);
    await user.type(dailyQuestionGoalInput, "24");

    await user.click(screen.getByRole("button", { name: "Save Settings" }));

    await waitFor(() => {
      expect(sendMessageMock).toHaveBeenCalledWith(
        "UPDATE_SETTINGS",
        expect.objectContaining({
          dailyQuestionGoal: 24,
          activeCourseId: "Blind75",
        })
      );
    });
  });

  it("renders settings sections with the new grouped controls", async () => {
    const { user } = renderDashboardWithPayload(makePayload());

    await user.click(await screen.findByRole("button", { name: "Settings" }));

    expect(
      await screen.findByRole("heading", { name: "Practice Plan" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Notifications" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Memory & Review" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Question Filters" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Timing Goals" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Experimental" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "History Reset" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Local Data" })
    ).toBeInTheDocument();

    expect(screen.getByLabelText("Notification Time")).toBeDisabled();
    expect(screen.getByLabelText("Skip ignored questions")).toBeChecked();
    expect(screen.getByLabelText("Skip premium questions")).not.toBeChecked();
    expect(screen.getByLabelText("Auto-detect solves")).toBeDisabled();
    expect(screen.getByLabelText("Easy goal")).toHaveValue(20);
    expect(screen.getByLabelText("Medium goal")).toHaveValue(35);
    expect(screen.getByLabelText("Hard goal")).toHaveValue(50);

    await user.click(screen.getByLabelText("Enable reminders"));

    expect(screen.getByLabelText("Notification Time")).not.toBeDisabled();
  });

  it("confirms before resetting study history", async () => {
    const { user } = renderDashboardWithPayload(makePayload(), (type) =>
      type === "RESET_STUDY_HISTORY"
        ? Promise.resolve({ ok: true, data: { reset: true } })
        : undefined
    );

    await user.click(await screen.findByRole("button", { name: "Settings" }));

    await user.click(
      screen.getByRole("button", { name: "Reset study history" })
    );

    expect(
      screen.getByRole("heading", { name: "Reset study history?" })
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Confirm Reset" }));

    await waitFor(() => {
      expect(sendMessageMock).toHaveBeenCalledWith("RESET_STUDY_HISTORY", {});
    });
  });
});
