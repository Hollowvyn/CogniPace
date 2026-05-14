import { describe, expect, it } from "vitest";

import { DashboardShell } from "../../../src/app/dashboard/DashboardShell";
import { DB_TICK_KEY } from "../../../src/libs/event-bus/utils/DB_TICK_KEY";
import { makePayload } from "../../support/appShellFixtures";
import { render, screen, waitFor, fireEvent } from "../../support/render";
import { emitLocalStorageChange, sendMessageMock } from "../../support/setup";

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

  return render(<DashboardShell />);
}

describe("DashboardShell", () => {
  it("switches views and filters library rows", async () => {
    const payload = makePayload();
    const { user } = renderDashboardWithPayload(payload);

    expect(
      await screen.findByRole("heading", { name: "Dashboard" })
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Library" }));

    expect(await screen.findByText("All Tracked Problems")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Search problems"), {
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

    expect(
      screen.getByRole("button", { name: "Save Settings" })
    ).toBeDisabled();

    const dailyQuestionGoalInput = await screen.findByLabelText(
      "Daily Question Goal"
    );
    await user.clear(dailyQuestionGoalInput);
    await user.type(dailyQuestionGoalInput, "24");

    expect(
      screen.getByRole("button", { name: "Save Settings" })
    ).not.toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Save Settings" }));

    await waitFor(() => {
      expect(sendMessageMock).toHaveBeenCalledWith(
        "UPDATE_SETTINGS",
        expect.objectContaining({
          dailyQuestionGoal: 24,
        })
      );
    });
  });

  it("refreshes settings when another extension surface updates app data", async () => {
    let payload = makePayload();
    const { user } = renderDashboardWithPayload(payload, (type) =>
      type === "GET_APP_SHELL_DATA"
        ? Promise.resolve({ ok: true, data: payload })
        : undefined
    );

    await user.click(await screen.findByRole("button", { name: "Settings" }));

    expect(screen.getByRole("button", { name: "Study plan" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );

    payload = {
      ...payload,
      settings: {
        ...payload.settings,
        studyMode: "freestyle",
      },
    };
    emitLocalStorageChange({
      [DB_TICK_KEY]: {
        newValue: { scope: { table: "*" } },
        oldValue: undefined,
      },
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Freestyle" })).toHaveAttribute(
        "aria-pressed",
        "true"
      );
    });
  });

  it("keeps saved settings visible in non-extension mode", async () => {
    const previousChrome = globalThis.chrome;
    Object.defineProperty(globalThis, "chrome", {
      configurable: true,
      value: {
        runtime: {
          getURL: (path: string) => `chrome-extension://test/${path}`,
        },
        tabs: {
          create: () => Promise.resolve(),
        },
      },
    });

    try {
      const initial = makePayload().settings;
      const { user } = renderDashboardWithPayload(makePayload(), (type, payload) =>
        type === "UPDATE_SETTINGS"
          ? Promise.resolve({
              ok: true,
              data: {
                // The real SW handler always returns the round-tripped
                // settings; mock the same shape (charter lesson #6).
                settings: { ...initial, ...(payload as object) },
              },
            })
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
        expect(screen.getByLabelText("Daily Question Goal")).toHaveValue(24);
      });
    } finally {
      Object.defineProperty(globalThis, "chrome", {
        configurable: true,
        value: previousChrome,
      });
    }
  });

  it("renders a saved zero daily question goal as 0", async () => {
    const payload = makePayload();
    payload.settings.dailyQuestionGoal = 0;

    const { user } = renderDashboardWithPayload(payload);

    await user.click(await screen.findByRole("button", { name: "Settings" }));

    expect(screen.getByLabelText("Daily Question Goal")).toHaveValue(0);
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
      screen.getByRole("heading", { name: "Data Management" })
    ).toBeInTheDocument();

    expect(screen.getByLabelText("Hard goal")).toHaveValue("50");
    expect(
      screen.getByRole("button", { name: "Save Settings" })
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Discard Changes" })
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Reset Defaults" })
    ).toBeDisabled();

    await user.click(screen.getByLabelText("Enable reminders"));

    expect(screen.getByLabelText("Notification Time")).not.toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Save Settings" })
    ).not.toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Discard Changes" })
    ).not.toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Reset Defaults" })
    ).not.toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Discard Changes" }));

    expect(screen.getByLabelText("Notification Time")).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Save Settings" })
    ).toBeDisabled();
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
