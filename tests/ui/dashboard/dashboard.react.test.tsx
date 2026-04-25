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
    
    const dailyNewInput = await screen.findByLabelText("Daily New");
    await user.clear(dailyNewInput);
    await user.type(dailyNewInput, "9");
    
    await user.click(screen.getByRole("button", { name: "Save Settings" }));

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
