import { describe, expect, it } from "vitest";

import { screen, waitFor } from "../../support/render";
import { sendMessageMock, tabsCreateMock } from "../../support/setup";

import { openedProblemResponse, renderPopupWithPayload } from "./support";

describe("Popup Recommendations", () => {
  it("renders the compact header and opens the recommended problem", async () => {
    const { user } = renderPopupWithPayload(undefined, (type, request) =>
      type === "openProblemPage" ? openedProblemResponse(request) : undefined
    );

    expect(await screen.findByText("Two Sum")).toBeInTheDocument();
    expect(sendMessageMock).toHaveBeenCalledWith("getPopupShellData", {});
    expect(screen.getByRole("button", { name: "Refresh popup" })).toHaveStyle({
      height: "34px",
      width: "34px",
    });
    expect(screen.getByRole("button", { name: "Open settings" })).toHaveStyle({
      height: "34px",
      width: "34px",
    });
    expect(
      screen.getByRole("button", { name: "Start freestyle mode" })
    ).toHaveStyle({ minHeight: "26px" });
    expect(screen.queryByText(/Next review day:/i)).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Shuffle recommendation" })
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Open Problem" }));

    await waitFor(() => {
      expect(sendMessageMock).toHaveBeenCalledWith("openProblemPage", {
        slug: "two-sum",
        trackId: undefined,
        groupId: undefined,
      });
    });
  });

  it("shuffles only the recommendation", async () => {
    const { user } = renderPopupWithPayload();

    expect(await screen.findByText("Two Sum")).toBeInTheDocument();
    expect(screen.getByText("Contains Duplicate")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Shuffle recommendation" })
    );

    expect(await screen.findByText("Group Anagrams")).toBeInTheDocument();
    expect(screen.getByText("Contains Duplicate")).toBeInTheDocument();
  });

  it("opens the tracks dashboard from the active-track panel", async () => {
    const { user } = renderPopupWithPayload();

    expect(await screen.findByText("Blind 75")).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Open tracks dashboard" })
    );

    expect(tabsCreateMock).toHaveBeenCalledWith({
      url: "chrome-extension://test/dashboard.html#/tracks",
    });
  });

  it("opens the next course problem from the inline continue action", async () => {
    const { user } = renderPopupWithPayload(undefined, (type, request) =>
      type === "openProblemPage" ? openedProblemResponse(request) : undefined
    );

    expect(await screen.findByText("Contains Duplicate")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Continue path" }));

    await waitFor(() => {
      expect(sendMessageMock).toHaveBeenCalledWith("openProblemPage", {
        slug: "contains-duplicate",
        trackId: "Blind75",
        groupId: "arrays-1",
      });
    });
  });
});
