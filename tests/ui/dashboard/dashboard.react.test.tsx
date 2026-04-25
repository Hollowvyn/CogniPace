import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AppProviders } from "../../../src/ui/providers";
import { DashboardApp } from "../../../src/ui/screens/dashboard/DashboardApp";
import { makePayload } from "../support/appShellFixtures";
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

  render(
    <AppProviders>
      <DashboardApp />
    </AppProviders>
  );
}

describe("DashboardApp", () => {
  it("switches views and filters library rows", async () => {
    const payload = makePayload();
    renderDashboardWithPayload(payload);

    expect(
      await screen.findByRole("heading", { name: "Dashboard" })
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Refresh dashboard" })
    ).toBeTruthy();
    expect(
      screen.getAllByRole("button", { name: "Open settings" }).length
    ).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Library" }));

    expect(await screen.findByText("All Tracked Problems")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Search title or slug"), {
      target: { value: "merge" },
    });

    await waitFor(() => {
      expect(screen.queryByText("Two Sum")).toBeNull();
      expect(screen.getByText("Merge Intervals")).toBeTruthy();
    });
  });

  it("saves settings through runtime messaging", async () => {
    const payload = makePayload();
    renderDashboardWithPayload(payload, (type) =>
      type === "UPDATE_SETTINGS"
        ? Promise.resolve({ ok: true, data: {} })
        : undefined
    );

    fireEvent.click(await screen.findByRole("button", { name: "Settings" }));
    expect(
      screen.getByRole("button", { name: "Information about Target Retention" })
    ).toBeTruthy();
    fireEvent.change(await screen.findByLabelText("Daily New"), {
      target: { value: "9" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Settings" }));

    await waitFor(() => {
      expect(sendMessageMock).toHaveBeenCalledWith(
        "UPDATE_SETTINGS",
        expect.objectContaining({
          dailyNewLimit: 9,
          activeCourseId: "Blind75",
        })
      );
    });
  });
});
