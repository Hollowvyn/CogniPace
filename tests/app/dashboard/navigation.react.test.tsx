import { describe, expect, it, vi } from "vitest";

import { DashboardShell } from "../../../src/app/dashboard/DashboardShell";
import { makePayload } from "../../support/appShellFixtures";
import { act, render, screen, waitFor } from "../../support/render";
import { sendMessageMock } from "../../support/setup";

function renderDashboardWithPayload(payload = makePayload()) {
  sendMessageMock.mockImplementation(async (type: string) => {
    if (type === "GET_APP_SHELL_DATA") {
      return { ok: true, data: payload };
    }
    return { ok: true, data: {} };
  });

  return render(<DashboardShell />);
}

describe("dashboard navigation", () => {
  it("pushes history entries for user-initiated view changes", async () => {
    const payload = makePayload();
    const pushStateSpy = vi.spyOn(window.history, "pushState");

    const { user } = renderDashboardWithPayload(payload);

    await user.click(await screen.findByRole("button", { name: "Tracks" }));

    await waitFor(() => {
      expect(pushStateSpy).toHaveBeenCalled();
      expect(String(pushStateSpy.mock.calls.at(-1)?.[2])).toContain(
        "view=tracks"
      );
    });
  });

  it("syncs the active screen from popstate events", async () => {
    const payload = makePayload();

    window.history.pushState({}, "", "/dashboard.html?view=dashboard");

    renderDashboardWithPayload(payload);

    expect(
      await screen.findByRole("heading", { name: "Dashboard" })
    ).toBeInTheDocument();

    act(() => {
      window.history.pushState({}, "", "/dashboard.html?view=library");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    expect(
      await screen.findByText("All Tracked Problems")
    ).toBeInTheDocument();
  });
});
