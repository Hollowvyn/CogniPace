import { describe, expect, it } from "vitest";

import { DashboardShell } from "../../../app/dashboard/DashboardShell";
import { makePayload } from "../../support/appShellFixtures";
import { render, screen, waitFor } from "../../support/render";
import { sendMessageMock } from "../../support/setup";

function renderDashboardWithPayload(payload = makePayload()) {
  sendMessageMock.mockImplementation((type: string, request: unknown) => {
    if (type === "getAppShellData") {
      return { ok: true, data: payload };
    }
    if (type === "getTracks") {
      return {
        ok: true,
        data: {
          tracks: payload.tracks,
          activeTrack: payload.activeTrack,
          settings: payload.settings,
        },
      };
    }
    if (type === "getTopics") {
      return {
        ok: true,
        data: payload.topicChoices,
      };
    }
    if (type === "getCompanies") {
      return {
        ok: true,
        data: payload.companyChoices,
      };
    }
    if (type === "getProblemForEdit") {
      const slug = (request as { slug?: string }).slug;
      return {
        ok: true,
        data: payload.problems.find((problem) => problem.slug === slug) ?? null,
      };
    }
    return { ok: true, data: {} };
  });

  return render(<DashboardShell />);
}

describe("dashboard navigation", () => {
  it("routes user-initiated view changes through TanStack Router", async () => {
    const payload = makePayload();

    const { user } = renderDashboardWithPayload(payload);

    await user.click(await screen.findByRole("button", { name: "Tracks" }));

    await waitFor(() => {
      expect(window.location.hash).toBe("#/tracks");
    });
    expect(
      await screen.findByRole("heading", { name: "Tracks", hidden: true })
    ).toBeInTheDocument();
  });

  it("loads screens directly from hash routes", async () => {
    const payload = makePayload();

    window.history.pushState({}, "", "/dashboard.html#/library");

    renderDashboardWithPayload(payload);

    expect(await screen.findByText("All Tracked Problems")).toBeInTheDocument();
  });

  it("uses the single problem modal route with background search", async () => {
    const payload = makePayload();

    window.history.pushState(
      {},
      "",
      "/dashboard.html#/problems/two-sum/edit?background=tracks"
    );

    renderDashboardWithPayload(payload);

    expect(
      await screen.findByRole("heading", { name: "Tracks", hidden: true })
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("heading", { name: "Edit: Two Sum" })
    ).toBeInTheDocument();
    expect(window.location.hash).toBe(
      "#/problems/two-sum/edit?background=tracks"
    );
  });

  it("opens create problem from Tracks on the canonical modal route", async () => {
    const payload = makePayload();

    window.history.pushState({}, "", "/dashboard.html#/tracks");

    const { user } = renderDashboardWithPayload(payload);

    await user.click(
      await screen.findByRole("button", { name: "Add problem" })
    );

    expect(
      await screen.findByRole("heading", { name: "Add problem" })
    ).toBeInTheDocument();
    expect(window.location.hash).toBe("#/problems/new?background=tracks");
  });
});
