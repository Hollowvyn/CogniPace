import { describe, expect, it, vi } from "vitest";

import { DashboardApp } from "../../../src/ui/screens/dashboard/DashboardApp";
import { makePayload } from "../support/appShellFixtures";
import { render, screen, waitFor } from "../support/render";
import { sendMessageMock } from "../support/setup";

function renderDashboardWithPayload(payload = makePayload()) {
  sendMessageMock.mockImplementation(async (type: string) => {
    if (type === "GET_APP_SHELL_DATA") {
      return { ok: true, data: payload };
    }
    return { ok: true, data: {} };
  });

  return render(<DashboardApp />);
}

describe("dashboard navigation", () => {
  it("pushes history entries for user-initiated view changes", async () => {
    const payload = makePayload();
    const pushStateSpy = vi.spyOn(window.history, "pushState");

    const { user } = renderDashboardWithPayload(payload);

    await user.click(await screen.findByRole("button", { name: "Courses" }));

    await waitFor(() => {
      expect(pushStateSpy).toHaveBeenCalled();
      expect(String(pushStateSpy.mock.calls.at(-1)?.[2])).toContain(
        "view=courses"
      );
    });
  });

  it("syncs the active screen from popstate events", async () => {
    const payload = makePayload();
    
    // Set initial state
    window.history.pushState({}, "", "/dashboard.html?view=dashboard");

    renderDashboardWithPayload(payload);

    // Confirm initial render
    expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeInTheDocument();

    // Trigger popstate navigation to library
    window.history.pushState({}, "", "/dashboard.html?view=library");
    window.dispatchEvent(new PopStateEvent("popstate"));

    // Verify screen update
    expect(await screen.findByText("All Tracked Problems")).toBeInTheDocument();
  });
});
