import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AppProviders } from "../../../src/ui/providers";
import { DashboardApp } from "../../../src/ui/screens/dashboard/DashboardApp";
import { makePayload } from "../support/appShellFixtures";
import { sendMessageMock } from "../support/setup";

function renderDashboardWithPayload(payload = makePayload()) {
  sendMessageMock.mockImplementation(async (type: string) => {
    if (type === "GET_APP_SHELL_DATA") {
      return { ok: true, data: payload };
    }
    return { ok: true, data: {} };
  });

  render(
    <AppProviders>
      <DashboardApp />
    </AppProviders>
  );
}

describe("dashboard navigation", () => {
  it("pushes history entries for user-initiated view changes", async () => {
    const payload = makePayload();
    const pushStateSpy = vi.spyOn(window.history, "pushState");

    renderDashboardWithPayload(payload);

    fireEvent.click(await screen.findByRole("button", { name: "Courses" }));

    await waitFor(() => {
      expect(pushStateSpy).toHaveBeenCalled();
      expect(String(pushStateSpy.mock.calls.at(-1)?.[2])).toContain(
        "view=courses"
      );
    });
  });

  it("syncs the active screen from popstate events", async () => {
    const payload = makePayload();
    window.history.pushState({}, "", "/dashboard.html?view=dashboard");

    renderDashboardWithPayload(payload);

    await screen.findByRole("heading", { name: "Dashboard" });
    window.history.pushState({}, "", "/dashboard.html?view=library");
    window.dispatchEvent(new PopStateEvent("popstate"));

    expect(await screen.findByText("All Tracked Problems")).toBeTruthy();
  });
});
